import crypto from "node:crypto";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { storagePaths } from "@/lib/storage/paths";
import {
  ClipGenerationError,
  generateClipSuggestions,
} from "@/server/modules/clip-generation/clip-generation.service";
import {
  insertProject,
  markProjectRendered,
  replaceClipSuggestions,
  selectApprovedClipSuggestions,
  selectProjectById,
  selectRecentProjects,
  updateClipSuggestionReview,
  updateClipSuggestionRenderStatus,
  updateProjectMetadata,
  updateProjectProcessingError,
  updateProjectTranscription,
} from "@/server/modules/projects/projects.repository";
import {
  transcribeAudio,
  TranscriptionError,
  WhisperConfigurationError,
  WhisperNotInstalledError,
} from "@/server/modules/transcription/transcription.service";
import {
  AudioExtractionError,
  ClipRenderingError,
  extractAudio,
  FFmpegNotInstalledError,
  getVideoMetadata,
  renderVerticalClip,
  VideoMetadataError,
} from "@/server/modules/video-processing/video-processing.service";
import type { ProjectSummary, TranscriptionSegment } from "@/types/project";
import type { ClipReviewStatus } from "@/types/project";

const acceptedExtensions = new Set([".mp4", ".mov", ".mkv", ".webm"]);
const acceptedMimeTypes = new Set([
  "video/mp4",
  "video/quicktime",
  "video/x-matroska",
  "video/webm",
]);

const defaultMaxUploadSizeInMb = 1024;

export class UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadValidationError";
  }
}

export async function listProjects(): Promise<ProjectSummary[]> {
  return selectRecentProjects();
}

export async function recentProjects(): Promise<ProjectSummary[]> {
  return listProjects();
}

export async function getProjectById(id: string) {
  return selectProjectById(id);
}

export async function processProjectVideo(projectId: string) {
  const project = await getProjectById(projectId);

  if (!project) {
    throw new ProjectNotFoundError();
  }

  if (!project.filePath) {
    throw new ProjectProcessingError("Arquivo original do projeto nao encontrado.");
  }

  try {
    console.info(`[ProjectsService] Iniciando processamento: ${project.id}`);
    console.info(`[ProjectsService] Extraindo metadados: ${project.filePath}`);
    const metadata = await getVideoMetadata(project.filePath);
    const audioPath = path.join(
      storagePaths.projects,
      project.id,
      "assets",
      "audio.wav",
    );

    await mkdir(path.dirname(audioPath), { recursive: true });
    await extractAudio(project.filePath, audioPath);
    await updateProjectMetadata(project.id, metadata, audioPath);

    console.info(
      `[ProjectsService] Processamento concluido: ${project.id} audio=${audioPath}`,
    );

    return getProjectById(project.id);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel processar o video.";

    await updateProjectProcessingError(project.id, message);
    console.error(`[ProjectsService] Falha no processamento: ${project.id}`, error);

    if (
      error instanceof FFmpegNotInstalledError ||
      error instanceof VideoMetadataError ||
      error instanceof AudioExtractionError
    ) {
      throw error;
    }

    throw new ProjectProcessingError(message);
  }
}

export async function transcribeProjectAudio(projectId: string) {
  const project = await getProjectById(projectId);

  if (!project) {
    throw new ProjectNotFoundError();
  }

  if (!project.audioPath) {
    throw new ProjectProcessingError(
      "Audio extraido nao encontrado. Processe o video antes de transcrever.",
    );
  }

  try {
    const transcriptDir = path.join(
      storagePaths.projects,
      project.id,
      "assets",
      "transcription",
    );

    console.info(
      `[ProjectsService] Iniciando transcricao: ${project.id} audio=${project.audioPath}`,
    );

    const transcription = await transcribeAudio(project.audioPath, transcriptDir);
    await updateProjectTranscription(project.id, transcription);

    console.info(`[ProjectsService] Transcricao concluida: ${project.id}`);
    return getProjectById(project.id);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel transcrever o audio.";

    await updateProjectProcessingError(project.id, message);
    console.error(`[ProjectsService] Falha na transcricao: ${project.id}`, error);

    if (
      error instanceof WhisperNotInstalledError ||
      error instanceof WhisperConfigurationError ||
      error instanceof TranscriptionError
    ) {
      throw error;
    }

    throw new ProjectProcessingError(message);
  }
}

export async function generateProjectClipSuggestions(projectId: string) {
  const project = await getProjectById(projectId);

  if (!project) {
    throw new ProjectNotFoundError();
  }

  if (!project.transcription?.segments.length) {
    throw new ProjectProcessingError(
      "Transcricao segmentada nao encontrada. Transcreva o audio antes de gerar cortes.",
    );
  }

  try {
    console.info(`[ProjectsService] Gerando cortes sugeridos: ${project.id}`);
    const suggestions = generateClipSuggestions({
      projectId: project.id,
      segments: project.transcription.segments,
    });

    await replaceClipSuggestions(project.id, suggestions);
    console.info(
      `[ProjectsService] Cortes sugeridos gerados: ${project.id} total=${suggestions.length}`,
    );

    return getProjectById(project.id);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel gerar cortes sugeridos.";

    await updateProjectProcessingError(project.id, message);
    console.error(
      `[ProjectsService] Falha ao gerar cortes sugeridos: ${project.id}`,
      error,
    );

    if (error instanceof ClipGenerationError) {
      throw error;
    }

    throw new ProjectProcessingError(message);
  }
}

export async function updateProjectClipSuggestion(
  projectId: string,
  clipId: string,
  input: {
    end?: number;
    reviewStatus?: ClipReviewStatus;
    start?: number;
  },
) {
  const project = await getProjectById(projectId);

  if (!project) {
    throw new ProjectNotFoundError();
  }

  validateClipReviewInput(input);

  const updated = await updateClipSuggestionReview(projectId, clipId, input);
  if (!updated) {
    throw new ClipSuggestionNotFoundError();
  }

  return getProjectById(projectId);
}

export async function renderApprovedProjectClips(
  projectId: string,
  options: { includeCaptions?: boolean } = {},
) {
  const project = await getProjectById(projectId);

  if (!project) {
    throw new ProjectNotFoundError();
  }

  if (!project.filePath) {
    throw new ProjectProcessingError("Arquivo original do projeto nao encontrado.");
  }

  const approvedClips = await selectApprovedClipSuggestions(projectId);

  if (approvedClips.length === 0) {
    throw new ProjectProcessingError(
      "Nenhum corte aprovado encontrado para renderizar.",
    );
  }

  try {
    console.info(
      `[ProjectsService] Renderizando cortes aprovados: ${project.id} total=${approvedClips.length}`,
    );

    for (const clip of approvedClips) {
      const outputFilename = options.includeCaptions
        ? `${clip.id}-captioned.mp4`
        : `${clip.id}.mp4`;
      const outputPath = path.join(
        storagePaths.outputs,
        project.id,
        outputFilename,
      );
      const captionsPath = options.includeCaptions
        ? path.join(storagePaths.outputs, project.id, `${clip.id}.srt`)
        : undefined;

      await mkdir(path.dirname(outputPath), { recursive: true });
      await updateClipSuggestionRenderStatus(project.id, clip.id, {
        renderStatus: "rendering",
      });

      try {
        if (captionsPath) {
          const srtContent = buildClipSrt({
            clip,
            segments: project.transcription?.segments ?? [],
          });
          await writeFile(captionsPath, srtContent, "utf8");
        }

        await renderVerticalClip({
          captionsPath,
          duration: clip.duration,
          inputPath: project.filePath,
          outputPath,
          start: clip.start,
        });
        await updateClipSuggestionRenderStatus(project.id, clip.id, {
          outputPath,
          renderStatus: "rendered",
        });
      } catch (error) {
        await updateClipSuggestionRenderStatus(project.id, clip.id, {
          renderStatus: "error",
        });
        throw error;
      }
    }

    await markProjectRendered(project.id);
    console.info(`[ProjectsService] Renderizacao concluida: ${project.id}`);

    return getProjectById(project.id);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel renderizar os cortes aprovados.";

    await updateProjectProcessingError(project.id, message);
    console.error(`[ProjectsService] Falha na renderizacao: ${project.id}`, error);

    if (
      error instanceof FFmpegNotInstalledError ||
      error instanceof ClipRenderingError
    ) {
      throw error;
    }

    throw new ProjectProcessingError(message);
  }
}

export class ClipSuggestionNotFoundError extends Error {
  constructor() {
    super("Corte sugerido nao encontrado.");
    this.name = "ClipSuggestionNotFoundError";
  }
}

export class ProjectNotFoundError extends Error {
  constructor() {
    super("Projeto nao encontrado.");
    this.name = "ProjectNotFoundError";
  }
}

export class ProjectProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectProcessingError";
  }
}

function validateClipReviewInput(input: {
  end?: number;
  reviewStatus?: ClipReviewStatus;
  start?: number;
}) {
  if (
    input.reviewStatus &&
    !["suggested", "selected", "approved", "discarded"].includes(
      input.reviewStatus,
    )
  ) {
    throw new ProjectProcessingError("Status de revisao invalido.");
  }

  if (
    input.start !== undefined &&
    (!Number.isFinite(input.start) || input.start < 0)
  ) {
    throw new ProjectProcessingError("Inicio do corte invalido.");
  }

  if (input.end !== undefined && (!Number.isFinite(input.end) || input.end <= 0)) {
    throw new ProjectProcessingError("Fim do corte invalido.");
  }

  if (
    input.start !== undefined &&
    input.end !== undefined &&
    input.end <= input.start
  ) {
    throw new ProjectProcessingError("O fim precisa ser maior que o inicio.");
  }
}

export async function createProjectFromUpload(file: File) {
  validateUpload(file);

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const extension = path.extname(file.name).toLowerCase();
  const safeOriginalName = sanitizeFilename(file.name);
  const storedFilename = `${id}${extension}`;
  const uploadPath = path.join(storagePaths.uploads, storedFilename);
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  await mkdir(storagePaths.uploads, { recursive: true });
  await writeFile(uploadPath, fileBuffer);

  const project: ProjectSummary = {
    id,
    name: projectNameFromFilename(file.name),
    description: "Upload local criado. Aguardando processamento.",
    status: "uploaded",
    originalFilename: safeOriginalName,
    fileSize: file.size,
    createdAt,
  };

  await insertProject({
    ...project,
    filePath: uploadPath,
  });

  return project;
}

function validateUpload(file: File) {
  if (!file || file.size === 0) {
    throw new UploadValidationError("Selecione um video valido.");
  }

  const extension = path.extname(file.name).toLowerCase();
  if (!acceptedExtensions.has(extension)) {
    throw new UploadValidationError(
      "Formato invalido. Envie um arquivo MP4, MOV, MKV ou WEBM.",
    );
  }

  if (file.type && !acceptedMimeTypes.has(file.type)) {
    throw new UploadValidationError(
      "Tipo de arquivo invalido. Envie um video MP4, MOV, MKV ou WEBM.",
    );
  }

  const maxUploadSize = getMaxUploadSize();
  if (file.size > maxUploadSize) {
    throw new UploadValidationError(
      `Arquivo muito grande. Limite atual: ${formatFileSize(maxUploadSize)}.`,
    );
  }
}

function getMaxUploadSize() {
  const configuredValue = Number(process.env.MAX_UPLOAD_SIZE_MB);
  const sizeInMb =
    Number.isFinite(configuredValue) && configuredValue > 0
      ? configuredValue
      : defaultMaxUploadSizeInMb;

  return sizeInMb * 1024 * 1024;
}

function projectNameFromFilename(filename: string) {
  const parsedName = path.parse(filename).name.trim();
  return parsedName || "Projeto sem nome";
}

function sanitizeFilename(filename: string) {
  return path.basename(filename).replace(/[^\w.\- ()]/g, "_");
}

function formatFileSize(sizeInBytes: number) {
  const units = ["B", "KB", "MB", "GB"];
  let size = sizeInBytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function buildClipSrt({
  clip,
  segments,
}: {
  clip: {
    duration: number;
    end: number;
    start: number;
    text: string;
  };
  segments: TranscriptionSegment[];
}) {
  const overlappingSegments = segments
    .filter((segment) => segment.end > clip.start && segment.start < clip.end)
    .map((segment) => ({
      end: Math.min(segment.end, clip.end) - clip.start,
      start: Math.max(segment.start, clip.start) - clip.start,
      text: cleanSubtitleText(segment.text),
    }))
    .filter((segment) => segment.text && segment.end > segment.start);

  const subtitleSegments =
    overlappingSegments.length > 0
      ? overlappingSegments
      : [
          {
            end: clip.duration,
            start: 0,
            text: cleanSubtitleText(clip.text),
          },
        ];

  return subtitleSegments
    .map((segment, index) => {
      return [
        String(index + 1),
        `${formatSrtTimestamp(segment.start)} --> ${formatSrtTimestamp(segment.end)}`,
        segment.text,
      ].join("\n");
    })
    .join("\n\n")
    .concat("\n");
}

function cleanSubtitleText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function formatSrtTimestamp(totalSeconds: number) {
  const totalMilliseconds = Math.max(0, Math.round(totalSeconds * 1000));
  const hours = Math.floor(totalMilliseconds / 3_600_000);
  const minutes = Math.floor((totalMilliseconds % 3_600_000) / 60_000);
  const seconds = Math.floor((totalMilliseconds % 60_000) / 1000);
  const milliseconds = totalMilliseconds % 1000;

  return `${padTime(hours)}:${padTime(minutes)}:${padTime(seconds)},${milliseconds
    .toString()
    .padStart(3, "0")}`;
}

function padTime(value: number) {
  return value.toString().padStart(2, "0");
}
