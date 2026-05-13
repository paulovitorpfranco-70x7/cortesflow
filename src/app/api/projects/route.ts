import { NextResponse } from "next/server";
import {
  createProjectFromUpload,
  listProjects,
  UploadValidationError,
} from "@/server/modules/projects/projects.service";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ projects: await listProjects() });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("video");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Envie um arquivo de video no campo video." },
        { status: 400 },
      );
    }

    const project = await createProjectFromUpload(file);
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error(error);
    return NextResponse.json(
      { error: "Nao foi possivel criar o projeto." },
      { status: 500 },
    );
  }
}
