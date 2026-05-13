import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ffmpegPaths } from "@/lib/ffmpeg/paths";
import type { VideoMetadata } from "@/types/project";

const execFileAsync = promisify(execFile);

export class FFmpegNotInstalledError extends Error {
  constructor() {
    super(
      "FFmpeg/ffprobe nao encontrado. Verifique FFMPEG_PATH e FFPROBE_PATH no ambiente.",
    );
    this.name = "FFmpegNotInstalledError";
  }
}

export class VideoMetadataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VideoMetadataError";
  }
}

export class AudioExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AudioExtractionError";
  }
}

export class ClipRenderingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClipRenderingError";
  }
}

type FFprobeOutput = {
  streams?: Array<{
    codec_type?: string;
    codec_name?: string;
    width?: number;
    height?: number;
    duration?: string;
    avg_frame_rate?: string;
    r_frame_rate?: string;
  }>;
  format?: {
    duration?: string;
  };
};

export async function validateFFmpegInstalled() {
  return VideoProcessingService.validateFFmpegInstalled();
}

export async function getVideoMetadata(filePath: string): Promise<VideoMetadata> {
  return VideoProcessingService.getVideoMetadata(filePath);
}

export async function extractAudio(inputPath: string, outputPath: string) {
  return VideoProcessingService.extractAudio(inputPath, outputPath);
}

export async function renderVerticalClip(input: {
  captionsPath?: string;
  duration: number;
  inputPath: string;
  outputPath: string;
  start: number;
}) {
  return VideoProcessingService.renderVerticalClip(input);
}

export class VideoProcessingService {
  static async validateFFmpegInstalled() {
    try {
      await execFileAsync(ffmpegPaths.ffmpeg, ["-version"], { timeout: 10000 });
      await execFileAsync(ffmpegPaths.ffprobe, ["-version"], { timeout: 10000 });
    } catch {
      throw new FFmpegNotInstalledError();
    }
  }

  static async getVideoMetadata(filePath: string): Promise<VideoMetadata> {
    await this.validateFFmpegInstalled();

    try {
      const { stdout } = await execFileAsync(
        ffmpegPaths.ffprobe,
        [
          "-v",
          "error",
          "-print_format",
          "json",
          "-show_format",
          "-show_streams",
          filePath,
        ],
        {
          maxBuffer: 1024 * 1024 * 10,
          timeout: 30000,
        },
      );

      const data = JSON.parse(stdout) as FFprobeOutput;
      const videoStream = data.streams?.find(
        (stream) => stream.codec_type === "video",
      );

      if (!videoStream) {
        throw new VideoMetadataError("Nenhum stream de video foi encontrado.");
      }

      return {
        durationSeconds: parseNumber(
          videoStream.duration ?? data.format?.duration,
        ),
        width: videoStream.width ?? null,
        height: videoStream.height ?? null,
        fps: parseFrameRate(
          videoStream.avg_frame_rate ?? videoStream.r_frame_rate,
        ),
        codec: videoStream.codec_name ?? null,
      };
    } catch (error) {
      if (error instanceof VideoMetadataError) {
        throw error;
      }

      throw new VideoMetadataError(
        "Nao foi possivel extrair metadados do video com ffprobe.",
      );
    }
  }

  static async extractAudio(inputPath: string, outputPath: string) {
    await this.validateFFmpegInstalled();

    try {
      console.info(
        `[VideoProcessingService] Extraindo audio: ${inputPath} -> ${outputPath}`,
      );

      await execFileAsync(
        ffmpegPaths.ffmpeg,
        [
          "-y",
          "-i",
          inputPath,
          "-vn",
          "-acodec",
          "pcm_s16le",
          "-ar",
          "16000",
          "-ac",
          "1",
          outputPath,
        ],
        {
          maxBuffer: 1024 * 1024 * 10,
          timeout: 120000,
        },
      );

      console.info(`[VideoProcessingService] Audio extraido: ${outputPath}`);
      return outputPath;
    } catch (error) {
      console.error("[VideoProcessingService] Falha ao extrair audio", error);
      throw new AudioExtractionError(
        "Nao foi possivel extrair audio do video com FFmpeg.",
      );
    }
  }

  static async renderVerticalClip({
    captionsPath,
    duration,
    inputPath,
    outputPath,
    start,
  }: {
    captionsPath?: string;
    duration: number;
    inputPath: string;
    outputPath: string;
    start: number;
  }) {
    await this.validateFFmpegInstalled();

    const baseFilter =
      "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:1[bg];" +
      "[0:v]scale=1080:1920:force_original_aspect_ratio=decrease[fg];" +
      "[bg][fg]overlay=(W-w)/2:(H-h)/2,format=yuv420p[base]";
    const filter = captionsPath
      ? `${baseFilter};[base]subtitles='${escapeSubtitlePath(captionsPath)}':force_style='${subtitleStyle}',format=yuv420p[v]`
      : `${baseFilter};[base]format=yuv420p[v]`;

    try {
      console.info(
        `[VideoProcessingService] Renderizando corte vertical: ${inputPath} ${start}-${start + duration} -> ${outputPath} captions=${captionsPath ? "on" : "off"}`,
      );

      await execFileAsync(
        ffmpegPaths.ffmpeg,
        [
          "-y",
          "-ss",
          start.toString(),
          "-t",
          duration.toString(),
          "-i",
          inputPath,
          "-filter_complex",
          filter,
          "-map",
          "[v]",
          "-map",
          "0:a?",
          "-c:v",
          "libx264",
          "-preset",
          "veryfast",
          "-crf",
          "23",
          "-c:a",
          "aac",
          "-b:a",
          "128k",
          "-movflags",
          "+faststart",
          outputPath,
        ],
        {
          maxBuffer: 1024 * 1024 * 20,
          timeout: 1000 * 60 * 10,
        },
      );

      console.info(`[VideoProcessingService] Corte renderizado: ${outputPath}`);
      return outputPath;
    } catch (error) {
      console.error("[VideoProcessingService] Falha ao renderizar corte", error);
      throw new ClipRenderingError(
        "Nao foi possivel renderizar o corte vertical com FFmpeg.",
      );
    }
  }
}

function parseNumber(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function parseFrameRate(value: string | undefined) {
  if (!value || value === "0/0") {
    return null;
  }

  const [numerator, denominator] = value.split("/").map(Number);
  if (!Number.isFinite(numerator)) {
    return null;
  }

  if (!Number.isFinite(denominator) || denominator === 0) {
    return numerator;
  }

  return Number((numerator / denominator).toFixed(3));
}

const subtitleStyle = [
  "FontName=Arial",
  "Fontsize=64",
  "PrimaryColour=&H00FFFFFF",
  "OutlineColour=&H00000000",
  "BorderStyle=1",
  "Outline=4",
  "Shadow=0",
  "Alignment=2",
  "MarginV=220",
].join(",");

function escapeSubtitlePath(filePath: string) {
  return filePath
    .replace(/\\/g, "/")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'");
}
