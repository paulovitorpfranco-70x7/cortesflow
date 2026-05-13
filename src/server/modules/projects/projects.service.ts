import crypto from "node:crypto";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { storagePaths } from "@/lib/storage/paths";
import {
  insertProject,
  selectRecentProjects,
} from "@/server/modules/projects/projects.repository";
import type { ProjectSummary } from "@/types/project";

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
