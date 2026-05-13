import crypto from "node:crypto";
import type { ClipSuggestion, TranscriptionSegment } from "@/types/project";

const minClipDuration = 30;
const maxClipDuration = 60;
const maxSuggestions = 10;
const minSuggestions = 3;

const strongWords = [
  "erro",
  "segredo",
  "importante",
  "nunca",
  "sempre",
  "melhor",
  "pior",
  "crescer",
  "dinheiro",
  "resultado",
  "estrategia",
  "atenção",
  "atencao",
  "verdade",
  "problema",
  "solucao",
  "solução",
  "aprendi",
  "viral",
  "vender",
];

type GenerateClipSuggestionsInput = {
  projectId: string;
  segments: TranscriptionSegment[];
};

type CandidateClip = Omit<ClipSuggestion, "createdAt" | "id" | "projectId">;

export class ClipGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClipGenerationError";
  }
}

export class ClipGenerationService {
  static generateSuggestions({
    projectId,
    segments,
  }: GenerateClipSuggestionsInput): ClipSuggestion[] {
    const cleanSegments = normalizeSegments(segments);

    if (cleanSegments.length === 0) {
      throw new ClipGenerationError(
        "Transcricao sem segmentos validos para gerar cortes.",
      );
    }

    const totalDuration = cleanSegments.at(-1)?.end ?? 0;
    const targetCount = getTargetSuggestionCount(totalDuration);
    const candidates = buildCandidates(cleanSegments);
    const uniqueCandidates = dedupeCandidates(candidates)
      .sort((left, right) => right.score - left.score)
      .slice(0, targetCount);

    if (uniqueCandidates.length === 0) {
      throw new ClipGenerationError("Nao foi possivel encontrar cortes candidatos.");
    }

    const createdAt = new Date().toISOString();
    return uniqueCandidates.map((candidate, index) => ({
      ...candidate,
      id: crypto.randomUUID(),
      projectId,
      title: candidate.title || `Corte ${index + 1}`,
      createdAt,
    }));
  }
}

export function generateClipSuggestions(input: GenerateClipSuggestionsInput) {
  return ClipGenerationService.generateSuggestions(input);
}

function buildCandidates(segments: TranscriptionSegment[]): CandidateClip[] {
  const candidates: CandidateClip[] = [];

  for (let startIndex = 0; startIndex < segments.length; startIndex += 1) {
    let endIndex = startIndex;

    while (endIndex < segments.length) {
      const windowSegments = segments.slice(startIndex, endIndex + 1);
      const start = windowSegments[0].start;
      const end = windowSegments.at(-1)?.end ?? start;
      const duration = end - start;

      if (duration >= minClipDuration || shouldAcceptShortFallback(segments)) {
        if (duration <= maxClipDuration || shouldAcceptShortFallback(segments)) {
          candidates.push(createCandidate(windowSegments));
        }
      }

      if (duration >= maxClipDuration) {
        break;
      }

      endIndex += 1;
    }
  }

  return candidates;
}

function createCandidate(segments: TranscriptionSegment[]): CandidateClip {
  const start = segments[0].start;
  const end = segments.at(-1)?.end ?? start;
  const duration = Math.max(0, end - start);
  const text = segments.map((segment) => segment.text).join(" ").trim();
  const wordCount = countWords(text);
  const density = duration > 0 ? wordCount / duration : 0;
  const strongWordCount = countStrongWords(text);
  const score = Number(
    Math.min(100, density * 18 + strongWordCount * 9 + segments.length * 1.5).toFixed(
      1,
    ),
  );

  return {
    title: buildTitle(text),
    start,
    end,
    duration: Number(duration.toFixed(3)),
    text,
    score,
  };
}

function buildTitle(text: string) {
  const words = text
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 7);

  if (words.length === 0) {
    return "Corte sugerido";
  }

  return words.join(" ");
}

function normalizeSegments(segments: TranscriptionSegment[]) {
  return segments
    .filter((segment) => segment.text.trim() && segment.end > segment.start)
    .map((segment) => ({
      start: Number(segment.start),
      end: Number(segment.end),
      text: segment.text.trim(),
    }))
    .sort((left, right) => left.start - right.start);
}

function dedupeCandidates(candidates: CandidateClip[]) {
  const seen = new Set<string>();

  return candidates.filter((candidate) => {
    const key = `${Math.round(candidate.start)}-${Math.round(candidate.end)}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function getTargetSuggestionCount(totalDuration: number) {
  if (totalDuration < 90) {
    return Math.min(minSuggestions, maxSuggestions);
  }

  return Math.max(
    minSuggestions,
    Math.min(maxSuggestions, Math.floor(totalDuration / 60)),
  );
}

function shouldAcceptShortFallback(segments: TranscriptionSegment[]) {
  const totalDuration = (segments.at(-1)?.end ?? 0) - (segments[0]?.start ?? 0);
  return totalDuration < minClipDuration;
}

function countWords(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

function countStrongWords(text: string) {
  const normalizedText = text.toLowerCase();
  return strongWords.filter((word) => normalizedText.includes(word)).length;
}
