/* Les données : où elles sont gardées, et comment on les lit.
   Pour l'instant tout est gardé dans le navigateur (localStorage).
   Plus tard, seul RS.storage devra changer pour envoyer les données en ligne (voir docs/MVP.md). */
(function () {
  const RS = window.RS;
  const KEY = "registre-sante-v1";

  RS.storage = {
    load() {
      try {
        const raw = localStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },
    save(state) {
      try {
        localStorage.setItem(KEY, JSON.stringify(state));
      } catch (e) {
        /* navigation privée ou stockage plein : le site continue sans sauvegarde */
      }
    }
  };

  const currentMonth = () => {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
  };

  // Un mois vide pour un site : toutes les feuilles de départ, avec leurs lignes.
  RS.freshData = function () {
    const d = {};
    RS.SECTIONS.forEach((s) => (d[s.id] = s.rows.map((n) => ({ v: n }))));
    return { d, n: {} };
  };

  // Données d'exemple. "m" réduit les chiffres pour que chaque site soit différent.
  RS.demoData = function (m) {
    const d = {};
    Object.keys(RS.DEMO).forEach((id) => {
      d[id] = RS.DEMO[id].map((r) => {
        const o = {};
        Object.keys(r).forEach((k) => (o[k] = k === "v" ? r[k] : Math.round(r[k] * m)));
        return o;
      });
    });
    // Chaque ligne de la feuille « Âges » est attachée à sa tranche d'âge par la clé k.
    d.age.forEach((r, i) => (r.k = RS.DEFAULT_AGES[i].k));
    return {
      d,
      n: {
        obs: "Bonne fréquentation ce mois. Le paludisme reste la première cause de consultation.",
        diff: "Rupture proche en amoxicilline et ACT. Route difficile en saison des pluies.",
        need: "Commande urgente : amoxicilline, ACT, vaccins Penta 3 et VAT.",
        by: "",
        date: ""
      }
    };
  };

  function initialState() {
    const m0 = currentMonth();
    const s = {
      names: ["Site 1", "Site 2", "Site 3", "Site 4", "Site 5"],
      cur: 0, page: "dash", sec: 0, month: m0, nurse: "",
      demo: true,
      months: {},   // months["2026-10"][numéroDuSite] = { d: feuilles, n: remarques }
      ages: RS.DEFAULT_AGES.map((a) => Object.assign({}, a)),            // tranches d'âge modifiables
      vacGroups: RS.DEFAULT_VAC_GROUPS.map((g) => Object.assign({}, g)), // groupes de vaccination modifiables
      cc: {},       // colonnes ajoutées par feuille
      lbl: {},      // noms de colonnes changés
      hid: {},      // colonnes masquées
      cs: []        // feuilles ajoutées
    };
    s.months[m0] = { 0: RS.demoData(1), 1: RS.demoData(0.6) };
    return s;
  }

  const saved = RS.storage.load();
  RS.state = saved && saved.months ? saved : initialState();
  ["cc", "lbl", "hid"].forEach((k) => (RS.state[k] = RS.state[k] || {}));
  RS.state.cs = RS.state.cs || [];
  if (!RS.state.ages) RS.state.ages = RS.DEFAULT_AGES.map((a) => Object.assign({}, a));
  if (!RS.state.vacGroups) RS.state.vacGroups = RS.DEFAULT_VAC_GROUPS.map((g) => Object.assign({}, g));

  // Éléments d'écran qui ne sont pas sauvegardés.
  RS.ui = { panel: false, newSheet: false, confirm: null };

  RS.save = () => RS.storage.save(RS.state);

  // Lire un mois sans rien créer (pour les totaux et l'affichage).
  RS.peek = function (site, month) {
    const m = RS.state.months[month || RS.state.month];
    return (m && m[site]) || RS.freshData();
  };
  // Obtenir un mois pour y écrire : il est créé s'il n'existe pas.
  RS.edit = function (site, month) {
    const s = RS.state;
    month = month || s.month;
    if (!s.months[month]) s.months[month] = {};
    if (!s.months[month][site]) s.months[month][site] = RS.freshData();
    return s.months[month][site];
  };

  /* ---------- Feuilles et colonnes (modifiables par l'infirmier) ---------- */

  RS.allSections = function () {
    const out = RS.SECTIONS.slice();
    RS.state.cs.forEach((cs, i) => {
      out.push({
        id: cs.id, short: cs.short,
        title: RS.SECTIONS.length + i + 1 + ". " + cs.short,
        hint: "Feuille ajoutée par vous.",
        cols: [{ k: "v", l: "Libellé", t: "text" }],
        rows: ["Ligne 1", "Ligne 2", "Ligne 3"],
        custom: 1
      });
    });
    return out;
  };

  // La feuille « Âges » a toujours une ligne par tranche d'âge, dans l'ordre de la liste.
  function syncAgeRows(d) {
    const ages = RS.ages();
    const old = d.age || [];
    old.forEach((r, i) => { if (!r.k && ages[i]) r.k = ages[i].k; });
    return ages.map((a) => {
      const r = old.find((x) => x.k === a.k) || { k: a.k };
      r.v = a.l;
      return r;
    });
  }

  RS.rowsOf = function (site, sec, forEdit) {
    const d = (forEdit ? RS.edit(site) : RS.peek(site)).d;
    if (sec.id === "age") {
      d.age = syncAgeRows(d);
      return d.age;
    }
    if (!d[sec.id]) d[sec.id] = sec.rows.map((n) => ({ v: n }));
    return d[sec.id];
  };

  // Colonnes qui viennent d'une liste modifiable (tranches d'âge ou groupes de vaccination).
  RS.groupCols = function (name) {
    const list = name === "vac" ? RS.vacGroups() : RS.ages();
    return list.map((g) => ({ k: g.k, l: g.l || "(sans nom)", t: "num", tot: 1, grp: name }));
  };

  // Valeur d'une colonne pour une ligne, utilisée par les colonnes "calcul" ajoutées.
  function colValue(list, r, key, depth) {
    const c = list.find((x) => x.k === key);
    if (!c) return 0;
    return c.t === "calc" ? c.f(r, depth + 1) : RS.N(r[key]);
  }

  // Toutes les colonnes d'une feuille : celles de départ + celles ajoutées, avec noms changés et masquages.
  RS.allCols = function (sec) {
    const list = [];
    sec.cols.forEach((c) => {
      if (c.grp) list.push(...RS.groupCols(c.grp));
      else list.push(Object.assign({}, c));
    });
    (RS.state.cc[sec.id] || []).forEach((cd) => {
      const c = { k: cd.k, l: cd.l, t: cd.t === "calc" ? "calc" : cd.t === "text" ? "text" : "num", custom: 1 };
      if (cd.t !== "text") c.tot = 1;
      if (cd.t === "calc") {
        c.plus = cd.plus || [];
        c.minus = cd.minus || [];
        c.f = (r, depth) => {
          depth = depth || 0;
          if (depth > 6) return 0; // protège contre un calcul qui se référence lui-même
          let s = 0;
          c.plus.forEach((k) => (s += colValue(list, r, k, depth)));
          c.minus.forEach((k) => (s -= colValue(list, r, k, depth)));
          return s;
        };
      }
      const idx = cd.after ? list.findIndex((x) => x.k === cd.after) : -1;
      if (idx >= 0) list.splice(idx + 1, 0, c);
      else list.push(c);
    });
    const names = RS.state.lbl[sec.id] || {};
    const hidden = RS.state.hid[sec.id] || {};
    list.forEach((c) => {
      if (c.grp) return; // le nom et la présence d'une tranche d'âge se changent dans « Tranches d'âge »
      if (names[c.k]) c.l = names[c.k];
      c.hidden = !!hidden[c.k] && c.k !== "v";
    });
    return list;
  };
  RS.visCols = (sec) => RS.allCols(sec).filter((c) => !c.hidden);

  RS.colLetter = function (i) {
    let s = "";
    i++;
    while (i > 0) {
      const m = (i - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      i = Math.floor((i - 1) / 26);
    }
    return s;
  };
})();
