import path from "node:path";
import { execFile } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { promisify } from "node:util";
import type { ProjectTranscription } from "@/types/project";

const execFileAsync = promisify(execFile);

type WhisperMode = "openai" | "whisper_cpp";

type OpenAIWhisperJson = {
  text?: string;
  segments?: Array<{
    start?: number;
    end?: number;
    text?: string;
  }>;
};

type WhisperCppJson = {
  transcription?: Array<{
    text?: string;
    timestamps?: {
      from?: string;
      to?: string;
    };
    offsets?: {
      from?: number;
      to?: number;
    };
  }>;
};

export class WhisperNotInstalledError extends Error {
  constructor() {
    super(
      "Whisper local nao encontrado. Instale openai-whisper e configure WHISPER_BINARY_PATH=whisper, ou instale whisper.cpp e configure WHISPER_BINARY_PATH e WHISPER_MODEL_PATH no .env.",
    );
    this.name = "WhisperNotInstalledError";
  }
}

export class WhisperConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WhisperConfigurationError";
  }
}

export class TranscriptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TranscriptionError";
  }
}

export class TranscriptionService {
  static async validateWhisperInstalled() {
    const binaryPath = getWhisperBinaryPath();

    try {
      await execFileAsync(binaryPath, ["--help"], { timeout: 10000 });
    } catch {
      throw new WhisperNotInstalledError();
    }
  }

  static async transcribeAudio(audioPath: string, outputDir: string) {
    await mkdir(outputDir, { recursive: true });
    await this.validateWhisperInstalled();

    const mode = getWhisperMode();
    console.info(
      `[TranscriptionService] Iniciando transcricao mode=${mode} audio=${audioPath}`,
    );

    if (mode === "whisper_cpp") {
      return this.transcribeWithWhisperCpp(audioPath, outputDir);
    }

    return this.transcribeWithOpenAIWhisper(audioPath, outputDir);
  }

  private static async transcribeWithOpenAIWhisper(
    audioPath: string,
    outputDir: string,
  ): Promise<ProjectTranscription> {
    const binaryPath = getWhisperBinaryPath();
    const baseName = path.parse(audioPath).name;
    const jsonPath = path.join(outputDir, `${baseName}.json`);
    const srtPath = path.join(outputDir, `${baseName}.srt`);

    try {
      await execFileAsync(
        binaryPath,
        [
          audioPath,
          "--output_format",
          "all",
          "--output_dir",
          outputDir,
          "--verbose",
          "False",
        ],
        {
          maxBuffer: 1024 * 1024 * 20,
          timeout: 1000 * 60 * 30,
        },
      );

      const transcription = await parseOpenAIWhisperJson(jsonPath, srtPath);
      console.info(`[TranscriptionService] Transcricao concluida: ${jsonPath}`);
      return transcription;
    } catch (error) {
      console.error("[TranscriptionService] Falha no openai-whisper", error);
      throw new TranscriptionError(
        "Nao foi possivel transcrever o audio com openai-whisper.",
      );
    }
  }

  private static async transcribeWithWhisperCpp(
    audioPath: string,
    outputDir: string,
  ): Promise<ProjectTranscription> {
    const binaryPath = getWhisperBinaryPath();
    const modelPath = process.env.WHISPER_MODEL_PATH;

    if (!modelPath) {
      throw new WhisperConfigurationError(
        "Configure WHISPER_MODEL_PATH no .env para usar whisper.cpp.",
      );
    }

    const outputBasePath = path.join(outputDir, "transcript");
    const jsonPath = `${outputBasePath}.json`;
    const srtPath = `${outputBasePath}.srt`;

    try {
      await execFileAsync(
        binaryPath,
        [
          "-m",
          modelPath,
          "-f",
          audioPath,
          "-oj",
          "-osrt",
          "-of",
          outputBasePath,
        ],
        {
          maxBuffer: 1024 * 1024 * 20,
          timeout: 1000 * 60 * 30,
        },
      );

      const transcription = await parseWhisperCppJson(jsonPath, srtPath);
      console.info(`[TranscriptionService] Transcricao concluida: ${jsonPath}`);
      return transcription;
    } catch (error) {
      console.error("[TranscriptionService] Falha no whisper.cpp", error);
      throw new TranscriptionError(
        "Nao foi possivel transcrever o audio com whisper.cpp.",
      );
    }
  }
}

export async function transcribeAudio(audioPath: string, outputDir: string) {
  return TranscriptionService.transcribeAudio(audioPath, outputDir);
}

function getWhisperBinaryPath() {
  return process.env.WHISPER_BINARY_PATH || "whisper";
}

function getWhisperMode(): WhisperMode {
  const configuredMode = process.env.WHISPER_CLI_MODE;

  if (configuredMode === "openai" || configuredMode === "whisper_cpp") {
    return configuredMode;
  }

  const binaryName = path.basename(getWhisperBinaryPath()).toLowerCase();
  if (
    process.env.WHISPER_MODEL_PATH ||
    binaryName.includes("whisper-cli") ||
    binaryName === "main.exe" ||
    binaryName === "main"
  ) {
    return "whisper_cpp";
  }

  return "openai";
}

async function parseOpenAIWhisperJson(
  jsonPath: string,
  srtPath: string,
): Promise<ProjectTranscription> {
  const raw = await readFile(jsonPath, "utf8");
  const parsed = JSON.parse(raw) as OpenAIWhisperJson;
  const segments = (parsed.segments ?? []).map((segment) => ({
    start: Number(segment.start ?? 0),
    end: Number(segment.end ?? 0),
    text: String(segment.text ?? "").trim(),
  }));

  return {
    text: parsed.text?.trim() ?? segments.map((segment) => segment.text).join(" "),
    jsonPath,
    srtPath,
    segments,
  };
}

async function parseWhisperCppJson(
  jsonPath: string,
  srtPath: string,
): Promise<ProjectTranscription> {
  const raw = await readFile(jsonPath, "utf8");
  const parsed = JSON.parse(raw) as WhisperCppJson;
  const segments = (parsed.transcription ?? []).map((segment) => ({
    start: parseTimestamp(segment.timestamps?.from, segment.offsets?.from),
    end: parseTimestamp(segment.timestamps?.to, segment.offsets?.to),
    text: String(segment.text ?? "").trim(),
  }));

  return {
    text: segments.map((segment) => segment.text).join(" "),
    jsonPath,
    srtPath,
    segments,
  };
}

function parseTimestamp(value: string | undefined, offset: number | undefined) {
  if (Number.isFinite(offset)) {
    return Number(offset) / 1000;
  }

  if (!value) {
    return 0;
  }

  const [hours = "0", minutes = "0", seconds = "0"] = value
    .replace(",", ".")
    .split(":");

  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}
