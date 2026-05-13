import Link from "next/link";

type ProjectPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;

  return (
    <main className="app-shell narrow-shell">
      <Link className="text-link" href="/">
        Voltar
      </Link>
      <section className="surface placeholder-page">
        <p className="section-kicker">Workspace</p>
        <h1>Projeto {projectId}</h1>
        <p>
          Esta tela sera usada para revisar upload, transcricao, sugestoes de
          cortes e exportacoes.
        </p>
      </section>
    </main>
  );
}
