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
  transcription?: ProjectTranscription | null;
  clipSuggestions?: ClipSuggestion[];
  errorMessage?: string | null;
};

export type VideoMetadata = {
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  codec: string | null;
};

export type TranscriptionSegment = {
  start: number;
  end: number;
  text: string;
};

export type ProjectTranscription = {
  text: string;
  jsonPath: string | null;
  srtPath: string | null;
  segments: TranscriptionSegment[];
};

export type ClipSuggestion = {
  id: string;
  projectId: string;
  title: string;
  start: number;
  end: number;
  duration: number;
  text: string;
  score: number;
  createdAt: string;
};
