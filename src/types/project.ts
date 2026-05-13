export type ProjectStatus = "uploaded" | "processing" | "ready" | "failed";

export type ProjectSummary = {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  originalFilename: string;
  fileSize: number;
  createdAt: string;
};
