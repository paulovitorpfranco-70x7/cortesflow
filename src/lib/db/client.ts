export function getDatabasePath() {
  return process.env.DATABASE_URL ?? "./storage/projects/cortesflow.sqlite";
}

export function getDatabaseStatus() {
  return {
    configured: true,
    path: getDatabasePath(),
  };
}
