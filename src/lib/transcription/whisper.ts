export const whisperConfig = {
  modelsDir: process.env.WHISPER_MODELS_DIR ?? "./models/whisper",
  binaryPath: process.env.WHISPER_BINARY_PATH ?? "",
} as const;

export function isWhisperConfigured() {
  return Boolean(whisperConfig.binaryPath);
}
