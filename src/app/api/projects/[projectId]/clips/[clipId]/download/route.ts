import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { selectClipSuggestionById } from "@/server/modules/projects/projects.repository";

export const runtime = "nodejs";

type DownloadClipRouteProps = {
  params: Promise<{
    clipId: string;
    projectId: string;
  }>;
};

export async function GET(_request: Request, { params }: DownloadClipRouteProps) {
  const { clipId, projectId } = await params;
  const clip = await selectClipSuggestionById(projectId, clipId);

  if (!clip?.outputPath || clip.renderStatus !== "rendered") {
    return NextResponse.json(
      { error: "Video renderizado nao encontrado." },
      { status: 404 },
    );
  }

  try {
    const file = await readFile(clip.outputPath);
    return new NextResponse(file, {
      headers: {
        "Content-Disposition": `attachment; filename="${clip.title}-${clip.id}.mp4"`,
        "Content-Type": "video/mp4",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Arquivo renderizado nao encontrado no disco." },
      { status: 404 },
    );
  }
}
