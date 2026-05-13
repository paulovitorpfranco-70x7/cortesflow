import Link from "next/link";

export function AppHero() {
  return (
    <header className="hero-grid">
      <div className="hero-copy">
        <p className="eyebrow">Editor local de cortes verticais</p>
        <h1>ClipForge AI</h1>
        <p className="lede">
          Comece organizando projetos e enviando videos longos. O pipeline de
          FFmpeg e Whisper sera plugado nas proximas etapas, sem travar a
          interface inicial.
        </p>
      </div>

      <div className="hero-actions" aria-label="Acoes principais">
        <Link className="primary-action" href="/projects/new">
          Novo Projeto
        </Link>
        <span className="action-note">MVP local sem processamento ativo</span>
      </div>
    </header>
  );
}
