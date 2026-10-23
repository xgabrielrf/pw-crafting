# PW Crafting

Ferramenta local (HTML/CSS/JS puro, sem build) para planejar o crafting de armas do **Palácio do Crepúsculo** (Perfect World BR, NPC "Armas do Crepúsculo", id 15494). Reproduz a janela de crafting do jogo (abas I–VI, grade 8×4) e, ao escolher uma arma, mostra a **cadeia de Almas** (todas as armas que precisam ser construídas e quebradas) e o **total de materiais** com dusk, boss e dificuldade de cada drop.

Idioma do projeto e da conversa com o usuário: português do Brasil.

## Como rodar / distribuir
Pensado para **distribuição a pessoas sem Node**: nada além de um navegador.
- **Link web (GitHub Pages)**: tudo usa caminhos relativos; o app só tenta o servidor local quando o host é `localhost`/`127.0.0.1`. O dono do repositório ativa em Settings > Pages (branch `main`, raiz).
- **Arquivo único**: `node tools/gerar-arquivo-unico.js` gera `dist/pw-crafting.html` (CSS, JS, dados e 285 ícones em `window.ICONES`, ~800 KB; `dist/` está no `.gitignore`). `app.js` usa `window.ICONES[id]` quando existe.
- **Pasta**: abrir `index.html` direto (`file://`). Os dados de receitas/drops ficam em `.js` (`window.DATA`, `window.DROPS`) e não em `.json` porque `fetch` não funciona em `file://`.
- **Opcional (avançado, precisa de Node)**: `iniciar.bat` sobe `tools/servidor.js` em `http://localhost:8765` e salva o estoque em `estoque.json` automaticamente.

## Estrutura
- `index.html`, `style.css`, `app.js` — interface (um único IIFE em `app.js`). **Cabeçalho** com o menu **Dusk ▾ → Arma | Drops** (`mostrarView` em `app.js`; a view fica no hash `#arma`/`#drops`). "Arma" = a página de crafting, "Drops" = `pagina-drops.js`.
- `pagina-drops.js` — página **Drops**: as tabelas da wiki em formato de planilha (`window.PaginaDrops.render`). Seletor `1-1 … 3-3` (só aquela dusk: boss, modo, dificuldade e drops) e "Completo" por capítulo (3 colunas, como a wiki). Usa `DROPS.bosses` (gerado por `tools/gen_drops.py`, inclui "Nada" e o modo: Alta = Grupo; Média/Alta = Solo / Grupo). Cores: verde normal, amarelo gold, vermelho red dusk, azul "Boss, Baú".
- `calc.js` — lógica pura de cálculo (cadeia de Almas, distribuição de estoque entre planos), sem DOM; usada no navegador (`window.PWCalc`) e testável no Node (`require`).
- `data/data.js` — `window.DATA = { items, recipes }`. Mantido à mão.
- `data/drops.js` — `window.DROPS` (capítulos, drops, `bosses`, `semDrop`). **Gerado** por `tools/gen_drops.py`; não editar à mão.
- `tools/servidor.js` — servidor local (só Node, sem dependências): serve a pasta e expõe `GET/PUT /api/estoque` (grava `estoque.json` com troca atômica e uma cópia `.bak`). Só escuta em 127.0.0.1, confere o `Host` e exige o cabeçalho `X-PW-Crafting` no PUT (anti-CSRF/DNS rebinding); não serve `estoque.json`, `tools/`, `CLAUDE.md` nem arquivos ocultos.
- `iniciar.bat` — abre o servidor opcional e o navegador.
- `tools/gerar-arquivo-unico.js` — gera `dist/pw-crafting.html` (arquivo autocontido).
- `README.md` — instruções para quem vai **usar** (PT-BR), com créditos; este `CLAUDE.md` é para quem mantém.
- `.gitignore` — ignora `estoque.json`, `.bak` e `.tmp` (dados pessoais).
- `tools/gen_drops.py` — fonte dos drops (transcrição das tabelas da Wiki PW). Uso, na raiz: `python -I tools/gen_drops.py data/drops.js`.
- `icons/<id>.png` — ícones 32×32 do pwdatabase, um por item de `data.js`. `sh tools/baixar-icones.sh` baixa os que faltam.
- `data/README.md` — formato dos campos.

## Modelo de dados (`data/data.js`)
- `items[id] = { nome, tipo: "arma" | "material" | "alma" }`. `id` = id do pwdatabase.
- `recipes[]`: `{ id (receita), pagina, aba ("I".."VI"), slot (1–32), saida (id da arma), nivel, materiais: [{item, qtd}], almas: [{item, deArma}], requer: {profissao, nivel} }`.
  - `slot` = posição na grade do jogo: linha×8 + coluna + 1 (linha 1 = 1–8 … linha 4 = 25–32). Sem `slot`, o app põe em sequência.
  - `materiais` inclui a Essência do Crepúsculo (id 15461). Alma **não** entra em `materiais`.
  - `almas`: lista (receitas red dusk têm 4). `item` = id da "Alma: …"; `deArma` = id da arma que precisa ser construída e quebrada para obtê-la. O vínculo é explícito porque os nomes divergem (ex.: "Alma: Lâmina de Fogo" = ☆Lâmina em Chamas; "Alma: Esdapas Duplas de Shenluo").
  - `requer.nivel` = nível de forja (campo "Level" da página da receita no pwdatabase). `profissao` é sempre "Ferreiro" para armas (confirmado pelo usuário).
- Nível de forja por nível da arma (verificado em amostras de cada nível): 60→4, 70→4, 80→5, 90→6, 99→7, 100 (red dusk)→8.

## Estoque e planos
- Estado: `{ estoque: { itemId: qtd }, planos: [{ arma, qtd }] }`, **global e por id**: materiais, Almas (`tipo: alma`) e armas prontas (`tipo: arma`) no mesmo mapa.
- **Onde salva** (`modo` em `app.js`, escolhido automaticamente; o `carregar()` tenta nesta ordem):
  1. `"servidor"` — host localhost + `GET api/estoque` com cabeçalho `X-PW-Crafting` na resposta (`tools/servidor.js`); salva com `PUT` (debounce 250 ms; `pagehide` envia a última digitação).
  2. `"arquivo"` — Chrome/Edge (`showSaveFilePicker`): o usuário escolhe um `.json` uma vez ("Salvar em arquivo…"); o handle fica no IndexedDB (`pw-crafting`/`h`). Em nova sessão, se `queryPermission` não for `granted`, aparece o botão "Reconectar" (`requestPermission` exige clique). Ao conectar a um arquivo com dados diferentes dos da tela, pergunta qual vale. **O seletor não é testável em headless**: foi testado com um mock de `showSaveFilePicker`.
  3. `"navegador"` — `localStorage` (chave `pw-crafting:v1`); padrão em qualquer navegador e em `file://`.
  Os modos não se misturam; para migrar de um para outro, usar Exportar/Importar. Exportar/Importar gera/lê um `.json` (também serve para levar o estoque entre navegadores/máquinas).
- **Planos** = lista de armas que o usuário quer construir, em ordem de prioridade. O estoque é distribuído na ordem: cada plano consome o que precisa e o seguinte só vê o que sobrou (nunca conta o mesmo item duas vezes). Arma **fora** dos planos vê só o estoque livre (o que os planos não reservam). Arma no plano vê só o que sobrou dos planos acima dela.
- **Almas e armas prontas encurtam a cadeia**: se há `Alma: X` no estoque, a arma que a geraria não é construída; uma arma pronta pode ser quebrada para dar a Alma (`planejar` em `calc.js`).
- Tabela de materiais: colunas Qtd (preciso), Tenho (input editável = estoque total), Falta, Progresso (barra e %), além de Dusk/Boss/Dificuldade. **% geral = soma de min(tenho, preciso) ÷ soma do que precisa (por unidades)** — a Essência pesa muito por ter muitas unidades.
- Os inputs salvam com debounce de 350 ms e preservam o foco ao re-renderizar (`data-key`).

## Lógica (`app.js`)
- `calc.cadeia(armaId, qtd)` (em `calc.js`) sobe as `almas` recursivamente e **conta quantas vezes cada arma precisa ser construída**: cada Alma exige quebrar uma arma, então duas receitas que pedem a mesma Alma exigem duas construções (ex.: a Besta do Ódio entra 2× no Trovão Celestial e a Besta do Vento 4×). Retorna `[{r, n}]` ordenado por nível; materiais e totais são multiplicados por `n`.
- Tabela "Total de materiais": ordem padrão = gold, red, drops de boss específico (alfabético), itens comuns ("Boss, Baú"), Essência por último. Cabeçalhos clicáveis ordenam (1º clique A→Z, 2º Z→A, 3º volta ao padrão; botão "Ordem padrão"). Itens com várias dusks são ordenados pela menor (crescente) ou maior (decrescente); itens sem drop ficam sempre no fim.
- Itens "comuns" (todas as fontes são "Boss, Baú"/"Boss, Mobs, Baú") viram uma linha só, boss = "Boss, Baú", com todas as dusks juntas. Essência: dusk/boss/dificuldade "—".
- Cada célula em uma linha só (`white-space: nowrap`).

## Nomenclatura de drops (definida pelo usuário)
- **Dusk** = `capítulo-dificuldade`, ex.: `2-1` = Capítulo 2, coluna 1. Capítulos: 1 Cântico Espiritual, 2 Sinfonia do Destino, 3 Ópera do Crepúsculo; dificuldades 1–3 = colunas (Cavaleiros/Defensores/Valentes etc.).
- **Dificuldade** (campo `qtdeBoss`) = coluna "Qtde Boss" do guia: "Alta" ou "Média/Alta". A coluna "Modo" (Solo/Grupo) é ignorada.
- Essência do Crepúsculo não é drop: é custo de entrada em bosses "Alta" (Cap. 1: 1, Cap. 2: 2, Cap. 3: 3). Fica em `semDrop`.

## Raridade dos drops (`raridade` em cada drop)
Pela **cor do nome nas imagens do guia**: verde/azul = `normal`; amarelo = `gold` (brilho amarelo na linha, sempre no topo da tabela); vermelho = `red` (**Red Dusk**: itens de nível 100 — Espírito do Céu e da Terra 15311, Máscara Dourada 15309, Cetro do Crepúsculo 15310; brilho vermelho, logo abaixo dos gold).
- Conferido nas imagens originais da wiki (mais nítidas que as que o usuário enviou): as **Asas Puras Brilhantes (99)** são de fato amarelas (gold); os demais gold/red do projeto também batem. A lista está em `GOLD`/`RED` em `tools/gen_drops.py`.

## Red Dusk (armas nv 100, ☆☆)
Uma por aba, slot 32 (aba VI: slot 32 também). Consomem **4 Almas de armas nv 99** + 1 item red + 58 Essências, forja 8.
| Aba | Arma (id) | Receita | Item red | Almas (armas nv 99) |
|---|---|---|---|---|
| I | ☆☆Lâmina Inigualável (14814) | 1898 | Máscara Dourada | Ponta dos Sonhos, Ponta Escarlate, Lâmina Espiritual Sagrada, Espada da Escuridão |
| II | ☆☆Mil Nuvens Celestiais (14856) | 1900 | Cetro do Crepúsculo | Lança Longa do Rei, Longa Fantasma, da Grande Besta, Demoníaca Sombria |
| III | ☆☆Punho de Dragão e Tigre (14874) | 1901 | Espírito do Céu e da Terra | Punho Demoníaco da Sombra, Espectral, Sagrado, do Carrasco |
| IV | ☆☆Purgatório de Shura (15031) | 1899 | Máscara Dourada | Machado do Poder Sombrio, Bestial Ancestral, Duplo do Rei, Escarlate |
| V | ☆☆Ilusões do Sen Luo (14914) | 1903 | Cetro do Crepúsculo | Esp. da Lamentação Demoníaca, Esperança Perdida, Miragem, Asa de Fogo do Garuda |
| VI | ☆☆Trovão Celestial (14892) | 1902 | Espírito do Céu e da Terra | Flash, Estrela Cadente, Alma Aprisionada, Alma Estilhaçada |
- Os links dos itens red foram dados pelo usuário (`pwdatabase.com/br/items/<id>`).
- A página do item/receita mostra uma **segunda lista de materiais** (Tábua Polida, Aço Temperado, Pó de Esmeril, Carvão de Pedra, …): é um caminho alternativo de crafting, **ignorado** (usa-se a lista com Essência).
- Quantidade do item red e das Almas: o pwdatabase não mostra; assumido **1** (confirmado para a Máscara Dourada: "1 unidade por receita").

## De onde vieram as informações
1. **Receitas, materiais, quantidades, ids**: pwdatabase — NPC `https://www.pwdatabase.com/br/npc/15494` (lista contínua de 156 receitas; não marca páginas), páginas `recipe/<id>` (campo "Level" = forja) e `items/<id>`. Ícones: `https://www.pwdatabase.com/images/icons/generalm/<id>.png`.
2. **Drops (dusk, boss, dificuldade, raridade)**: **Tabelas do Palácio do Crepúsculo**, Wiki PW, por **IronfreaK** — https://wikipw.com.br/index.php/Tabelas_do_Pal%C3%A1cio_do_Crep%C3%BAsculo (3 imagens: `Dusk_1/2/3.jpg`, Capítulos 1, 2 e 3; o rodapé de cada uma traz "By: IronfreaK"). É o mesmo guia que o usuário enviou como imagens; a página não traz o conteúdo em texto, só as imagens. Os textos de crédito estão em `index.html` (rodapé) e `README.md`. O pwdatabase só tem "Drop from" sem capítulo/dificuldade.
3. **Posição na grade (`slot`)**: **screenshots da janela do jogo** enviados pelo usuário (uma por aba). Foram casados com os ícones do pwdatabase (folha de contato) e validados por um agente independente (abas I–V; VI validada pelo usuário). Dentro de grupos de ícones idênticos (mesmo nível/desenho) a ordem segue a do pwdatabase e não é decidível só pelo ícone.
4. Quando há dúvida: procurar primeiro no pwdatabase; se não achar, **perguntar ao usuário** (regra explícita dele; não supor).

## Conciliação de nomes (guia × pwdatabase)
O guia e o banco grafam alguns itens diferente; a ligação é por id em `IDS` de `tools/gen_drops.py` (chave = nome do guia + nível):
- Símeo (guia) = Símio (db); Feng Wuhen = Feng Wushen; Chifre de Sela de Shenwu = Chifre de Sela Primordial; Alma do Demônio Ancestral = Alma do Demônio Ancião; Chifre/Cinzas "do" = "de" Demônio Ancestral; Cetro do Poder do Crepúsculo (100) = Cetro do Crepúsculo.
- **Máscara Fantasma (15294)** = **Casco da Grande Besta (99)** do guia (Ministro Zi Cun, 3-2) — definido pelo usuário.
- O guia escreve "Pedra do Lar (80)" no 3-2, mas é a **Pedra do Lar (90)** (id 15279) — erro de digitação do guia, confirmado pelo usuário; o projeto mostra "(90)". Por isso a Pedra do Lar lista as dusks 2-2, 2-3, 3-1 e 3-2.

## Escopo atual
- Abas I–VI cadastradas (lâminas/espadas duplas, lanças/espadas, punhos, machados/marretas, espadas mágicas/cajados/rodas/bandeiras, bestas/arcos/fundas).
- **Fora do escopo por enquanto**: adagas e fabaos (receitas "N/A…" 122–156 do NPC, provavelmente páginas 7–8), recipe 1744 ("???").

## Convenções para mexer no projeto
- Ao mudar interface, **abrir e olhar o resultado** (Edge headless: `msedge.exe --headless --disable-gpu --window-size=W,H --screenshot=out.png file:///...`), não só checar sintaxe (`node --check`).
- Ao mudar drops: editar `tools/gen_drops.py` e regenerar `data/drops.js`.
- Ao adicionar itens novos: cadastrar em `data.js`, rodar `sh tools/baixar-icones.sh`, e mapear o drop em `IDS` (nome do guia + nível → id).
- Git: nunca commitar/pushar; seguir a regra do `CLAUDE.md` da pasta anterior (`..\CLAUDE.md`) e só enviar os comandos prontos.
