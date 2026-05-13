import { openDatabase, type LocalDatabase } from "@/lib/db/client";
import type {
  ClipSuggestion,
  ProjectSummary,
  ProjectStatus,
  ProjectTranscription,
  TranscriptionSegment,
  VideoMetadata,
} from "@/types/project";

type ProjectRecord = {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  originalFilename: string;
  filePath: string;
  fileSize: number;
  createdAt: string;
};

function ensureSchema(db: LocalDatabase) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  addColumnIfMissing(db, "duration_seconds", "REAL");
  addColumnIfMissing(db, "width", "INTEGER");
  addColumnIfMissing(db, "height", "INTEGER");
  addColumnIfMissing(db, "fps", "REAL");
  addColumnIfMissing(db, "codec", "TEXT");
  addColumnIfMissing(db, "audio_path", "TEXT");
  addColumnIfMissing(db, "transcript_json_path", "TEXT");
  addColumnIfMissing(db, "transcript_srt_path", "TEXT");
  addColumnIfMissing(db, "transcript_text", "TEXT");
  addColumnIfMissing(db, "transcript_segments_json", "TEXT");
  addColumnIfMissing(db, "error_message", "TEXT");

  db.exec(`
    CREATE TABLE IF NOT EXISTS clip_suggestions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      start_time REAL NOT NULL,
      end_time REAL NOT NULL,
      duration REAL NOT NULL,
      text TEXT NOT NULL,
      score REAL NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id)
    );
  `);
}

function rowToProject(row: Record<string, unknown>): ProjectSummary {
  const metadata = {
    durationSeconds: nullableNumber(row.duration_seconds),
    width: nullableNumber(row.width),
    height: nullableNumber(row.height),
    fps: nullableNumber(row.fps),
    codec: nullableString(row.codec),
  };

  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description),
    status: row.status as ProjectStatus,
    originalFilename: String(row.original_filename),
    filePath: nullableString(row.file_path) ?? undefined,
    audioPath: nullableString(row.audio_path),
    fileSize: Number(row.file_size),
    createdAt: String(row.created_at),
    metadata: hasMetadata(metadata) ? metadata : null,
    transcription: rowToTranscription(row),
    errorMessage: nullableString(row.error_message),
  };
}

export async function insertProject(record: ProjectRecord) {
  const db = await openDatabase();
  ensureSchema(db);

  const statement = db.prepare(`
    INSERT INTO projects (
      id,
      name,
      description,
      status,
      original_filename,
      file_path,
      file_size,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  statement.run(
    record.id,
    record.name,
    record.description,
    record.status,
    record.originalFilename,
    record.filePath,
    record.fileSize,
    record.createdAt,
  );
  db.close();
}

export async function selectRecentProjects() {
  const db = await openDatabase();
  ensureSchema(db);

  const statement = db.prepare(`
    SELECT
      id,
      name,
      description,
      status,
      original_filename,
      file_path,
      file_size,
      created_at,
      duration_seconds,
      width,
      height,
      fps,
      codec,
      audio_path,
      transcript_json_path,
      transcript_srt_path,
      transcript_text,
      transcript_segments_json,
      error_message
    FROM projects
    ORDER BY created_at DESC
    LIMIT 12;
  `);

  const projects = statement.all().map(rowToProject);
  db.close();

  return projects;
}

export async function selectProjectById(id: string) {
  const db = await openDatabase();
  ensureSchema(db);

  const statement = db.prepare(`
    SELECT
      id,
      name,
      description,
      status,
      original_filename,
      file_path,
      file_size,
      created_at,
      duration_seconds,
      width,
      height,
      fps,
      codec,
      audio_path,
      transcript_json_path,
      transcript_srt_path,
      transcript_text,
      transcript_segments_json,
      error_message
    FROM projects
    WHERE id = ?
    LIMIT 1;
  `);

  const [project] = statement.all(id).map(rowToProject);

  if (project) {
    project.clipSuggestions = selectClipSuggestionsForProject(db, id);
  }

  db.close();

  return project ?? null;
}

export async function updateProjectMetadata(
  id: string,
  metadata: VideoMetadata,
  audioPath: string,
) {
  const db = await openDatabase();
  ensureSchema(db);

  const statement = db.prepare(`
    UPDATE projects
    SET
      status = ?,
      description = ?,
      duration_seconds = ?,
      width = ?,
      height = ?,
      fps = ?,
      codec = ?,
      audio_path = ?,
      error_message = NULL
    WHERE id = ?
  `);

  statement.run(
    "processing",
    "Metadados e audio extraidos. Pronto para futura transcricao.",
    metadata.durationSeconds,
    metadata.width,
    metadata.height,
    metadata.fps,
    metadata.codec,
    audioPath,
    id,
  );
  db.close();
}

export async function updateProjectProcessingError(id: string, message: string) {
  const db = await openDatabase();
  ensureSchema(db);

  const statement = db.prepare(`
    UPDATE projects
    SET
      status = ?,
      description = ?,
      error_message = ?
    WHERE id = ?
  `);

  statement.run("error", "Falha no processamento do projeto.", message, id);
  db.close();
}

export async function updateProjectTranscription(
  id: string,
  transcription: ProjectTranscription,
) {
  const db = await openDatabase();
  ensureSchema(db);

  const statement = db.prepare(`
    UPDATE projects
    SET
      status = ?,
      description = ?,
      transcript_json_path = ?,
      transcript_srt_path = ?,
      transcript_text = ?,
      transcript_segments_json = ?,
      error_message = NULL
    WHERE id = ?
  `);

  statement.run(
    "transcribed",
    "Transcricao concluida. Pronto para futura geracao de cortes.",
    transcription.jsonPath,
    transcription.srtPath,
    transcription.text,
    JSON.stringify(transcription.segments),
    id,
  );
  db.close();
}

export async function replaceClipSuggestions(
  projectId: string,
  suggestions: ClipSuggestion[],
) {
  const db = await openDatabase();
  ensureSchema(db);

  db.prepare("DELETE FROM clip_suggestions WHERE project_id = ?").run(projectId);

  const insertStatement = db.prepare(`
    INSERT INTO clip_suggestions (
      id,
      project_id,
      title,
      start_time,
      end_time,
      duration,
      text,
      score,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const suggestion of suggestions) {
    insertStatement.run(
      suggestion.id,
      suggestion.projectId,
      suggestion.title,
      suggestion.start,
      suggestion.end,
      suggestion.duration,
      suggestion.text,
      suggestion.score,
      suggestion.createdAt,
    );
  }

  db.prepare(
    `
      UPDATE projects
      SET
        status = ?,
        description = ?,
        error_message = NULL
      WHERE id = ?
    `,
  ).run(
    "clips_generated",
    "Cortes sugeridos gerados. Pronto para revisao manual.",
    projectId,
  );

  db.close();
}

function addColumnIfMissing(db: LocalDatabase, column: string, definition: string) {
  try {
    db.exec(`ALTER TABLE projects ADD COLUMN ${column} ${definition};`);
  } catch {
    // SQLite does not support IF NOT EXISTS for ADD COLUMN in all versions.
  }
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function nullableString(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return String(value);
}

function hasMetadata(metadata: VideoMetadata) {
  return Object.values(metadata).some((value) => value !== null);
}

function rowToTranscription(
  row: Record<string, unknown>,
): ProjectTranscription | null {
  const text = nullableString(row.transcript_text);
  const jsonPath = nullableString(row.transcript_json_path);
  const srtPath = nullableString(row.transcript_srt_path);
  const segments = parseSegments(row.transcript_segments_json);

  if (!text && !jsonPath && !srtPath && segments.length === 0) {
    return null;
  }

  return {
    text: text ?? "",
    jsonPath,
    srtPath,
    segments,
  };
}

function parseSegments(value: unknown): TranscriptionSegment[] {
  const raw = nullableString(value);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as TranscriptionSegment[];
    return parsed.map((segment) => ({
      start: Number(segment.start),
      end: Number(segment.end),
      text: String(segment.text ?? ""),
    }));
  } catch {
    return [];
  }
}

function selectClipSuggestionsForProject(
  db: LocalDatabase,
  projectId: string,
): ClipSuggestion[] {
  const statement = db.prepare(`
    SELECT
      id,
      project_id,
      title,
      start_time,
      end_time,
      duration,
      text,
      score,
      created_at
    FROM clip_suggestions
    WHERE project_id = ?
    ORDER BY score DESC, start_time ASC;
  `);

  return statement.all(projectId).map((row) => ({
    id: String(row.id),
    projectId: String(row.project_id),
    title: String(row.title),
    start: Number(row.start_time),
    end: Number(row.end_time),
    duration: Number(row.duration),
    text: String(row.text),
    score: Number(row.score),
    createdAt: String(row.created_at),
  }));
}
