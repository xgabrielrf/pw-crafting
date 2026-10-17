# Formato dos dados

- `data.js` (mantido à mão) — `window.DATA = { items, recipes }`.
  - `items[id] = { nome, tipo }` — `tipo`: `arma`, `material` ou `alma`. O `id` é o do pwdatabase (`/items/<id>`).
  - `recipes[]`:
    - `id`: id da receita no pwdatabase; `saida`: id da arma produzida; `nivel`: 60–100; `aba`: `"I"`–`"VI"`; `pagina`: número da aba.
    - `slot`: posição 1–32 na grade 8×4 do jogo (linha × 8 + coluna + 1).
    - `materiais`: `[{ item, qtd }]`, incluindo a Essência do Crepúsculo (15461).
    - `almas`: `[{ item, deArma }]` — `item` = id da "Alma: …"; `deArma` = id da arma que precisa ser construída e quebrada para obtê-la. As red dusk (nv 100) têm 4.
    - `requer`: `{ profissao, nivel }` — nível de forja (campo "Level" da receita no pwdatabase).
- `drops.js` (**gerado**, não editar) — `window.DROPS`. Fonte: `../tools/gen_drops.py`. Cada drop: `dusk` (`capítulo-dificuldade`), `boss`, `qtdeBoss` (dificuldade), `item`, `nivelItem`, `itemId`, `raridade` (`normal`, `gold`, `red`).

Detalhes, fontes e decisões: ver `../CLAUDE.md`.
