// Página "Drops": as tabelas do Palácio do Crepúsculo (Wiki PW) em formato de planilha.
// Escolha uma dusk (1-1 ... 3-3) para ver só os bosses e drops daquela coluna, ou o capítulo completo.
(function () {
  const D = window.DROPS;
  const ICONES = window.ICONES || {};
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  let sel = "1-1"; // "1-1".."3-3" ou "cap-1".."cap-3"

  const icone = id => id == null
    ? '<span class="ic vazio" title="sem ícone no banco"></span>'
    : '<img class="ic" style="width:24px;height:24px" src="' + (ICONES[id] || "icons/" + id + ".png") + '" alt="" onerror="this.style.visibility=\'hidden\'">';

  // cor do nome, como nas imagens da wiki: verde = normal, amarelo = gold, vermelho = red dusk, azul = Boss, Baú
  const cor = (it, comum) => comum ? "azul" : it.raridade === "gold" ? "gold" : it.raridade === "red" ? "red" : "verde";
  const comum = b => b.boss.startsWith("Boss");

  function drops(lista, ehComum) {
    if (!lista.length) return '<span class="nada">Nada</span>';
    return lista.map(it => '<div class="drop ' + cor(it, ehComum) + '">' + icone(it.itemId) +
      "<span>" + esc(it.item) + " (" + it.nivelItem + ")</span></div>").join("");
  }

  function celBoss(b) {
    const c = comum(b);
    return '<td class="boss ' + (c ? "azul" : "red") + '">' + esc(b.boss) + "</td><td>" + b.modo + "</td><td>" + b.qtdeBoss + "</td>";
  }

  function tabela(cap) {
    const info = D.capitulos[cap];
    const bosses = D.bosses.filter(b => String(b.capitulo) === String(cap));
    const completo = String(sel).startsWith("cap-");
    const dif = completo ? null : Number(sel.split("-")[1]);
    const titulo = "Capítulo " + cap + ": " + info.nome + (completo ? "" : " — Dusk " + sel + " · " + info.dificuldades[dif - 1]);
    let h = '<div class="planilha cap' + cap + '"><div class="cap-titulo">' + esc(titulo) + "</div><table><thead><tr>" +
      "<th>Boss</th><th>Modo</th><th>Qtde Boss</th>";
    if (completo) info.dificuldades.forEach((n, i) => { h += "<th>" + (i + 1) + " · " + esc(n) + "</th>"; });
    else h += "<th>Drops · " + esc(info.dificuldades[dif - 1]) + "</th>";
    h += "</tr></thead><tbody>";
    for (const b of bosses) {
      h += "<tr>" + celBoss(b);
      if (completo) for (const d of ["1", "2", "3"]) h += '<td class="itens">' + drops(b.dusks[d], comum(b)) + "</td>";
      else h += '<td class="itens">' + drops(b.dusks[dif], comum(b)) + "</td>";
      h += "</tr>";
    }
    h += "</tbody></table></div>" +
      '<p class="nota">Quantidade de Boss “Alta” no Capítulo ' + cap + " gasta " + info.essenciaPorBossAlta +
      " Essência" + (info.essenciaPorBossAlta > 1 ? "s" : "") + " do Crepúsculo.</p>";
    return h;
  }

  function seletor() {
    let h = '<div class="seletor">';
    for (const cap of ["1", "2", "3"]) {
      const info = D.capitulos[cap];
      h += '<div class="seletor-cap cap' + cap + '"><span class="seletor-nome">Capítulo ' + cap + " · " + esc(info.nome) + "</span>";
      info.dificuldades.forEach((n, i) => {
        const id = cap + "-" + (i + 1);
        h += '<button class="chip' + (sel === id ? " ativo" : "") + '" data-sel="' + id + '" title="' + esc(n) + '">' + id +
          '<small>' + esc(n.replace(/\s*\(.*\)/, "")) + "</small></button>";
      });
      h += '<button class="chip completo' + (sel === "cap-" + cap ? " ativo" : "") + '" data-sel="cap-' + cap + '">Completo</button></div>';
    }
    return h + "</div>";
  }

  function render(container) {
    const cap = String(sel).startsWith("cap-") ? sel.slice(4) : sel.split("-")[0];
    container.innerHTML = "<h2>Drops do Palácio do Crepúsculo</h2>" +
      '<p class="hint">Escolha a dusk para ver só os bosses e drops dela, ou “Completo” para o capítulo inteiro.</p>' +
      seletor() + tabela(cap);
    container.querySelectorAll("[data-sel]").forEach(b => { b.onclick = () => { sel = b.dataset.sel; render(container); }; });
  }

  window.PaginaDrops = { render };
})();
