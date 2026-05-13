# Arquitetura Inicial

O MVP usa um unico app Next.js para reduzir complexidade operacional local.

## Camadas

- `src/app`: UI e API routes.
- `src/features`: modulos de produto no frontend.
- `src/server/modules`: casos de uso e servicos backend chamados pelas API routes.
- `src/lib`: adaptadores locais para SQLite, filesystem, FFmpeg e futura transcricao.
- `storage`: dados locais gerados pelo app.

## Decisao do backend

Para o MVP, as API routes do Next.js sao suficientes. Quando o processamento de video ficar pesado, o pipeline deve ser extraido para um worker Node separado, mantendo a UI e as rotas HTTP no Next.js.

## Pipeline futuro

1. Upload local do video.
2. Registro do projeto no SQLite.
3. Extracao de metadados com ffprobe.
4. Extracao de audio com FFmpeg.
5. Transcricao com Whisper.
6. Sugestao de cortes.
7. Revisao manual.
8. Renderizacao vertical.
9. Exportacao local.
