(function () {
  const { items, recipes } = window.DATA;
  const TABS = ["I", "II", "III", "IV", "V", "VI"];
  const calc = window.PWCalc.criar(recipes);
  const recipeByOutput = calc.porSaida;

  const { drops, semDrop } = window.DROPS;
  const dropsPorItem = new Map();
  for (const d of drops) {
    if (d.itemId == null) continue;
    if (!dropsPorItem.has(d.itemId)) dropsPorItem.set(d.itemId, []);
    dropsPorItem.get(d.itemId).push(d);
  }
  const ICONES = window.ICONES || {}; // preenchido só no arquivo único (tools/gerar-arquivo-unico.js)
  const icone = (id, tam) => '<img class="ic" style="width:' + tam + 'px;height:' + tam + 'px" src="' +
    (ICONES[id] || "icons/" + id + ".png") + '" alt="" onerror="this.style.visibility=\'hidden\'">';
  const nome = id => (items[id] ? items[id].nome : "Item " + id);
  const el = id => document.getElementById(id);
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

  let tabAtiva = TABS.find(t => recipes.some(r => r.aba === t)) || "I";
  let selecionada = null;

  // ---------- Estoque e planos (salvos no navegador) ----------
  const CHAVE = "pw-crafting:v1";
  let estado = { estoque: {}, planos: [] }; // estoque: { itemId: qtd } (materiais, Almas e armas prontas)
  let salvoOk = true;

  function sanear(obj) {
    const est = {}, planos = [];
    for (const [k, v] of Object.entries((obj && obj.estoque) || {})) {
      const n = Math.floor(Number(v));
      if (Number.isFinite(n) && n > 0 && items[k]) est[k] = n;
    }
    for (const p of (obj && obj.planos) || []) {
      const arma = Number(p.arma), qtd = Math.floor(Number(p.qtd)) || 1;
      if (recipeByOutput.has(arma) && !planos.some(x => x.arma === arma)) planos.push({ arma, qtd: Math.max(1, qtd) });
    }
    return { estoque: est, planos };
  }
  // Onde salva (escolhido automaticamente):
  //  "servidor"  - aberto por iniciar.bat/tools/servidor.js (opcional) -> estoque.json na pasta do projeto
  //  "arquivo"   - Chrome/Edge: o usuário escolhe um .json uma vez; gravamos nele (API de acesso a arquivos)
  //  "navegador" - localStorage (padrão; funciona em qualquer navegador, inclusive abrindo o index.html direto)
  let modo = "navegador";
  let handle = null;            // arquivo escolhido (modo "arquivo")
  let paraReconectar = null;    // arquivo lembrado cujo acesso precisa ser autorizado de novo (1 clique)
  const temFS = typeof window.showSaveFilePicker === "function";
  const emLocalhost = location.protocol !== "file:" && ["localhost", "127.0.0.1"].includes(location.hostname);

  // O handle do arquivo escolhido fica guardado no IndexedDB para lembrar entre sessões.
  const idb = () => new Promise((ok, erro) => {
    const q = indexedDB.open("pw-crafting", 1);
    q.onupgradeneeded = () => q.result.createObjectStore("h");
    q.onsuccess = () => ok(q.result);
    q.onerror = () => erro(q.error);
  });
  async function idbGet() {
    try {
      const db = await idb();
      return await new Promise((ok, erro) => { const r = db.transaction("h").objectStore("h").get("estoque"); r.onsuccess = () => ok(r.result); r.onerror = () => erro(r.error); });
    } catch (e) { return null; }
  }
  async function idbSet(v) {
    try {
      const db = await idb();
      await new Promise((ok, erro) => {
        const tx = db.transaction("h", "readwrite");
        if (v) tx.objectStore("h").put(v, "estoque"); else tx.objectStore("h").delete("estoque");
        tx.oncomplete = ok; tx.onerror = () => erro(tx.error);
      });
    } catch (e) { /* sem IndexedDB: só não lembra o arquivo */ }
  }
  const comoArquivo = () => JSON.stringify({ app: "pw-crafting", versao: 1, salvoEm: new Date().toISOString(), ...estado }, null, 2);
  async function lerHandle(h) {
    const t = await (await h.getFile()).text();
    return t.trim() ? sanear(JSON.parse(t)) : null;
  }
  async function gravarHandle() {
    const w = await handle.createWritable();
    await w.write(comoArquivo());
    await w.close();
  }
  // Liga o modo "arquivo" a um arquivo já autorizado. Se o arquivo já tem dados diferentes dos atuais, pergunta qual vale.
  async function conectar(h) {
    const doArquivo = await lerHandle(h);
    const temAtual = Object.keys(estado.estoque).length > 0 || estado.planos.length > 0;
    let usar = doArquivo;
    if (doArquivo && temAtual && JSON.stringify(doArquivo) !== JSON.stringify(estado)) {
      usar = confirm("Este arquivo já tem dados diferentes dos que estão na tela.\n\nOK = carregar os dados do arquivo.\nCancelar = manter os dados da tela e sobrescrever o arquivo.") ? doArquivo : null;
    }
    if (usar) estado = usar;
    handle = h; modo = "arquivo"; paraReconectar = null; salvoOk = true;
    await idbSet(h);
    if (!usar) await gravarHandle();
  }
  async function escolherArquivo() {
    try {
      const h = await window.showSaveFilePicker({
        suggestedName: "pw-crafting-estoque.json",
        types: [{ description: "Estoque do PW Crafting", accept: { "application/json": [".json"] } }],
      });
      await conectar(h);
    } catch (e) { if (e.name !== "AbortError") { salvoOk = false; alert("Não consegui usar este arquivo: " + e.message); } }
    atualizar();
  }
  async function reconectar() {
    try {
      if ((await paraReconectar.requestPermission({ mode: "readwrite" })) === "granted") await conectar(paraReconectar);
    } catch (e) { salvoOk = false; }
    atualizar();
  }
  async function desconectar() {
    handle = null; modo = "navegador"; await idbSet(null);
    salvar(); atualizar();
  }

  async function carregar() {
    if (emLocalhost) {
      try {
        const r = await fetch("api/estoque", { cache: "no-store" });
        if (r.ok && r.headers.get("X-PW-Crafting")) { estado = sanear(await r.json()); modo = "servidor"; return; }
      } catch (e) { /* sem servidor: segue para os outros modos */ }
    }
    if (temFS) {
      const h = await idbGet();
      if (h) {
        try {
          if ((await h.queryPermission({ mode: "readwrite" })) === "granted") {
            const d = await lerHandle(h);
            if (d) estado = d;
            handle = h; modo = "arquivo"; return;
          }
          paraReconectar = h; // precisa de um clique do usuário para autorizar de novo
        } catch (e) { /* arquivo movido/apagado: cai no navegador */ }
      }
    }
    try { const t = localStorage.getItem(CHAVE); if (t) estado = sanear(JSON.parse(t)); }
    catch (e) { salvoOk = false; }
  }

  let tSalvar = null;
  async function gravarFora(rapido) {
    tSalvar = null;
    try {
      if (modo === "servidor") {
        const r = await fetch("api/estoque", {
          method: "PUT", keepalive: !!rapido,
          headers: { "Content-Type": "application/json", "X-PW-Crafting": "1" },
          body: JSON.stringify(estado),
        });
        salvoOk = r.ok;
      } else { await gravarHandle(); salvoOk = true; }
    } catch (e) { salvoOk = false; }
    mostrarStatus();
  }
  function salvar() {
    if (modo === "servidor" || modo === "arquivo") {
      clearTimeout(tSalvar);
      tSalvar = setTimeout(gravarFora, 250);
      return;
    }
    try { localStorage.setItem(CHAVE, JSON.stringify(estado)); salvoOk = true; }
    catch (e) { salvoOk = false; }
    mostrarStatus();
  }
  // não perde a última digitação ao fechar a página
  window.addEventListener("pagehide", () => { if (tSalvar) { clearTimeout(tSalvar); gravarFora(true); } });
  function mostrarStatus() {
    const n = document.getElementById("statusSalvo");
    if (!n) return;
    if (!salvoOk) { n.className = "aviso"; n.textContent = "Atenção: não consegui salvar. Use “Exportar” para não perder os dados."; return; }
    n.className = "";
    n.textContent = modo === "servidor" ? "Salvo em estoque.json (pasta do projeto)."
      : modo === "arquivo" ? "Salvo no arquivo “" + handle.name + "”."
      : paraReconectar ? "Autorize o arquivo “" + paraReconectar.name + "” para voltar a salvar nele. Enquanto isso, salvo só neste navegador."
      : "Salvo só neste navegador." + (temFS ? " Você pode escolher um arquivo para salvar." : "");
  }
  const tenho = id => estado.estoque[id] || 0;
  function setTenho(id, n) {
    n = Math.max(0, Math.floor(Number(n)) || 0);
    if (n) estado.estoque[id] = n; else delete estado.estoque[id];
    salvar();
  }
  const inputEstoque = id =>
    '<input type="number" min="0" step="1" class="est" data-id="' + id + '" data-key="e:' + id + '" placeholder="0" value="' +
    (tenho(id) || "") + '">';

  // ---------- Abas e grade ----------
  function renderTabs() {
    el("tabs").innerHTML = "";
    for (const t of TABS) {
      const b = document.createElement("button");
      b.className = "tab" + (t === tabAtiva ? " active" : "") + (recipes.some(r => r.aba === t) ? "" : " empty");
      b.textContent = t;
      b.onclick = () => { tabAtiva = t; renderTabs(); renderGrid(); };
      el("tabs").appendChild(b);
    }
  }

  function renderGrid() {
    const g = el("grid");
    g.innerHTML = "";
    const doTab = recipes.filter(r => r.aba === tabAtiva);
    // receitas com 'slot' (1-32) ficam na posição do jogo; sem 'slot', em sequência
    const porSlot = new Map();
    let seq = 1;
    for (const r of doTab) porSlot.set(r.slot || seq++, r);
    for (let i = 0; i < 32; i++) { // 8x4 como no jogo
      const r = porSlot.get(i + 1);
      const b = document.createElement("button");
      if (r) {
        const noPlano = estado.planos.some(p => p.arma === r.saida);
        b.className = "slot weapon" + (r.saida === selecionada ? " selected" : "") + (noPlano ? " plano" : "");
        b.innerHTML = icone(r.saida, 32) + '<span class="lv">' + r.nivel + "</span>";
        b.title = nome(r.saida) + " (Nv " + r.nivel + ")" + (noPlano ? " — no plano" : "");
        b.onclick = () => selecionar(r.saida);
      } else {
        b.className = "slot";
        b.disabled = true;
      }
      g.appendChild(b);
    }
  }

  function matHTML(item, qtd, soul) {
    return '<div class="mat' + (soul ? " soul" : "") + '"><div class="ico" title="' + esc(nome(item)) + '">' + icone(item, 32) +
           '</div><div class="mnome">' + nome(item) + '</div><div class="qtd">' + qtd + "</div></div>";
  }

  function renderDetail() {
    const d = el("detail");
    const r = recipeByOutput.get(selecionada);
    if (!r) { d.innerHTML = '<p class="hint">Selecione uma arma.</p>'; return; }
    const mats = r.materiais.map(m => matHTML(m.item, m.qtd, false)).join("") +
                 r.almas.map(al => matHTML(al.item, 1, true)).join("");
    const noPlano = estado.planos.some(p => p.arma === r.saida);
    d.innerHTML = "<strong>" + nome(r.saida) + "</strong> (Nv " + r.nivel + ")" +
      '<div class="mats">' + mats + "</div>" +
      '<div class="req">' + (r.requer
        ? "Requer: " + r.requer.profissao + " Nív " + r.requer.nivel
        : "Requer: ? (não informado)") + "</div>" +
      '<button class="btn" data-acao="' + (noPlano ? "tirar" : "plano") + '" data-arma="' + r.saida + '">' +
      (noPlano ? "✕ Tirar do plano" : "＋ Adicionar ao plano") + "</button>";
  }

  // ---------- Planos ----------
  function renderPlanos() {
    const c = el("planos");
    const sims = calc.simularPlanos(estado.estoque, estado.planos);
    let html = "<h2>Planos <span class=\"sub\">(prioridade de cima para baixo)</span></h2>";
    if (!estado.planos.length) {
      html += '<p class="hint">Nenhuma arma no plano. Selecione uma arma e use “Adicionar ao plano”: o estoque será dividido entre os planos, na ordem, sem contar o mesmo item duas vezes.</p>';
    } else {
      html += '<ol class="lista-planos">';
      estado.planos.forEach((p, i) => {
        const pc = Math.round(calc.pct(sims[i].linhas) * 100);
        html += '<li class="' + (p.arma === selecionada ? "sel" : "") + '">' +
          '<button class="link" data-acao="abrir" data-arma="' + p.arma + '">' + icone(p.arma, 24) + nome(p.arma) + "</button>" +
          '<span class="x">×</span><input type="number" min="1" step="1" class="pq" data-arma="' + p.arma + '" data-key="p:' + p.arma + '" value="' + p.qtd + '">' +
          '<span class="pc" title="Quanto do que falta já está no estoque (já descontados os planos acima)">' + pc + "%</span>" +
          '<span class="bar mini"><i style="width:' + pc + '%"></i></span>' +
          '<button class="ic-btn" data-acao="subir" data-arma="' + p.arma + '"' + (i === 0 ? " disabled" : "") + ' title="Subir prioridade">▲</button>' +
          '<button class="ic-btn" data-acao="descer" data-arma="' + p.arma + '"' + (i === estado.planos.length - 1 ? " disabled" : "") + ' title="Descer prioridade">▼</button>' +
          '<button class="ic-btn" data-acao="tirar" data-arma="' + p.arma + '" title="Remover do plano">✕</button></li>';
      });
      html += "</ol>";
    }
    html += '<div class="barra-estoque"><button class="btn" data-acao="exportar">Exportar estoque</button>' +
      '<button class="btn" data-acao="importar">Importar</button>' +
      '<button class="btn perigo" data-acao="limpar">Limpar tudo</button>' +
      '<input type="file" id="arqImport" accept="application/json,.json" hidden></div>';
    if (modo !== "servidor" && temFS) {
      html += '<div class="barra-estoque">' +
        (paraReconectar ? '<button class="btn destaque" data-acao="reconectar">Reconectar a “' + esc(paraReconectar.name) + '”</button>' : "") +
        (modo === "arquivo" ? '<button class="btn" data-acao="desconectar">Parar de usar o arquivo</button>'
          : paraReconectar ? "" : '<button class="btn" data-acao="escolherArquivo">Salvar em arquivo…</button>') + "</div>";
    }
    html += '<p class="hint peq"><span id="statusSalvo"></span> “Exportar” gera um backup para guardar ou levar a outro navegador.</p>';
    c.innerHTML = html;
    const arq = el("arqImport");
    arq.onchange = () => lerArquivo(arq.files[0]);
    mostrarStatus();
  }

  function exportar() {
    const dados = { app: "pw-crafting", versao: 1, exportadoEm: new Date().toISOString(), ...estado };
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" }));
    a.download = "pw-crafting-estoque-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function lerArquivo(f) {
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const novo = sanear(JSON.parse(rd.result));
        const n = Object.keys(novo.estoque).length;
        if (!confirm("Substituir o estoque e os planos atuais por este arquivo (" + n + " itens, " + novo.planos.length + " planos)?")) return;
        estado = novo; salvar(); atualizar();
      } catch (e) { alert("Arquivo inválido: " + e.message); }
    };
    rd.readAsText(f);
  }

  function acao(a, arma) {
    const i = estado.planos.findIndex(p => p.arma === arma);
    if (a === "plano" && i < 0) estado.planos.push({ arma, qtd: 1 });
    else if (a === "tirar" && i >= 0) estado.planos.splice(i, 1);
    else if (a === "subir" && i > 0) [estado.planos[i - 1], estado.planos[i]] = [estado.planos[i], estado.planos[i - 1]];
    else if (a === "descer" && i >= 0 && i < estado.planos.length - 1) [estado.planos[i + 1], estado.planos[i]] = [estado.planos[i], estado.planos[i + 1]];
    else if (a === "abrir") { selecionar(arma, true); return; }
    else if (a === "exportar") { exportar(); return; }
    else if (a === "importar") { el("arqImport").click(); return; }
    else if (a === "escolherArquivo") { escolherArquivo(); return; }
    else if (a === "reconectar") { reconectar(); return; }
    else if (a === "desconectar") { desconectar(); return; }
    else if (a === "limpar") {
      if (!confirm("Apagar TODO o estoque e os planos deste navegador? (Exporte antes se quiser guardar.)")) return;
      estado = { estoque: {}, planos: [] };
    } else return;
    salvar();
    atualizar();
  }

  // ---------- Cadeia de Almas ----------
  function renderChain(sim) {
    const c = el("chain");
    const cadeia = calc.cadeia(selecionada, sim.qtd);
    if (!cadeia.length) return;
    let html = "<h2>Cadeia de Almas</h2>";
    if (sim.qtd > 1) html += '<p class="hint">Calculado para ' + sim.qtd + " unidades da arma.</p>";
    cadeia.forEach(({ r, n }, i) => {
      const construir = sim.builds.get(r.saida) || 0;
      const topo = r.saida === selecionada;
      const x = n > 1 ? " ×" + n : "";
      const estado_ = construir === 0 ? '<span class="tag ok">✔ coberta pelo estoque</span>'
        : construir < n ? '<span class="tag">construir ' + construir + " de " + n + "</span>" : "";
      html += '<div class="step' + (construir === 0 ? " coberta" : "") + '"><h3>' + icone(r.saida, 24) + (i + 1) + ". " +
        nome(r.saida) + " (Nv " + r.nivel + ")" + x + " " + estado_ + "</h3>";
      if (!topo) html += '<div class="pronta">Tenho pronta: ' + inputEstoque(r.saida) + "</div>";
      if (construir > 0) {
        html += "<ul>";
        for (const m of r.materiais) html += "<li>" + icone(m.item, 20) + m.qtd * construir + "× " + nome(m.item) + "</li>";
        for (const al of r.almas) {
          const usada = sim.almasUsadas.get(al.item) || 0;
          html += '<li class="soul">' + icone(al.item, 20) + construir + "× " + nome(al.item) +
            ' <span class="tenho-alma">tenho ' + inputEstoque(al.item) + "</span>" +
            (usada ? ' <span class="dif">(usando ' + usada + " do estoque)</span>" : "") + "</li>";
        }
        html += "</ul>";
        if (r.almas.length) html += '<div class="note">Almas obtidas quebrando: ' + r.almas.map(al => nome(al.deArma)).join(", ") + ".</div>";
        else html += '<div class="note">Primeira arma da linha (sem Alma).</div>';
      }
      html += "</div>";
    });
    c.innerHTML = html;
  }

  // ---------- Total de materiais ----------
  const ehComum = fontes => fontes.length > 0 && fontes.every(f => f.boss.startsWith("Boss"));
  const raridadeDe = item => {
    const f = dropsPorItem.get(item) || [];
    return f.some(d => d.raridade === "gold") ? "gold" : f.some(d => d.raridade === "red") ? "red" : "normal";
  };
  // gold sempre no topo, depois red, depois bosses específicos, comuns e Essência
  const grupo = item => ({ gold: -2, red: -1 })[raridadeDe(item)] ??
    (semDrop[item] ? 2 : ehComum(dropsPorItem.get(item) || []) ? 1 : 0);

  // Ordenação: null = ordem padrão (gold/red, bosses, comuns, Essência).
  let ordem = null; // { col, dir: 1 | -1 }
  const COLUNAS = [["item", "Item"], ["qtd", "Qtd"], ["tenho", "Tenho"], ["falta", "Falta"], ["pct", "Progresso"],
                   ["dusk", "Dusk"], ["boss", "Boss"], ["dif", "Dificuldade"]];
  const cmp = (x, y) => (x < y ? -1 : x > y ? 1 : 0);
  const pt = (x, y) => x.localeCompare(y, "pt-BR");

  // Chave de uma coluna; itens sem valor (Essência, sem fonte) ficam sempre no fim.
  function chave(e, col, dir) {
    if (col === "item") return nome(e.item);
    if (col === "qtd") return e.need;
    if (col === "tenho") return tenho(e.item);
    if (col === "falta") return e.need - e.uso;
    if (col === "pct") return e.uso / e.need;
    const vals = { dusk: e.fontes.map(f => f.dusk), boss: e.fontes.map(f => f.boss), dif: e.fontes.map(f => f.qtdeBoss) }[col];
    if (!vals.length) return null;
    const s = [...vals].sort(pt);
    return dir > 0 ? s[0] : s[s.length - 1];
  }
  function ordenar(lista) {
    if (!ordem) return lista.sort((a, b) => grupo(a.item) - grupo(b.item) || pt(nome(a.item), nome(b.item)));
    const { col, dir } = ordem;
    return lista.sort((a, b) => {
      const ka = chave(a, col, dir), kb = chave(b, col, dir);
      if (ka === null || kb === null) return ka === kb ? pt(nome(a.item), nome(b.item)) : ka === null ? 1 : -1;
      const r = typeof ka === "number" ? cmp(ka, kb) : pt(ka, kb);
      return dir * r || pt(nome(a.item), nome(b.item));
    });
  }
  function ordenarPor(col) {
    ordem = ordem && ordem.col === col
      ? (ordem.dir === 1 ? { col, dir: -1 } : null) // 1º clique A→Z, 2º Z→A, 3º volta ao padrão
      : { col, dir: 1 };
    renderMateriais();
  }

  let simAtual = null;
  function renderMateriais() {
    const c = el("materiais");
    const sim = simAtual;
    if (!sim) return;
    const lista = ordenar(sim.linhas.map(l => ({ ...l, fontes: dropsPorItem.get(l.item) || [] })));
    const totNeed = sim.linhas.reduce((s, l) => s + l.need, 0);
    const totUso = sim.linhas.reduce((s, l) => s + l.uso, 0);
    const geral = totNeed ? Math.round(totUso / totNeed * 100) : 100;
    const origem = sim.noPlano
      ? "Plano nº " + (estado.planos.findIndex(p => p.arma === selecionada) + 1) + " de " + estado.planos.length + " — usa o que sobrou dos planos anteriores"
      : "Fora dos planos — usa só o estoque livre (o que os planos não reservam)";
    let html = '<div class="mat-topo"><h2>Total de materiais</h2>' +
      (ordem ? '<button class="reset" id="resetOrdem">↺ Ordem padrão</button>' : "") + "</div>" +
      '<div class="geral"><span class="bar"><i style="width:' + geral + '%"></i></span> <b>' + geral + "%</b> " +
      '<span class="dif">(' + totUso + " de " + totNeed + " unidades)" + (sim.qtd > 1 ? " · " + sim.qtd + " unidades da arma" : "") +
      " · " + origem + "</span></div><table><tr>";
    for (const [col, rotulo] of COLUNAS) {
      const seta = ordem && ordem.col === col ? (ordem.dir === 1 ? " ▲" : " ▼") : "";
      html += '<th class="sort" data-col="' + col + '">' + rotulo + seta + "</th>";
    }
    html += "</tr>";
    for (const e of lista) {
      const { item, need, uso, disponivel } = e;
      let fontes = e.fontes;
      const rar = raridadeDe(item);
      if (ehComum(fontes)) { // comuns: uma linha só, com todas as dusks juntas
        const uniq = a => [...new Set(a)];
        fontes = [{ dusk: uniq(fontes.map(f => f.dusk)).join(", "), boss: "Boss, Baú",
                    qtdeBoss: uniq(fontes.map(f => f.qtdeBoss)).join(", ") }];
      }
      const n = Math.max(fontes.length, 1);
      const falta = need - uso, pc = Math.round(uso / need * 100);
      const livre = disponivel < tenho(item) ? ' <span class="dif" title="Parte do estoque está reservada para planos anteriores">(livre ' + disponivel + ")</span>" : "";
      for (let i = 0; i < n; i++) {
        html += '<tr class="' + (rar === "normal" ? "" : rar) + (falta === 0 ? " completo" : "") + '">';
        if (i === 0) {
          const tip = semDrop[item] ? ' title="' + esc(semDrop[item]) + '"' : "";
          const rs = ' rowspan="' + n + '"';
          html += "<td" + rs + tip + ">" + icone(item, 24) + nome(item) + "</td>" +
                  "<td" + rs + ' class="num">' + need + "</td>" +
                  "<td" + rs + ' class="num">' + inputEstoque(item) + livre + "</td>" +
                  "<td" + rs + ' class="num falta">' + (falta === 0 ? "✔" : falta) + "</td>" +
                  "<td" + rs + ' class="prog"><span class="bar mini"><i style="width:' + pc + '%"></i></span> ' + pc + "%</td>";
        }
        if (fontes[i]) {
          html += '<td class="dusk">' + fontes[i].dusk + "</td><td>" + fontes[i].boss +
                  '</td><td class="dif">' + fontes[i].qtdeBoss + "</td>";
        } else {
          html += '<td class="dusk">—</td><td>—</td><td class="dif">' + (semDrop[item] ? "—" : "sem fonte cadastrada") + "</td>";
        }
        html += "</tr>";
      }
    }
    c.innerHTML = html + "</table>";
    c.querySelectorAll("th.sort").forEach(th => { th.onclick = () => ordenarPor(th.dataset.col); });
    const reset = el("resetOrdem");
    if (reset) reset.onclick = () => { ordem = null; renderMateriais(); };
  }

  // ---------- Orquestração ----------
  function renderTudo() {
    renderGrid();
    renderPlanos();
    if (selecionada == null) return;
    simAtual = calc.simular(estado.estoque, estado.planos, selecionada);
    renderDetail();
    renderChain(simAtual);
    renderMateriais();
  }
  // Re-renderiza preservando o campo em edição (para poder digitar/tabular sem perder o foco).
  function atualizar() {
    const a = document.activeElement;
    const key = a && a.dataset ? a.dataset.key : null;
    renderTudo();
    if (key) {
      const n = document.querySelector('[data-key="' + key + '"]');
      if (n) { n.focus(); try { n.setSelectionRange(n.value.length, n.value.length); } catch (e) { /* number */ } }
    }
  }
  function selecionar(id, trocarAba) {
    selecionada = id;
    if (trocarAba) { tabAtiva = recipeByOutput.get(id).aba; renderTabs(); }
    renderTudo();
  }

  let timer = null;
  document.addEventListener("input", e => {
    const t = e.target;
    if (t.classList.contains("est")) setTenho(t.dataset.id, t.value);
    else if (t.classList.contains("pq")) {
      const p = estado.planos.find(x => x.arma === Number(t.dataset.arma));
      if (p) { p.qtd = Math.max(1, Math.floor(Number(t.value)) || 1); salvar(); }
    } else return;
    clearTimeout(timer);
    timer = setTimeout(atualizar, 350); // espera parar de digitar
  });
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-acao]");
    if (b) acao(b.dataset.acao, Number(b.dataset.arma));
  });

  // ---------- Cabeçalho: menu "Dusk" -> Arma | Drops ----------
  const VIEWS = { arma: "Arma", drops: "Drops" };
  const btnDusk = el("btnDusk"), listaDusk = el("listaDusk");
  function menu(abrir) {
    listaDusk.hidden = !abrir;
    btnDusk.setAttribute("aria-expanded", String(abrir));
  }
  function mostrarView(v, guardar) {
    if (!VIEWS[v]) v = "arma";
    el("view-arma").hidden = v !== "arma";
    el("view-drops").hidden = v !== "drops";
    el("viewAtual").textContent = "Dusk › " + VIEWS[v];
    listaDusk.querySelectorAll("[data-view]").forEach(b => {
      if (b.dataset.view === v) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    if (v === "drops") window.PaginaDrops.render(el("dropsPagina"));
    if (guardar) { try { history.replaceState(null, "", "#" + v); } catch (e) { /* ignora */ } }
    menu(false);
    window.scrollTo(0, 0);
  }
  btnDusk.addEventListener("click", () => menu(listaDusk.hidden));
  listaDusk.addEventListener("click", e => { const b = e.target.closest("[data-view]"); if (b) mostrarView(b.dataset.view, true); });
  document.addEventListener("click", e => { if (!e.target.closest(".dropdown")) menu(false); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !listaDusk.hidden) { menu(false); btnDusk.focus(); } });
  window.addEventListener("hashchange", () => mostrarView(location.hash.slice(1), false));

  renderTabs();
  renderGrid();
  renderPlanos();
  mostrarView(location.hash.slice(1), false); // abre na view do endereço (#drops) ou em "Arma"
  carregar().then(atualizar); // carrega o estoque salvo e redesenha
})();
