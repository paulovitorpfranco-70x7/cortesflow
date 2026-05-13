# CortesFlow

App local para receber videos longos e preparar cortes curtos verticais para YouTube Shorts, TikTok e Instagram Reels.

## Stack inicial

- Next.js com App Router
- TypeScript
- API routes do Next.js para o backend do MVP
- SQLite local via `node:sqlite`
- FFmpeg preparado para processamento futuro
- Estrutura preparada para integracao futura com Whisper

## Requisitos locais

- Node.js 24+
- npm
- FFmpeg e ffprobe disponiveis no PATH

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Acesse `http://localhost:3000`.

## Scripts

```bash
npm run dev        # inicia o app local
npm run build      # gera build de producao
npm run start      # inicia build de producao
npm run lint       # executa ESLint
npm run typecheck  # valida TypeScript
```

## Estrutura

```txt
src/app                Rotas, telas e API routes do Next.js
src/components         Componentes compartilhados
src/features           Modulos de interface por dominio
src/lib                Infra local: db, storage, ffmpeg e transcricao
src/server/modules     Servicos backend por dominio
src/types              Tipos compartilhados
storage/uploads        Videos enviados localmente
storage/outputs        Cortes renderizados
storage/temp           Arquivos temporarios
storage/projects       Banco SQLite e dados por projeto
docs                   Documentacao tecnica
```

## Escopo atual

Esta base ainda nao implementa processamento pesado de video. A fundacao apenas organiza o app, configura TypeScript/ESLint, prepara storage local e cria contratos iniciais para evoluir o pipeline.
