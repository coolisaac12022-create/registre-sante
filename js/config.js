/* Définition des feuilles du registre.
   Une feuille = une liste de colonnes + des lignes de départ.
   Colonne : k = clé, l = libellé, t = "text" | "num" | "calc",
             tot = 1 pour une somme en bas, f = formule (colonnes "calc").
   { grp: "ages" } ou { grp: "vac" } = emplacement des colonnes de tranches d'âge / groupes de vaccination,
   qui viennent des listes modifiables par l'infirmier. */
(function () {
  const RS = (window.RS = window.RS || {});

  // Convertit une saisie en nombre. Une case vide ou illisible vaut 0.
  const N = (v) => {
    v = parseFloat(v);
    return isNaN(v) ? 0 : v;
  };
  RS.N = N;

  // Tranches d'âge de départ (consultations, décès, population) et groupes de vaccination.
  // L'infirmier peut les changer lui-même : ajouter, renommer, déplacer, supprimer (bouton « Tranches d'âge »).
  // Les listes en cours sont gardées dans RS.state.ages et RS.state.vacGroups.
  RS.DEFAULT_AGES = [
    { k: "a0", l: "0–11 mois" },
    { k: "a1", l: "1–4 ans" },
    { k: "a2", l: "5–14 ans" },
    { k: "a3", l: "15–49 ans" },
    { k: "a4", l: "50 ans et +" }
  ];
  RS.DEFAULT_VAC_GROUPS = [
    { k: "g1", l: "0–11 mois" },
    { k: "g2", l: "12–23 mois" },
    { k: "g3", l: "2–4 ans" },
    { k: "g4", l: "Femmes enceintes" }
  ];
  RS.ages = () => (RS.state && RS.state.ages) || RS.DEFAULT_AGES;
  RS.vacGroups = () => (RS.state && RS.state.vacGroups) || RS.DEFAULT_VAC_GROUPS;

  const ageSum = (r) => RS.ages().reduce((s, a) => s + N(r[a.k]), 0);
  const vacTotal = (r) => RS.vacGroups().reduce((s, g) => s + N(r[g.k]), 0);
  const stockFin = (r) => N(r.d) + N(r.e) - N(r.s);
  const stockBas = (r) => {
    const fin = stockFin(r);
    const seuil = N(r.sl);
    return fin < 0 || (seuil > 0 && fin <= seuil);
  };
  Object.assign(RS, { ageSum, vacTotal, stockFin, stockBas });

  RS.SECTIONS = [
    {
      id: "pop", short: "Population", title: "1. Mouvement de population",
      hint: "Pop. fin = début + naissances + arrivées − décès − départs",
      cols: [
        { k: "v", l: "Village / quartier", t: "text" },
        { k: "d", l: "Pop. début", t: "num", tot: 1 },
        { k: "n", l: "Naissances (+)", t: "num", tot: 1 },
        { k: "a", l: "Arrivées (+)", t: "num", tot: 1 },
        { k: "m", l: "Décès (−)", t: "num", tot: 1 },
        { k: "p", l: "Départs (−)", t: "num", tot: 1 },
        { k: "f", l: "Pop. fin", t: "calc", tot: 1, f: (r) => N(r.d) + N(r.n) + N(r.a) - N(r.m) - N(r.p) }
      ],
      rows: ["Village 1", "Village 2", "Village 3", "Village 4", "Village 5"]
    },
    {
      id: "age", short: "Âges", title: "2. Population par tranche d'âge",
      hint: "Total = hommes + femmes",
      cols: [
        { k: "v", l: "Tranche d'âge", t: "text" },
        { k: "h", l: "Hommes", t: "num", tot: 1 },
        { k: "f", l: "Femmes", t: "num", tot: 1 },
        { k: "t", l: "Total", t: "calc", tot: 1, f: (r) => N(r.h) + N(r.f) }
      ],
      rows: [] // une ligne par tranche d'âge, ajoutée automatiquement (voir RS.rowsOf)
    },
    {
      id: "cons", short: "Consultations", title: "3. Consultations par tranche d'âge",
      hint: "Total = somme des tranches d'âge",
      cols: [{ k: "v", l: "Motif / maladie", t: "text" }, { grp: "ages" }, { k: "t", l: "Total", t: "calc", tot: 1, f: ageSum }],
      rows: ["Paludisme", "Infections respiratoires", "Diarrhées", "Plaies / blessures", "Autres"]
    },
    {
      id: "mat", short: "Maternité", title: "4. Maternité",
      hint: "Total naissances = nés vivants + mort-nés",
      cols: [
        { k: "v", l: "Semaine", t: "text" },
        { k: "c1", l: "CPN 1", t: "num", tot: 1 },
        { k: "c4", l: "CPN 4", t: "num", tot: 1 },
        { k: "acc", l: "Accouchements", t: "num", tot: 1 },
        { k: "viv", l: "Nés vivants", t: "num", tot: 1 },
        { k: "mn", l: "Mort-nés", t: "num", tot: 1 },
        { k: "t", l: "Total naissances", t: "calc", tot: 1, f: (r) => N(r.viv) + N(r.mn) }
      ],
      rows: ["Semaine 1", "Semaine 2", "Semaine 3", "Semaine 4", "Semaine 5"]
    },
    {
      id: "dec", short: "Décès", title: "5. Décès par tranche d'âge",
      hint: "Total = somme des tranches d'âge",
      cols: [{ k: "v", l: "Cause du décès", t: "text" }, { grp: "ages" }, { k: "t", l: "Total", t: "calc", tot: 1, f: ageSum }],
      rows: ["Paludisme", "Infections respiratoires", "Diarrhées", "Décès maternel", "Autres causes"]
    },
    {
      id: "vac", short: "Vaccination", title: "6. Vaccination par tranche d'âge",
      hint: "Total faits = somme des groupes · Taux = total faits ÷ prévus × 100",
      cols: [
        { k: "v", l: "Vaccin", t: "text" },
        { k: "p", l: "Prévus", t: "num", tot: 1 },
        { grp: "vac" },
        { k: "t", l: "Total faits", t: "calc", tot: 1, f: vacTotal },
        {
          k: "r", l: "Taux %", t: "calc",
          f: (r) => (N(r.p) > 0 ? Math.round((vacTotal(r) / N(r.p)) * 100) : 0),
          // Le taux du bas se calcule sur les totaux, pas en additionnant des pourcentages.
          totf: (rows) => {
            let p = 0, f = 0;
            rows.forEach((r) => { p += N(r.p); f += vacTotal(r); });
            return p > 0 ? Math.round((f / p) * 100) : 0;
          }
        }
      ],
      rows: ["BCG", "Polio", "Penta 1", "Penta 3", "Rougeole", "Fièvre jaune", "VAT (femmes enceintes)"]
    },
    {
      id: "stk", short: "Stock", title: "7. Stock médicaments",
      hint: "Stock fin = début + entrées − sorties · alerte si stock fin ≤ seuil",
      cols: [
        { k: "v", l: "Médicament", t: "text" },
        { k: "d", l: "Stock début", t: "num", tot: 1 },
        { k: "e", l: "Entrées (+)", t: "num", tot: 1 },
        { k: "s", l: "Sorties (−)", t: "num", tot: 1 },
        { k: "sl", l: "Seuil alerte", t: "num" },
        { k: "f", l: "Stock fin", t: "calc", tot: 1, f: stockFin },
        { k: "st", l: "État", t: "calc", f: (r) => (stockBas(r) ? "⚠ Bas" : N(r.d) + N(r.e) + N(r.s) > 0 ? "OK" : "") }
      ],
      rows: ["Paracétamol", "Amoxicilline", "ACT (paludisme)", "SRO", "Fer / acide folique"]
    }
  ];

  RS.SEC = {};
  RS.SECTIONS.forEach((s) => (RS.SEC[s.id] = s));

  // Données d'exemple pour la démonstration. Ce ne sont pas de vrais chiffres.
  RS.DEMO = {
    pop: [{ v: "Village 1", d: 820, n: 6, a: 4, m: 2, p: 3 }, { v: "Village 2", d: 640, n: 4, a: 2, m: 1, p: 2 }, { v: "Village 3", d: 455, n: 3, a: 1, m: 2, p: 1 }, { v: "Village 4", d: 310, n: 2, a: 0, m: 1, p: 0 }, { v: "Village 5", d: 280, n: 1, a: 3, m: 0, p: 2 }],
    age: [{ v: "0–11 mois", h: 140, f: 150 }, { v: "1–4 ans", h: 300, f: 310 }, { v: "5–14 ans", h: 395, f: 412 }, { v: "15–49 ans", h: 330, f: 350 }, { v: "50 ans et +", h: 60, f: 70 }],
    cons: [{ v: "Paludisme", a0: 22, a1: 35, a2: 40, a3: 28, a4: 6 }, { v: "Infections respiratoires", a0: 18, a1: 24, a2: 15, a3: 12, a4: 5 }, { v: "Diarrhées", a0: 12, a1: 15, a2: 6, a3: 4, a4: 2 }, { v: "Plaies / blessures", a0: 1, a1: 4, a2: 9, a3: 14, a4: 3 }, { v: "Autres", a0: 5, a1: 8, a2: 11, a3: 20, a4: 9 }],
    mat: [{ v: "Semaine 1", c1: 5, c4: 3, acc: 4, viv: 4, mn: 0 }, { v: "Semaine 2", c1: 4, c4: 4, acc: 3, viv: 3, mn: 0 }, { v: "Semaine 3", c1: 6, c4: 2, acc: 5, viv: 4, mn: 1 }, { v: "Semaine 4", c1: 3, c4: 5, acc: 4, viv: 4, mn: 0 }, { v: "Semaine 5", c1: 2, c4: 1, acc: 1, viv: 1, mn: 0 }],
    dec: [{ v: "Paludisme", a0: 1, a1: 1, a2: 0, a3: 0, a4: 0 }, { v: "Infections respiratoires", a0: 0, a1: 0, a2: 0, a3: 0, a4: 1 }, { v: "Diarrhées", a0: 1, a1: 0, a2: 0, a3: 0, a4: 0 }, { v: "Décès maternel", a0: 0, a1: 0, a2: 0, a3: 1, a4: 0 }, { v: "Autres causes", a0: 0, a1: 0, a2: 0, a3: 0, a4: 1 }],
    vac: [{ v: "BCG", p: 20, g1: 14, g2: 2, g3: 0, g4: 0 }, { v: "Polio", p: 40, g1: 28, g2: 5, g3: 2, g4: 0 }, { v: "Penta 1", p: 20, g1: 15, g2: 3, g3: 0, g4: 0 }, { v: "Penta 3", p: 20, g1: 9, g2: 4, g3: 0, g4: 0 }, { v: "Rougeole", p: 30, g1: 12, g2: 10, g3: 4, g4: 0 }, { v: "Fièvre jaune", p: 30, g1: 10, g2: 12, g3: 5, g4: 0 }, { v: "VAT (femmes enceintes)", p: 25, g1: 0, g2: 0, g3: 0, g4: 18 }],
    stk: [{ v: "Paracétamol", d: 300, e: 200, s: 340, sl: 100 }, { v: "Amoxicilline", d: 150, e: 0, s: 120, sl: 50 }, { v: "ACT (paludisme)", d: 200, e: 100, s: 260, sl: 80 }, { v: "SRO", d: 80, e: 50, s: 60, sl: 30 }, { v: "Fer / acide folique", d: 120, e: 0, s: 45, sl: 40 }]
  };
})();
