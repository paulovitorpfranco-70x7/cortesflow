import Link from "next/link";

export default function NewProjectPage() {
  return (
    <main className="app-shell narrow-shell">
      <Link className="text-link" href="/">
        Voltar
      </Link>
      <section className="surface placeholder-page">
        <p className="section-kicker">Projeto</p>
        <h1>Novo Projeto</h1>
        <p>
          Esta rota ja esta preparada para receber o formulario de criacao,
          upload inicial e configuracoes do pipeline.
        </p>
      </section>
    </main>
  );
}
