export type VideoProcessingStatus =
  | "uploaded"
  | "extracting_metadata"
  | "extracting_audio"
  | "transcribing"
  | "analyzing"
  | "rendering"
  | "completed"
  | "failed";

export type LocalVideo = {
  id: string;
  projectId: string;
  originalFilename: string;
  path: string;
  status: VideoProcessingStatus;
  createdAt: string;
};
