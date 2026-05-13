import { openDatabase, type LocalDatabase } from "@/lib/db/client";
import type { ProjectSummary, ProjectStatus, VideoMetadata } from "@/types/project";

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
  addColumnIfMissing(db, "error_message", "TEXT");
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
      error_message
    FROM projects
    WHERE id = ?
    LIMIT 1;
  `);

  const [project] = statement.all(id).map(rowToProject);
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

  statement.run("error", "Falha ao processar metadados.", message, id);
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
