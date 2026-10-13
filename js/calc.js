/* Les calculs : totaux du bas des tableaux et chiffres du mois pour chaque site. */
(function () {
  const RS = window.RS;
  const N = RS.N;

  // Totaux du bas d'une feuille : { cléDeColonne: total }
  RS.sheetTotals = function (sec, rows) {
    const out = {};
    RS.allCols(sec).forEach((c) => {
      if (c.totf) { out[c.k] = c.totf(rows); return; }
      if (!c.tot) return;
      let s = 0;
      rows.forEach((r) => (s += c.t === "calc" ? c.f(r) : N(r[c.k])));
      out[c.k] = s;
    });
    return out;
  };

  // Résumé d'un site pour le mois choisi : chiffres, alertes.
  RS.summ = function (site) {
    const d = RS.peek(site).d;
    const SEC = RS.SEC;
    const pop = RS.sheetTotals(SEC.pop, d.pop || []);
    const cons = RS.sheetTotals(SEC.cons, d.cons || []);
    const mat = RS.sheetTotals(SEC.mat, d.mat || []);
    const dec = RS.sheetTotals(SEC.dec, d.dec || []);
    const vac = RS.sheetTotals(SEC.vac, d.vac || []);

    let top = "", topN = 0;
    (d.cons || []).forEach((r) => {
      const t = RS.ageSum(r);
      if (t > topN) { topN = t; top = r.v; }
    });

    const vaccinsFaibles = [];
    let vacPrevus = 0, vacFaits = 0;
    (d.vac || []).forEach((r) => {
      const prevus = N(r.p);
      vacPrevus += prevus;
      vacFaits += RS.vacTotal(r);
      if (prevus > 0) {
        const taux = Math.round((RS.vacTotal(r) / prevus) * 100);
        if (taux < 80) vaccinsFaibles.push(r.v + " (" + taux + " %)");
      }
    });

    const stockBas = [];
    (d.stk || []).forEach((r) => { if (RS.stockBas(r)) stockBas.push(r.v); });

    const s = {
      popDeb: pop.d, popFin: pop.f, nais: pop.n, arr: pop.a, decPop: pop.m, dep: pop.p,
      cons: cons.t, ages: RS.ages().map((a) => cons[a.k]), top, topN,
      c1: mat.c1, c4: mat.c4, acc: mat.acc, viv: mat.viv, mn: mat.mn,
      decTot: dec.t, vacPrevus, vacFaits, vacRate: vac.r,
      alerts: []
    };

    // Les mêmes chiffres saisis à deux endroits doivent être identiques.
    if (s.nais !== s.viv) s.alerts.push("Naissances : la feuille Population indique " + s.nais + ", la Maternité indique " + s.viv + " nés vivants. Vérifiez.");
    if (s.decPop !== s.decTot) s.alerts.push("Décès : la feuille Population indique " + s.decPop + ", la feuille Décès indique " + s.decTot + ". Vérifiez.");
    if (stockBas.length) s.alerts.push("Stock bas : " + stockBas.join(", ") + ".");
    if (vaccinsFaibles.length) s.alerts.push("Vaccins à rattraper (moins de 80 %) : " + vaccinsFaibles.join(", ") + ".");
    return s;
  };
})();
