import path from "node:path";

const root = process.env.STORAGE_ROOT ?? "./storage";

export const storagePaths = {
  root,
  uploads: process.env.UPLOADS_DIR ?? path.join(root, "uploads"),
  outputs: process.env.OUTPUTS_DIR ?? path.join(root, "outputs"),
  temp: process.env.TEMP_DIR ?? path.join(root, "temp"),
  projects: process.env.PROJECTS_DIR ?? path.join(root, "projects"),
} as const;
