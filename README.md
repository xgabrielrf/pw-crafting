# PW Crafting

Calculadora de crafting das armas do **Palácio do Crepúsculo** (Perfect World BR). Escolha uma arma e veja:

- a **cadeia de Almas**: todas as armas que precisam ser construídas e quebradas, até chegar na arma desejada (inclusive as Red Dusk nv 100);
- o **total de materiais**, com a dusk (`capítulo-dificuldade`), o boss e a dificuldade de cada drop;
- o seu **progresso**: informe o que você já tem (materiais, Almas e armas prontas) e veja quanto falta e a % concluída;
- **Dusk › Drops**: as tabelas de drops do Palácio do Crepúsculo em formato de planilha; escolha a dusk (1-1 … 3-3) ou o capítulo completo e veja só os bosses e drops dela;
- **planos**: junte várias armas numa lista de prioridade; o estoque é dividido entre elas sem contar o mesmo item duas vezes.

## Como usar

Escolha o que for mais fácil:

1. **Pelo link** (quando publicado no GitHub Pages): abra o endereço no navegador. Nada para instalar.
2. **Arquivo único**: baixe `pw-crafting.html` e dê duplo clique.
3. **Pasta do projeto**: baixe o repositório e abra o `index.html`.

Não precisa de Node, internet depois de carregar, nem instalação.

## Onde o seu estoque fica salvo

- Por padrão, **no próprio navegador** (salva sozinho). Outro navegador ou outro computador começa vazio, e limpar os dados do navegador apaga o estoque.
- Use **Exportar estoque** para gerar um arquivo `.json` de backup e **Importar** para trazê-lo de volta (serve também para trocar de navegador ou de computador).
- No **Chrome ou Edge**, o botão **Salvar em arquivo…** deixa você escolher um `.json` e passa a salvar direto nele. Cada vez que você reabrir a página, o navegador pede para autorizar o arquivo de novo (botão “Reconectar”).

## Opcional: servidor local (avançado)

Quem tem Node.js pode dar duplo clique em `iniciar.bat`: ele abre a página em `http://localhost:8765` e salva o estoque em `estoque.json` na pasta, automaticamente e sem pedir permissão. Esse arquivo não vai para o git.

Para gerar o arquivo único: `node tools/gerar-arquivo-unico.js` (cria `dist/pw-crafting.html`).

## Créditos e avisos

- Receitas, itens e ícones: [pwdatabase.com](https://www.pwdatabase.com/br/npc/15494).
- Dusk, boss e dificuldade dos drops: [Tabelas do Palácio do Crepúsculo](https://wikipw.com.br/index.php/Tabelas_do_Pal%C3%A1cio_do_Crep%C3%BAsculo), da Wiki PW (wikipw.com.br), por **IronfreaK**.
- Projeto de fã, sem vínculo com a Perfect World ou seus detentores. Ícones e nomes pertencem aos respectivos donos.

Detalhes técnicos e decisões do projeto: veja [CLAUDE.md](CLAUDE.md).
