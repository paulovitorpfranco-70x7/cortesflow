import { NextResponse } from "next/server";
import {
  generateProjectClipSuggestions,
  ProjectNotFoundError,
} from "@/server/modules/projects/projects.service";
import { ClipGenerationError } from "@/server/modules/clip-generation/clip-generation.service";

export const runtime = "nodejs";

type GenerateClipsRouteProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function POST(
  _request: Request,
  { params }: GenerateClipsRouteProps,
) {
  const { projectId } = await params;

  try {
    const project = await generateProjectClipSuggestions(projectId);
    return NextResponse.json({ project });
  } catch (error) {
    if (error instanceof ProjectNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof ClipGenerationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel gerar cortes sugeridos.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
