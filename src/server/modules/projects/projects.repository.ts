import { openDatabase, type LocalDatabase } from "@/lib/db/client";
import type { ProjectSummary, ProjectStatus } from "@/types/project";

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
}

function rowToProject(row: Record<string, unknown>): ProjectSummary {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description),
    status: row.status as ProjectStatus,
    originalFilename: String(row.original_filename),
    fileSize: Number(row.file_size),
    createdAt: String(row.created_at),
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
      file_size,
      created_at
    FROM projects
    ORDER BY created_at DESC
    LIMIT 12;
  `);

  const projects = statement.all().map(rowToProject);
  db.close();

  return projects;
}
