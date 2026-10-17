(function () {
  const { items, recipes } = window.DATA;
  const TABS = ["I", "II", "III", "IV", "V", "VI"];

  const recipeByOutput = new Map(recipes.map(r => [r.saida, r]));
  const { drops, semDrop } = window.DROPS;
  const dropsPorItem = new Map();
  for (const d of drops) {
    if (d.itemId == null) continue;
    if (!dropsPorItem.has(d.itemId)) dropsPorItem.set(d.itemId, []);
    dropsPorItem.get(d.itemId).push(d);
  }
  const icone = (id, tam) => '<img class="ic" style="width:' + tam + 'px;height:' + tam + 'px" src="icons/' + id +
    '.png" alt="" onerror="this.style.visibility=\'hidden\'">';
  const nome = id => (items[id] ? items[id].nome : "Item " + id);

  let tabAtiva = TABS.find(t => recipes.some(r => r.aba === t)) || "I";
  let selecionada = null;

  const el = id => document.getElementById(id);

  // Sobe a cadeia de Almas. Cada Alma consumida exige construir e quebrar UMA arma, então a mesma
  // arma pode precisar ser construída várias vezes (ex.: duas bestas pedem a mesma Alma).
  // Retorna [{ r: receita, n: quantas vezes construir }] em ordem de construção (nível mais baixo primeiro).
  function resolverCadeia(armaId) {
    const contagem = new Map(); // ordem de inserção = ordem de descoberta
    (function somar(id, n) {
      const r = recipeByOutput.get(id);
      if (!r) return;
      contagem.set(id, (contagem.get(id) || 0) + n);
      for (const a of r.almas) somar(a.deArma, n);
    })(armaId, 1);
    return [...contagem].map(([id, n]) => ({ r: recipeByOutput.get(id), n }))
      .sort((x, y) => x.r.nivel - y.r.nivel);
  }

  function totalizar(cadeia) {
    const total = new Map();
    for (const { r, n } of cadeia) {
      for (const m of r.materiais) total.set(m.item, (total.get(m.item) || 0) + m.qtd * n);
    }
    return total;
  }

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
    const total = 32; // 8x4 como no jogo
    // receitas com 'slot' (1-32) ficam na posição do jogo; sem 'slot', em sequência
    const porSlot = new Map();
    let seq = 1;
    for (const r of doTab) porSlot.set(r.slot || seq++, r);
    for (let i = 0; i < total; i++) {
      const r = porSlot.get(i + 1);
      const b = document.createElement("button");
      if (r) {
        b.className = "slot weapon" + (r.saida === selecionada ? " selected" : "");
        b.innerHTML = icone(r.saida, 32) + '<span class="lv">' + r.nivel + "</span>";
        b.title = nome(r.saida) + " (Nv " + r.nivel + ")";
        b.onclick = () => selecionar(r.saida);
      } else {
        b.className = "slot";
        b.disabled = true;
      }
      g.appendChild(b);
    }
  }

  function matHTML(item, qtd, soul) {
    return '<div class="mat' + (soul ? " soul" : "") + '"><div class="ico" title="' + nome(item) + '">' + icone(item, 32) +
           '</div><div class="mnome">' + nome(item) + '</div><div class="qtd">' + qtd + "</div></div>";
  }

  function renderDetail() {
    const d = el("detail");
    const r = recipeByOutput.get(selecionada);
    if (!r) { d.innerHTML = '<p class="hint">Selecione uma arma.</p>'; return; }
    const mats = r.materiais.map(m => matHTML(m.item, m.qtd, false)).join("") +
                 r.almas.map(al => matHTML(al.item, 1, true)).join("");
    d.innerHTML = "<strong>" + nome(r.saida) + "</strong> (Nv " + r.nivel + ")" +
      '<div class="mats">' + mats + "</div>" +
      '<div class="req">' + (r.requer
        ? "Requer: " + r.requer.profissao + " Nív " + r.requer.nivel
        : "Requer: ? (não informado)") + "</div>";
  }

  function renderChain() {
    const c = el("chain");
    const cadeia = resolverCadeia(selecionada);
    if (!cadeia.length) return;
    let html = "<h2>Cadeia de Almas</h2>";
    cadeia.forEach(({ r, n }, i) => {
      const x = n > 1 ? " ×" + n : "";
      html += '<div class="step"><h3>' + icone(r.saida, 24) + (i + 1) + ". " + nome(r.saida) + " (Nv " + r.nivel + ")" + x + "</h3><ul>";
      for (const m of r.materiais) html += "<li>" + icone(m.item, 20) + m.qtd * n + "× " + nome(m.item) + "</li>";
      for (const al of r.almas) html += '<li class="soul">' + icone(al.item, 20) + n + "× " + nome(al.item) + "</li>";
      html += "</ul>";
      if (n > 1) html += '<div class="note">Construir ' + n + " vezes (cada Alma vem de uma arma quebrada). Valores já multiplicados.</div>";
      if (r.almas.length) html += '<div class="note">Almas obtidas quebrando: ' + r.almas.map(al => nome(al.deArma)).join(", ") + ".</div>";
      else html += '<div class="note">Primeira arma da linha (sem Alma).</div>';
      html += "</div>";
    });
    c.innerHTML = html;
  }

  const ehComum = fontes => fontes.length > 0 && fontes.every(f => f.boss.startsWith("Boss"));
  // 0 = drop de boss específico, 1 = comum (Boss, Baú), 2 = sem drop (Essência) sempre por último
  const raridadeDe = item => {
    const f = dropsPorItem.get(item) || [];
    return f.some(d => d.raridade === "gold") ? "gold" : f.some(d => d.raridade === "red") ? "red" : "normal";
  };
  // gold sempre no topo, depois red, depois bosses específicos, comuns e Essência
  const grupo = item => ({ gold: -2, red: -1 })[raridadeDe(item)] ??
    (semDrop[item] ? 2 : ehComum(dropsPorItem.get(item) || []) ? 1 : 0);

  // Ordenação do "Total de materiais": null = ordem padrão (gold/red, bosses, comuns, Essência).
  let ordem = null; // { col: "item"|"qtd"|"dusk"|"boss"|"dif", dir: 1 | -1 }
  const COLUNAS = [["item", "Item"], ["qtd", "Qtd"], ["dusk", "Dusk"], ["boss", "Boss"], ["dif", "Dificuldade"]];
  const cmp = (x, y) => (x < y ? -1 : x > y ? 1 : 0);
  const pt = (x, y) => x.localeCompare(y, "pt-BR");

  // Chave de ordenação de uma coluna; itens sem valor (Essência, sem fonte) ficam sempre no fim.
  function chave(e, col, dir) {
    if (col === "item") return nome(e.item);
    if (col === "qtd") return e.qtd;
    const vals = { dusk: e.fontes.map(f => f.dusk), boss: e.fontes.map(f => f.boss), dif: e.fontes.map(f => f.qtdeBoss) }[col];
    if (!vals.length) return null;
    const s = [...vals].sort(pt); // menor valor para crescente, maior para decrescente
    return dir > 0 ? s[0] : s[s.length - 1];
  }

  function ordenar(lista) {
    if (!ordem) {
      return lista.sort((a, b) => grupo(a.item) - grupo(b.item) || pt(nome(a.item), nome(b.item)));
    }
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

  function renderMateriais() {
    const c = el("materiais");
    const cadeia = resolverCadeia(selecionada);
    if (!cadeia.length) return;
    const lista = ordenar([...totalizar(cadeia)].map(([item, qtd]) => ({ item, qtd, fontes: dropsPorItem.get(item) || [] })));
    let html = '<div class="mat-topo"><h2>Total de materiais</h2>' +
      (ordem ? '<button class="reset" id="resetOrdem">↺ Ordem padrão</button>' : "") + "</div><table><tr>";
    for (const [col, rotulo] of COLUNAS) {
      const seta = ordem && ordem.col === col ? (ordem.dir === 1 ? " ▲" : " ▼") : "";
      html += '<th class="sort" data-col="' + col + '">' + rotulo + seta + "</th>";
    }
    html += "</tr>";
    for (const { item, qtd: q } of lista) {
      let fontes = dropsPorItem.get(item) || [];
      const rar = raridadeDe(item);
      if (ehComum(fontes)) {
        // comuns: uma linha só, com todas as dusks juntas
        const uniq = a => [...new Set(a)];
        fontes = [{ dusk: uniq(fontes.map(f => f.dusk)).join(", "), boss: "Boss, Baú",
                    qtdeBoss: uniq(fontes.map(f => f.qtdeBoss)).join(", ") }];
      }
      const n = Math.max(fontes.length, 1);
      for (let i = 0; i < n; i++) {
        html += rar === "normal" ? "<tr>" : '<tr class="' + rar + '">';
        if (i === 0) {
          const tip = semDrop[item] ? ' title="' + semDrop[item] + '"' : "";
          html += '<td rowspan="' + n + '"' + tip + ">" + icone(item, 24) + nome(item) + "</td>" +
                  '<td rowspan="' + n + '" class="num">' + q + "</td>";
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

  function selecionar(id) {
    selecionada = id;
    renderGrid();
    renderDetail();
    renderChain();
    renderMateriais();
  }

  renderTabs();
  renderGrid();
})();
