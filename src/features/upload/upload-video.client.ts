import type { ProjectSummary } from "@/types/project";

type UploadVideoResponse =
  | {
      project: ProjectSummary;
      error?: never;
    }
  | {
      project?: never;
      error: string;
    };

export async function uploadVideo(file: File): Promise<UploadVideoResponse> {
  const formData = new FormData();
  formData.append("video", file);

  const response = await fetch("/api/projects", {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json()) as UploadVideoResponse;

  if (!response.ok) {
    return {
      error: payload.error ?? "Nao foi possivel enviar o video.",
    };
  }

  return payload;
}
