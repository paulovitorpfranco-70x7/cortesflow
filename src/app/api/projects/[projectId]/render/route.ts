import { NextResponse } from "next/server";
import {
  ProjectNotFoundError,
  renderApprovedProjectClips,
} from "@/server/modules/projects/projects.service";
import { FFmpegNotInstalledError } from "@/server/modules/video-processing/video-processing.service";

export const runtime = "nodejs";

type RenderProjectRouteProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function POST(request: Request, { params }: RenderProjectRouteProps) {
  const { projectId } = await params;

  try {
    const project = await renderApprovedProjectClips(projectId, {
      includeCaptions: await readIncludeCaptions(request),
    });
    return NextResponse.json({ project });
  } catch (error) {
    if (error instanceof ProjectNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof FFmpegNotInstalledError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel renderizar os cortes.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

async function readIncludeCaptions(request: Request) {
  try {
    const payload = (await request.json()) as { includeCaptions?: unknown };
    return payload.includeCaptions === true;
  } catch {
    return false;
  }
}
