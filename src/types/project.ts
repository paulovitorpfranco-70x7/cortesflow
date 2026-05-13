export type ProjectStatus =
  | "uploaded"
  | "processing"
  | "transcribed"
  | "clips_generated"
  | "rendered"
  | "error";

export type ProjectSummary = {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  originalFilename: string;
  filePath?: string;
  audioPath?: string | null;
  fileSize: number;
  createdAt: string;
  metadata?: VideoMetadata | null;
  errorMessage?: string | null;
};

export type VideoMetadata = {
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  codec: string | null;
};
