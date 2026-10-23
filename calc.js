// Lógica pura de cálculo (sem DOM): cadeia de Almas e distribuição do estoque entre os planos.
// Usada pelo app.js (window.PWCalc) e testável no Node (module.exports).
(function () {
  function criar(recipes) {
    const porSaida = new Map(recipes.map(r => [r.saida, r]));
    const somar = (m, k, v) => m.set(k, (m.get(k) || 0) + v);

    // Cadeia completa SEM estoque: cada Alma exige construir e quebrar UMA arma, então a mesma
    // arma pode precisar ser construída várias vezes. Retorna [{ r, n }] por nível crescente.
    function cadeia(armaId, qtd = 1) {
      const cont = new Map();
      (function subir(id, n) {
        const r = porSaida.get(id);
        if (!r) return;
        somar(cont, id, n);
        for (const a of r.almas) subir(a.deArma, n);
      })(armaId, qtd);
      return [...cont].map(([id, n]) => ({ r: porSaida.get(id), n })).sort((x, y) => x.r.nivel - y.r.nivel);
    }

    // Planeja `qtd` unidades de uma arma contra o estoque `disp` (Map id -> qtd), que é CONSUMIDO.
    // - Almas e armas prontas no estoque encurtam a cadeia (a arma que geraria a Alma não é construída).
    // - Materiais são alocados no fim: cada linha traz need (preciso), uso (coberto pelo estoque) e disponivel.
    function planejar(armaId, qtd, disp) {
      const builds = new Map(), mats = new Map(), almasUsadas = new Map(), armasUsadas = new Map();
      const tirar = (id, n) => {
        const k = Math.min(disp.get(id) || 0, n);
        if (k > 0) disp.set(id, disp.get(id) - k);
        return k;
      };
      (function precisa(id, n, topo) {
        const r = porSaida.get(id);
        if (!r || n <= 0) return;
        if (!topo) { // uma arma pronta pode ser quebrada para dar a Alma, sem construir de novo
          const k = tirar(id, n);
          if (k) { somar(armasUsadas, id, k); n -= k; }
        }
        if (n <= 0) return;
        somar(builds, id, n);
        for (const m of r.materiais) somar(mats, m.item, m.qtd * n);
        for (const a of r.almas) {
          const k = tirar(a.item, n);
          if (k) somar(almasUsadas, a.item, k);
          precisa(a.deArma, n - k, false);
        }
      })(armaId, qtd, true);
      const linhas = [...mats].map(([item, need]) => {
        const disponivel = disp.get(item) || 0;
        const uso = Math.min(disponivel, need);
        disp.set(item, disponivel - uso);
        return { item, need, uso, disponivel };
      });
      return { builds, linhas, almasUsadas, armasUsadas };
    }

    const copiar = estoque => new Map(Object.entries(estoque).map(([k, v]) => [Number(k), v]));
    const pct = linhas => {
      const need = linhas.reduce((s, l) => s + l.need, 0);
      return need ? linhas.reduce((s, l) => s + l.uso, 0) / need : 1;
    };

    // Distribui o estoque pelos planos na ordem de prioridade. Retorna um resultado por plano.
    function simularPlanos(estoque, planos) {
      const disp = copiar(estoque);
      return planos.map(p => planejar(p.arma, p.qtd, disp));
    }

    // Resultado para a arma `alvo`: se está nos planos, vê só o que sobrou dos planos anteriores;
    // se não está, vê só o estoque livre (depois de todos os planos).
    function simular(estoque, planos, alvo) {
      const disp = copiar(estoque);
      const idx = planos.findIndex(p => p.arma === alvo);
      const antes = idx >= 0 ? planos.slice(0, idx) : planos;
      for (const p of antes) planejar(p.arma, p.qtd, disp);
      const qtd = idx >= 0 ? planos[idx].qtd : 1;
      return { qtd, noPlano: idx >= 0, ...planejar(alvo, qtd, disp) };
    }

    return { cadeia, planejar, simular, simularPlanos, pct, porSaida };
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { criar };
  else window.PWCalc = { criar };
})();
