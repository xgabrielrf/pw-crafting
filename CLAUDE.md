# PW Crafting

Ferramenta local (HTML/CSS/JS puro, sem build) para planejar o crafting de armas do **Palácio do Crepúsculo** (Perfect World BR, NPC "Armas do Crepúsculo", id 15494). Reproduz a janela de crafting do jogo (abas I–VI, grade 8×4) e, ao escolher uma arma, mostra a **cadeia de Almas** (todas as armas que precisam ser construídas e quebradas) e o **total de materiais** com dusk, boss e dificuldade de cada drop.

Idioma do projeto e da conversa com o usuário: português do Brasil.

## Como rodar
Abrir `index.html` com duplo clique (funciona via `file://`). Por isso os dados ficam em `.js` (`window.DATA`, `window.DROPS`) e não em `.json` (`fetch` não funciona em `file://`).

## Estrutura
- `index.html`, `style.css`, `app.js` — interface e lógica (um único IIFE em `app.js`).
- `data/data.js` — `window.DATA = { items, recipes }`. Mantido à mão.
- `data/drops.js` — `window.DROPS` (capítulos, drops, `semDrop`). **Gerado** por `tools/gen_drops.py`; não editar à mão.
- `tools/gen_drops.py` — fonte dos drops (transcrição do guia do usuário). Uso, na raiz: `python -I tools/gen_drops.py data/drops.js`.
- `icons/<id>.png` — ícones 32×32 do pwdatabase, um por item de `data.js`. `sh baixar-icones.sh` baixa os que faltam.
- `data/README.md` — formato dos campos.

## Modelo de dados (`data/data.js`)
- `items[id] = { nome, tipo: "arma" | "material" | "alma" }`. `id` = id do pwdatabase.
- `recipes[]`: `{ id (receita), pagina, aba ("I".."VI"), slot (1–32), saida (id da arma), nivel, materiais: [{item, qtd}], almas: [{item, deArma}], requer: {profissao, nivel} }`.
  - `slot` = posição na grade do jogo: linha×8 + coluna + 1 (linha 1 = 1–8 … linha 4 = 25–32). Sem `slot`, o app põe em sequência.
  - `materiais` inclui a Essência do Crepúsculo (id 15461). Alma **não** entra em `materiais`.
  - `almas`: lista (receitas red dusk têm 4). `item` = id da "Alma: …"; `deArma` = id da arma que precisa ser construída e quebrada para obtê-la. O vínculo é explícito porque os nomes divergem (ex.: "Alma: Lâmina de Fogo" = ☆Lâmina em Chamas; "Alma: Esdapas Duplas de Shenluo").
  - `requer.nivel` = nível de forja (campo "Level" da página da receita no pwdatabase). `profissao` é sempre "Ferreiro" para armas (confirmado pelo usuário).
- Nível de forja por nível da arma (verificado em amostras de cada nível): 60→4, 70→4, 80→5, 90→6, 99→7, 100 (red dusk)→8.

## Lógica (`app.js`)
- `resolverCadeia(armaId)` sobe as `almas` recursivamente e **conta quantas vezes cada arma precisa ser construída**: cada Alma exige quebrar uma arma, então duas receitas que pedem a mesma Alma exigem duas construções (ex.: a Besta do Ódio entra 2× no Trovão Celestial e a Besta do Vento 4×). Retorna `[{r, n}]` ordenado por nível; materiais e totais são multiplicados por `n`.
- Tabela "Total de materiais": ordem padrão = gold, red, drops de boss específico (alfabético), itens comuns ("Boss, Baú"), Essência por último. Cabeçalhos clicáveis ordenam (1º clique A→Z, 2º Z→A, 3º volta ao padrão; botão "Ordem padrão"). Itens com várias dusks são ordenados pela menor (crescente) ou maior (decrescente); itens sem drop ficam sempre no fim.
- Itens "comuns" (todas as fontes são "Boss, Baú"/"Boss, Mobs, Baú") viram uma linha só, boss = "Boss, Baú", com todas as dusks juntas. Essência: dusk/boss/dificuldade "—".
- Cada célula em uma linha só (`white-space: nowrap`).

## Nomenclatura de drops (definida pelo usuário)
- **Dusk** = `capítulo-dificuldade`, ex.: `2-1` = Capítulo 2, coluna 1. Capítulos: 1 Cântico Espiritual, 2 Sinfonia do Destino, 3 Ópera do Crepúsculo; dificuldades 1–3 = colunas (Cavaleiros/Defensores/Valentes etc.).
- **Dificuldade** (campo `qtdeBoss`) = coluna "Qtde Boss" do guia: "Alta" ou "Média/Alta". A coluna "Modo" (Solo/Grupo) é ignorada.
- Essência do Crepúsculo não é drop: é custo de entrada em bosses "Alta" (Cap. 1: 1, Cap. 2: 2, Cap. 3: 3). Fica em `semDrop`.

## Raridade dos drops (`raridade` em cada drop)
Pela **cor do nome nas imagens do guia**: verde/azul = `normal`; amarelo = `gold` (brilho amarelo na linha, sempre no topo da tabela); vermelho = `red` (**Red Dusk**: itens de nível 100 — Espírito do Céu e da Terra 15311, Máscara Dourada 15309, Cetro do Crepúsculo 15310; brilho vermelho, logo abaixo dos gold).
- Exceção definida pelo usuário: **Asas Puras Brilhantes (99)** é tratada como gold, embora esteja verde na imagem (`GOLD` em `tools/gen_drops.py`).

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
2. **Drops (dusk, boss, dificuldade, raridade)**: **guia do usuário** (3 imagens: Capítulos 1, 2 e 3). O pwdatabase só tem "Drop from" sem capítulo/dificuldade.
3. **Posição na grade (`slot`)**: **screenshots da janela do jogo** enviados pelo usuário (uma por aba). Foram casados com os ícones do pwdatabase (folha de contato) e validados por um agente independente (abas I–V; VI validada pelo usuário). Dentro de grupos de ícones idênticos (mesmo nível/desenho) a ordem segue a do pwdatabase e não é decidível só pelo ícone.
4. Quando há dúvida: procurar primeiro no pwdatabase; se não achar, **perguntar ao usuário** (regra explícita dele; não supor).

## Conciliação de nomes (guia × pwdatabase)
O guia e o banco grafam alguns itens diferente; a ligação é por id em `IDS` de `tools/gen_drops.py` (chave = nome do guia + nível):
- Símeo (guia) = Símio (db); Feng Wuhen = Feng Wushen; Chifre de Sela de Shenwu = Chifre de Sela Primordial; Alma do Demônio Ancestral = Alma do Demônio Ancião; Chifre/Cinzas "do" = "de" Demônio Ancestral; Cetro do Poder do Crepúsculo (100) = Cetro do Crepúsculo.
- **Máscara Fantasma (15294)** = **Casco da Grande Besta (99)** do guia (Ministro Zi Cun, 3-2) — definido pelo usuário.
- "Pedra do Lar (80)" do 3-2 no guia não existe no db (só nv 90, id 15279); está cadastrada sem `itemId`.

## Escopo atual
- Abas I–VI cadastradas (lâminas/espadas duplas, lanças/espadas, punhos, machados/marretas, espadas mágicas/cajados/rodas/bandeiras, bestas/arcos/fundas).
- **Fora do escopo por enquanto**: adagas e fabaos (receitas "N/A…" 122–156 do NPC, provavelmente páginas 7–8), recipe 1744 ("???").

## Convenções para mexer no projeto
- Ao mudar interface, **abrir e olhar o resultado** (Edge headless: `msedge.exe --headless --disable-gpu --window-size=W,H --screenshot=out.png file:///...`), não só checar sintaxe (`node --check`).
- Ao mudar drops: editar `tools/gen_drops.py` e regenerar `data/drops.js`.
- Ao adicionar itens novos: cadastrar em `data.js`, rodar `sh baixar-icones.sh`, e mapear o drop em `IDS` (nome do guia + nível → id).
- Git: nunca commitar/pushar; seguir a regra do `CLAUDE.md` da pasta anterior (`..\CLAUDE.md`) e só enviar os comandos prontos.
