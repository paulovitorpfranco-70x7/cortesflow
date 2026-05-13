import { createRequire } from "node:module";
import path from "node:path";
import { mkdirSync } from "node:fs";

const require = createRequire(import.meta.url);

type DatabaseConstructor = new (path: string) => LocalDatabase;

export type LocalDatabase = {
  close: () => void;
  exec: (sql: string) => void;
  prepare: (sql: string) => {
    all: (...values: unknown[]) => Record<string, unknown>[];
    run: (...values: unknown[]) => void;
  };
};

export function getDatabasePath() {
  return process.env.DATABASE_URL ?? "./storage/projects/cortesflow.sqlite";
}

export function getDatabaseStatus() {
  return {
    configured: true,
    path: getDatabasePath(),
  };
}

export async function openDatabase() {
  const databasePath = getDatabasePath();
  mkdirSync(path.dirname(databasePath), { recursive: true });

  const { DatabaseSync } = require("node:sqlite") as {
    DatabaseSync: DatabaseConstructor;
  };

  return new DatabaseSync(databasePath);
}
