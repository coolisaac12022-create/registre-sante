/* L'affichage et les actions : ce que l'on voit, et ce sur quoi on appuie. */
(function () {
  const RS = window.RS;
  const S = RS.state;
  const N = RS.N;
  const $ = (id) => document.getElementById(id);
  const esc = (x) => String(x == null ? "" : x).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmt = (v) => (typeof v === "number" ? v.toLocaleString("fr-FR", { maximumFractionDigits: 2 }) : v);
  const siteName = (i) => S.names[i] || "Site " + (i + 1);
  const monthLabel = (m) => {
    if (!m) return "—";
    const [y, mo] = m.split("-");
    const t = new Date(+y, +mo - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    return t.charAt(0).toUpperCase() + t.slice(1);
  };

  const svg = (inner) => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  const ICON = {
    dash: svg('<path d="M3 11 12 3l9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'),
    saisie: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/>'),
    rapport: svg('<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>'),
    sites: svg('<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>'),
    warn: svg('<path d="M12 3 2.5 20h19L12 3z"/><path d="M12 10v4"/><path d="M12 17.5v.01"/>'),
    ok: svg('<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/>'),
    err: svg('<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>')
  };
  const alertBox = (kind, text) => `<div class="al${kind === "ok" ? " ok" : kind === "err" ? " err" : ""}">${ICON[kind === "ok" ? "ok" : kind === "err" ? "err" : "warn"]}<div class="grow">${esc(text)}</div></div>`;

  const AGE_SHEETS = ["age", "cons", "dec", "vac"]; // feuilles qui utilisent les tranches d'âge
  const listOf = (name) => (name === "vac" ? S.vacGroups : S.ages);
  const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  let installEvent = null; // proposition d'installation donnée par le navigateur

  const PAGES = [
    { id: "dash", label: "Accueil" },
    { id: "saisie", label: "Saisie" },
    { id: "rapport", label: "Rapport" },
    { id: "sites", label: "Sites" }
  ];

  /* ---------- Haut de page ---------- */
  function renderNav() {
    $("nav").innerHTML = PAGES.map((p) =>
      `<button class="nav-btn${p.id === S.page ? " on" : ""}" data-nav="${p.id}"${p.id === S.page ? ' aria-current="page"' : ""}><span class="pill">${ICON[p.id]}</span><span>${p.label}</span></button>`
    ).join("");
  }
  function renderContext() {
    $("sites").innerHTML =
      S.names.map((n, i) => `<button class="chip${i === S.cur ? " on" : ""}" data-site="${i}" aria-pressed="${i === S.cur}">${esc(siteName(i))}</button>`).join("") +
      '<button class="chip plus" data-addsite="1">＋ Site</button>';
    $("siteName").value = S.names[S.cur] || "";
    $("siteName").placeholder = "Site " + (S.cur + 1);
    $("month").value = S.month || "";
    $("nurse").value = S.nurse || "";
  }
  function fillPrintHead() {
    const set = (cls, txt) => document.querySelectorAll("." + cls).forEach((el) => (el.textContent = txt));
    set("phSite", siteName(S.cur));
    set("phMonth", monthLabel(S.month));
    set("phNurse", S.nurse || "……………");
  }

  /* ---------- Accueil ---------- */
  function renderDash() {
    const s = RS.summ(S.cur);
    const max = Math.max(1, ...s.ages);
    const tiles = [["Population", s.popFin], ["Naissances", s.nais], ["Décès", s.decPop], ["Consultations", s.cons], ["Accouchements", s.acc], ["Vaccination", s.vacRate + " %"]];
    let h = `<h1>${esc(monthLabel(S.month))}</h1>`;
    if (S.demo) {
      h += `<div class="al noprint">${ICON.warn}<div class="grow">Vous voyez des données d'exemple. Quand vous êtes prêt, effacez-les pour commencer votre vrai registre.</div><button class="btn btn-danger" id="clearDemo">Effacer les exemples</button></div>`;
    }
    h += `<div class="kpis">${tiles.map((t) => `<div class="kpi"><span>${t[0]}</span><b>${fmt(t[1])}</b></div>`).join("")}</div>`;
    h += `<div class="card stack"><h2>Consultations par tranche d'âge</h2>${RS.ages().map((a, i) => `<div class="bar"><span class="lb">${esc(a.l)}</span><span class="track"><span class="fill" style="width:${Math.round((s.ages[i] / max) * 100)}%"></span></span><span class="vl">${fmt(s.ages[i])}</span></div>`).join("")}</div>`;
    h += `<div class="stack"><h2>Alertes</h2>${s.alerts.length ? s.alerts.map((a) => alertBox("warn", a)).join("") : alertBox("ok", "Tout est en ordre pour ce mois.")}</div>`;
    h += `<div class="card noprint"><h2>Comment utiliser</h2><ol class="guide"><li>Choisissez le <b>site</b> et le <b>mois</b> en haut. Le bouton <b>＋ Site</b> ajoute un site.</li><li>Allez dans <b>Saisie</b> et remplissez les cases blanches. Les cases vertes se calculent seules.</li><li>Il manque une colonne ? Dans Saisie, appuyez sur <b>＋ Colonne</b>. Le bouton <b>＋ Feuille</b> ajoute un nouveau tableau.</li><li>Allez dans <b>Rapport</b>, ajoutez vos remarques, puis imprimez.</li></ol></div>`;
    if (!isStandalone() && location.protocol.indexOf("http") === 0) {
      h += `<div class="card stack noprint"><h2>Installer l'application</h2><p>Mettez le registre sur l'écran d'accueil du téléphone : il s'ouvre comme une application, même sans réseau.</p>${installEvent ? '<div class="row"><button class="btn btn-pri" id="installApp">Installer l\'application</button></div>' : '<p class="small">Android (Chrome) : menu ⋮ puis « Installer l\'application ». iPhone (Safari) : Partager puis « Sur l\'écran d\'accueil ».</p>'}</div>`;
    }
    $("p-dash").innerHTML = h;
  }

  /* ---------- Saisie ---------- */
  // Une liste modifiable : tranches d'âge ("ages") ou groupes de vaccination ("vac").
  function groupBlock(name, title, hint, noun) {
    const list = listOf(name);
    let h = `<div class="stack"><h2>${title}</h2><p class="small">${hint}</p>`;
    list.forEach((g, i) => {
      h += `<div class="crow"><input data-glbl="${name}:${g.k}" value="${esc(g.l)}" aria-label="Nom : ${esc(g.l)}">`
        + `<button class="icon-btn" data-gmove="${name}:${g.k}:-1" aria-label="Monter ${esc(g.l)}"${i === 0 ? " disabled" : ""}>↑</button>`
        + `<button class="icon-btn" data-gmove="${name}:${g.k}:1" aria-label="Descendre ${esc(g.l)}"${i === list.length - 1 ? " disabled" : ""}>↓</button>`
        + `<button class="btn" id="delg-${name}-${g.k}" data-gdel="${name}:${g.k}"${list.length <= 1 ? " disabled" : ""}>Supprimer</button></div>`;
    });
    h += `<div class="fields"><label class="field">${noun}<input id="gn-${name}" placeholder="${name === "vac" ? "Ex : 5–14 ans" : "Ex : 0–5 ans"}" autocomplete="off"></label>`
      + `<label class="field">Placer après<select id="ga-${name}"><option value="">À la fin</option>${list.map((g) => `<option value="${g.k}">${esc(g.l)}</option>`).join("")}</select></label></div>`
      + `<div class="row"><button class="btn btn-pri" data-gadd="${name}">Ajouter</button></div></div>`;
    return h;
  }
  function agePanelHtml() {
    return `<div class="card stack noprint" id="agepanel"><h2>Tranches d'âge</h2><p class="small">Mettez les mêmes tranches que dans votre district. Les colonnes des feuilles Consultations, Décès et Vaccination et les lignes de la feuille Âges se mettent à jour toutes seules. Supprimer une tranche retire sa colonne : ses chiffres ne sont plus comptés.</p>`
      + groupBlock("ages", "Population, consultations et décès", "Ces tranches servent aux feuilles Âges, Consultations et Décès.", "Nouvelle tranche")
      + groupBlock("vac", "Groupes de vaccination", "Ces groupes servent à la feuille Vaccination.", "Nouveau groupe")
      + "</div>";
  }

  function panelHtml(sec) {
    const cols = RS.allCols(sec);
    let h = `<div class="card stack noprint" id="colpanel"><h2>Colonnes de la feuille « ${esc(sec.short)} »</h2><p class="small">Changez le nom d'une colonne, masquez-la, ou ajoutez la vôtre. Les tranches d'âge se changent avec le bouton « Tranches d'âge ».</p>`;
    cols.forEach((c) => {
      if (c.grp) {
        h += `<div class="crow"><input value="${esc(c.l)}" disabled aria-label="Tranche d'âge ${esc(c.l)}"><button class="btn" data-agepanel="open">Modifier</button></div>`;
        return;
      }
      h += `<div class="crow"><input data-lbl="${c.k}" value="${esc(c.l)}" aria-label="Nom de la colonne ${esc(c.l)}">`;
      if (c.custom) h += `<button class="btn" data-delcol="${c.k}">Supprimer</button>`;
      else if (c.k !== "v") h += `<button class="btn" data-hidecol="${c.k}">${c.hidden ? "Afficher" : "Masquer"}</button>`;
      h += "</div>";
    });
    h += `<h2>Ajouter une colonne</h2><div class="fields">
      <label class="field">Nom de la colonne<input id="ncName" placeholder="Ex : CPN 2, Pansements" autocomplete="off"></label>
      <label class="field">Type<select id="ncType"><option value="num">Nombre</option><option value="text">Texte</option><option value="calc">Calcul (+ / −)</option></select></label>
      <label class="field">Placer après<select id="ncAfter"><option value="">À la fin</option>${cols.map((c) => `<option value="${c.k}">${esc(c.l)}</option>`).join("")}</select></label></div>`;
    const numCols = cols.filter((c) => c.t !== "text");
    h += `<div id="ncCalc" hidden><p class="small">Additionner (+) :</p><div class="chk">${numCols.map((c) => `<label><input type="checkbox" class="pl" value="${c.k}">${esc(c.l)}</label>`).join("")}</div><p class="small">Soustraire (−) :</p><div class="chk">${numCols.map((c) => `<label><input type="checkbox" class="mn" value="${c.k}">${esc(c.l)}</label>`).join("")}</div></div>`;
    h += `<div class="al err" id="ncMsg" hidden></div><div class="row"><button class="btn btn-pri" id="addCol">Ajouter la colonne</button></div></div>`;
    return h;
  }

  function renderSaisie() {
    RS.ui.confirm = null;
    const secs = RS.allSections();
    if (S.sec >= secs.length) S.sec = 0;
    const cur = secs[S.sec];
    let h = `<h1 class="noprint">${esc(cur.short)}</h1>`;
    h += '<div class="tabs noprint">' + secs.map((s, i) => `<button class="chip${i === S.sec ? " on" : ""}" data-tab="${i}" aria-pressed="${i === S.sec}">${esc(s.short)}</button>`).join("") + '<button class="chip plus" data-newsheet="1">＋ Feuille</button></div>';
    if (RS.ui.newSheet) {
      h += '<div class="card noprint"><div class="row"><label class="field" style="flex:1;min-width:200px">Nom de la nouvelle feuille<input id="nsName" placeholder="Ex : Pansements, Référence" autocomplete="off"></label><button class="btn btn-pri" id="mkSheet">Créer la feuille</button></div></div>';
    }
    h += '<div class="printhead"><strong class="phSite"></strong> — <span class="phMonth"></span> — Infirmier(ère) : <span class="phNurse"></span></div>';

    secs.forEach((sec, si) => {
      const rows = RS.rowsOf(S.cur, sec);
      const cols = RS.visCols(sec);
      h += `<div class="sec${si === S.sec ? " show" : ""}" data-si="${si}"><p class="small"><strong>${esc(sec.title)}</strong> — ${esc(sec.hint)}</p><div class="sheet"><table><thead><tr><th class="ltr rn"></th>`;
      cols.forEach((c, i) => (h += `<th class="ltr${i === 0 ? " c-lbl" : ""}">${RS.colLetter(i)}</th>`));
      h += '<th class="ltr noprint"></th></tr><tr><th class="hd rn"></th>';
      cols.forEach((c, i) => (h += `<th class="hd${i === 0 ? " c-lbl" : ""}" data-th="${c.k}">${esc(c.l)}</th>`));
      h += '<th class="hd noprint ctl"><button class="icon-btn" data-addcol="1" aria-label="Ajouter une colonne">＋</button></th></tr></thead><tbody>';
      rows.forEach((r, ri) => {
        h += `<tr><td class="rn">${ri + 1}</td>`;
        cols.forEach((c, i) => {
          const lbl = i === 0 ? " c-lbl" : "";
          if (c.t === "calc") h += `<td class="calc${lbl}" data-c="${c.k}"></td>`;
          else h += `<td class="cell${c.t === "text" ? " txt" : ""}${lbl}"><input data-si="${si}" data-ri="${ri}" data-k="${c.k}" ${c.t === "num" ? 'type="number" inputmode="decimal" step="any"' : 'type="text"'}${sec.id === "age" && c.k === "v" ? ` readonly data-agekey="${esc(r.k)}"` : ""} value="${esc(r[c.k])}" aria-label="${esc(c.l)}, ligne ${ri + 1}"></td>`;
        });
        h += sec.id === "age"
          ? '<td class="ctl noprint"></td></tr>'
          : `<td class="ctl noprint"><button class="icon-btn" data-del="${si}:${ri}" aria-label="Supprimer la ligne ${ri + 1}">✕</button></td></tr>`;
      });
      h += '<tr class="tot"><td class="rn">Σ</td>';
      cols.forEach((c, i) => (h += `<td data-tot="${c.k}"${i === 0 ? ' class="c-lbl"' : ""}>${i === 0 ? "TOTAL" : ""}</td>`));
      h += '<td class="ctl noprint"></td></tr></tbody></table></div></div>';
    });

    h += `<div class="row noprint">
      <button class="btn btn-sec" data-addcol="1">＋ Colonne</button>
      ${cur && cur.id === "age" ? "" : '<button class="btn btn-sec" id="addRow">＋ Ligne</button>'}
      ${cur && AGE_SHEETS.includes(cur.id) ? '<button class="btn btn-sec" data-agepanel="toggle">⚙ Tranches d\'âge</button>' : ""}
      <button class="btn" data-colpanel="1">⚙ Gérer les colonnes</button>
      <button class="btn btn-pri" id="print">Imprimer cette feuille</button>
      <button class="btn" id="printAll">Imprimer toutes les feuilles</button>
      <button class="btn btn-danger" id="reset">Vider ce site</button>
      ${cur && cur.custom ? '<button class="btn btn-danger" id="delSheet">Supprimer cette feuille</button>' : ""}
    </div>
    <p class="small noprint">Les données sont gardées sur cet appareil. Pour les retrouver sur un autre téléphone, il faudra la version en ligne (voir docs/MVP.md).</p>`;
    if (RS.ui.agePanel && cur && AGE_SHEETS.includes(cur.id)) h += agePanelHtml();
    if (RS.ui.panel && cur) h += panelHtml(cur);
    $("p-saisie").innerHTML = h;
    calcAll();
  }

  // Remplit les cases vertes et la ligne TOTAL. Appelée à chaque chiffre tapé.
  function calcAll() {
    RS.allSections().forEach((sec, si) => {
      const root = document.querySelector(`#p-saisie .sec[data-si="${si}"]`);
      if (!root) return;
      const rows = RS.rowsOf(S.cur, sec);
      const cols = RS.allCols(sec);
      const trs = root.querySelectorAll("tbody tr:not(.tot)");
      rows.forEach((r, ri) => {
        cols.forEach((c) => {
          if (c.t !== "calc" || c.hidden || !trs[ri]) return;
          const td = trs[ri].querySelector(`td[data-c="${c.k}"]`);
          if (!td) return;
          const v = c.f(r);
          td.textContent = fmt(v);
          td.classList.toggle("neg", v < 0 || v === "⚠ Bas");
        });
      });
      const T = RS.sheetTotals(sec, rows);
      cols.forEach((c) => {
        if (c.hidden || T[c.k] === undefined) return;
        const td = root.querySelector(`td[data-tot="${c.k}"]`);
        if (td) td.textContent = fmt(T[c.k]) + (c.k === "r" && c.totf ? " %" : "");
      });
    });
  }

  /* ---------- Rapport mensuel ---------- */
  function staticTable(sec, rows) {
    const cols = RS.visCols(sec);
    const T = RS.sheetTotals(sec, rows);
    let h = '<div class="sheet"><table class="st"><thead><tr>' + cols.map((c) => `<th>${esc(c.l)}</th>`).join("") + "</tr></thead><tbody>";
    rows.forEach((r) => {
      h += "<tr>";
      cols.forEach((c) => {
        if (c.t === "calc") h += `<td class="num">${fmt(c.f(r))}</td>`;
        else if (c.t === "num") h += `<td class="num">${r[c.k] === undefined || r[c.k] === "" ? "" : fmt(N(r[c.k]))}</td>`;
        else h += `<td>${esc(r[c.k])}</td>`;
      });
      h += "</tr>";
    });
    h += '<tr class="tot">' + cols.map((c, i) => `<td${i === 0 ? ' class="c-lbl"' : ""}>${i === 0 ? "TOTAL" : T[c.k] === undefined ? "" : fmt(T[c.k])}</td>`).join("") + "</tr></tbody></table></div>";
    return h;
  }

  function renderRapport() {
    const m = RS.peek(S.cur);
    const n = m.n || {};
    const s = RS.summ(S.cur);
    let h = '<h1 class="noprint">Rapport mensuel</h1>';
    h += '<div class="rephead"><b>RAPPORT MENSUEL D\'ACTIVITÉS</b><span>Établissement : <strong class="phSite"></strong> · Mois : <strong class="phMonth"></strong></span><span>Infirmier(ère) : <strong class="phNurse"></strong></span></div>';
    h += `<div class="card"><h2>Résumé du mois</h2><p>Ce mois, <b>${fmt(s.cons)}</b> consultations ont été faites${s.top ? ` (maladie la plus fréquente : <b>${esc(s.top)}</b>)` : ""}. La maternité a enregistré <b>${fmt(s.acc)}</b> accouchements et <b>${fmt(s.viv)}</b> nés vivants. Il y a eu <b>${fmt(s.decTot)}</b> décès. Le taux de vaccination est de <b>${s.vacRate} %</b>. La population en fin de mois est de <b>${fmt(s.popFin)}</b> personnes.</p></div>`;
    RS.allSections().forEach((sec) => (h += `<div class="stack"><h2>${esc(sec.title)}</h2>${staticTable(sec, RS.rowsOf(S.cur, sec))}</div>`));
    h += '<div class="stack"><h2>Remarques</h2>';
    [["obs", "Observations générales"], ["diff", "Difficultés rencontrées"], ["need", "Besoins / commandes (médicaments, vaccins, matériel)"]].forEach(([k, l]) => {
      h += `<label class="field">${l}<textarea data-note="${k}">${esc(n[k])}</textarea></label>`;
    });
    h += `<div class="fields"><label class="field">Établi par<input data-note="by" value="${esc(n.by)}"></label><label class="field">Date<input data-note="date" type="date" value="${esc(n.date)}"></label></div></div>`;
    h += '<div class="sig"><div>L\'infirmier(ère)</div><div>Le responsable / médecin-chef</div></div>';
    h += '<div class="row noprint"><button class="btn btn-pri" id="printRep">Imprimer le rapport</button></div>';
    $("p-rapport").innerHTML = h;
  }

  /* ---------- Tous les sites ---------- */
  function renderSites() {
    const cols = [["Population fin", "popFin"], ["Naissances", "nais"], ["Décès", "decPop"], ["Consultations", "cons"], ["CPN 1", "c1"], ["Accouchements", "acc"], ["Vaccination %", "vacRate"], ["Alertes", "nal"]];
    const tot = {};
    cols.forEach((c) => (tot[c[1]] = 0));
    let vp = 0, vf = 0;
    let h = `<h1 class="noprint">Tous les sites</h1><div class="stack"><h2>${esc(monthLabel(S.month))}</h2><div class="sheet"><table class="st"><thead><tr><th>Site</th>${cols.map((c) => `<th>${c[0]}</th>`).join("")}<th class="noprint"></th></tr></thead><tbody>`;
    S.names.forEach((nm, i) => {
      const s = RS.summ(i);
      s.nal = s.alerts.length;
      vp += s.vacPrevus;
      vf += s.vacFaits;
      h += `<tr><td>${esc(siteName(i))}</td>${cols.map((c) => { if (c[1] !== "vacRate") tot[c[1]] += s[c[1]]; return `<td class="num">${fmt(s[c[1]])}${c[1] === "vacRate" ? " %" : ""}</td>`; }).join("")}<td class="noprint"><button class="btn" data-open="${i}">Ouvrir</button></td></tr>`;
    });
    h += `<tr class="tot"><td class="c-lbl">TOTAL</td>${cols.map((c) => `<td>${c[1] === "vacRate" ? (vp > 0 ? Math.round((vf / vp) * 100) : 0) + " %" : fmt(tot[c[1]])}</td>`).join("")}<td class="noprint"></td></tr></tbody></table></div></div>`;
    h += '<div class="row noprint"><button class="btn btn-pri" id="printSites">Imprimer ce tableau</button></div><p class="small noprint">Ce tableau additionne les chiffres de chaque site pour le mois choisi.</p>';
    $("p-sites").innerHTML = h;
  }

  /* ---------- Affichage général ---------- */
  function render() {
    renderNav();
    renderContext();
    PAGES.forEach((p) => $("p-" + p.id).classList.toggle("show", p.id === S.page));
    if (S.page === "dash") renderDash();
    else if (S.page === "saisie") renderSaisie();
    else if (S.page === "rapport") renderRapport();
    else renderSites();
    fillPrintHead();
  }
  function print(all) {
    document.body.classList.toggle("printall", !!all);
    try { window.print(); } catch (e) { /* impression non disponible */ }
  }
  function openPanel() {
    RS.ui.panel = true;
    renderSaisie();
    fillPrintHead();
    const p = $("colpanel");
    if (p) {
      p.scrollIntoView({ behavior: "smooth", block: "center" });
      if ($("ncName")) $("ncName").focus({ preventScroll: true });
    }
  }
  function panelMessage(text) {
    const m = $("ncMsg");
    m.textContent = text;
    m.hidden = false;
  }
  // Action dangereuse : un premier appui demande confirmation, un second appui l'exécute.
  function twoStep(btn, ask, action) {
    if (RS.ui.confirm === btn.id) {
      RS.ui.confirm = null;
      action();
      return;
    }
    RS.ui.confirm = btn.id;
    btn.textContent = ask;
    btn.classList.add("armed");
    setTimeout(() => {
      if (RS.ui.confirm === btn.id) { RS.ui.confirm = null; render(); }
    }, 4000);
  }

  /* ---------- Ce que l'on tape ---------- */
  document.addEventListener("input", (e) => {
    const t = e.target;
    const d = t.dataset || {};
    if (d.k !== undefined) {
      const sec = RS.allSections()[d.si];
      RS.rowsOf(S.cur, sec, true)[d.ri][d.k] = t.value;
      RS.save();
      calcAll();
    } else if (d.lbl !== undefined) {
      const sec = RS.allSections()[S.sec];
      S.lbl[sec.id] = S.lbl[sec.id] || {};
      S.lbl[sec.id][d.lbl] = t.value;
      RS.save();
      const th = document.querySelector(`#p-saisie .sec.show th[data-th="${d.lbl}"]`);
      if (th) th.textContent = t.value;
    } else if (d.glbl !== undefined) {
      const [ln, k] = d.glbl.split(":");
      const item = listOf(ln).find((x) => x.k === k);
      if (item) {
        item.l = t.value;
        RS.save();
        document.querySelectorAll(`th[data-th="${k}"]`).forEach((th) => (th.textContent = t.value));
        document.querySelectorAll(`input[data-agekey="${k}"]`).forEach((i) => (i.value = t.value));
      }
    } else if (d.note) {
      RS.edit(S.cur).n[d.note] = t.value;
      RS.save();
    } else if (t.id === "siteName") {
      S.names[S.cur] = t.value;
      RS.save();
      fillPrintHead();
      const chip = document.querySelector(`#sites .chip[data-site="${S.cur}"]`);
      if (chip) chip.textContent = siteName(S.cur);
    } else if (t.id === "month") {
      if (t.value) { S.month = t.value; RS.save(); render(); }
    } else if (t.id === "nurse") {
      S.nurse = t.value;
      RS.save();
      fillPrintHead();
    }
  });

  document.addEventListener("change", (e) => {
    if (e.target.id === "ncType") $("ncCalc").hidden = e.target.value !== "calc";
  });

  /* ---------- Ce sur quoi on appuie ---------- */
  document.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const d = b.dataset;
    if (d.site !== undefined) { S.cur = +d.site; RS.save(); render(); }
    else if (d.addsite) { S.names.push("Site " + (S.names.length + 1)); S.cur = S.names.length - 1; RS.save(); render(); }
    else if (d.nav) { S.page = d.nav; RS.save(); render(); window.scrollTo(0, 0); }
    else if (d.tab !== undefined) { S.sec = +d.tab; RS.save(); renderSaisie(); fillPrintHead(); }
    else if (d.open !== undefined) { S.cur = +d.open; S.page = "dash"; RS.save(); render(); window.scrollTo(0, 0); }
    else if (d.del) {
      const [si, ri] = d.del.split(":");
      RS.rowsOf(S.cur, RS.allSections()[si], true).splice(+ri, 1);
      RS.save(); renderSaisie(); fillPrintHead();
    }
    else if (d.agepanel) {
      RS.ui.agePanel = d.agepanel === "toggle" ? !RS.ui.agePanel : true;
      renderSaisie(); fillPrintHead();
      const p = $("agepanel");
      if (p) p.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    else if (d.gadd) {
      const name = ($("gn-" + d.gadd).value || "").trim();
      if (!name) { $("gn-" + d.gadd).focus(); return; }
      const list = listOf(d.gadd);
      const after = $("ga-" + d.gadd).value;
      const idx = after ? list.findIndex((x) => x.k === after) : list.length - 1;
      list.splice(idx + 1, 0, { k: (d.gadd === "vac" ? "g" : "a") + Date.now().toString(36), l: name });
      RS.save(); renderSaisie(); fillPrintHead();
      if ($("gn-" + d.gadd)) $("gn-" + d.gadd).focus({ preventScroll: true });
    }
    else if (d.gmove) {
      const [ln, k, dir] = d.gmove.split(":");
      const list = listOf(ln);
      const i = list.findIndex((x) => x.k === k);
      const j = i + Number(dir);
      if (i < 0 || j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
      RS.save(); renderSaisie(); fillPrintHead();
    }
    else if (d.gdel) twoStep(b, "Appuyez encore", () => {
      const [ln, k] = d.gdel.split(":");
      const list = listOf(ln);
      const i = list.findIndex((x) => x.k === k);
      if (i >= 0 && list.length > 1) list.splice(i, 1);
      RS.save(); renderSaisie(); fillPrintHead();
    });
    else if (d.addcol) openPanel();
    else if (d.colpanel) { RS.ui.panel = !RS.ui.panel; renderSaisie(); fillPrintHead(); }
    else if (d.newsheet) { RS.ui.newSheet = !RS.ui.newSheet; renderSaisie(); fillPrintHead(); if ($("nsName")) $("nsName").focus(); }
    else if (d.hidecol) {
      const sec = RS.allSections()[S.sec];
      S.hid[sec.id] = S.hid[sec.id] || {};
      S.hid[sec.id][d.hidecol] = !S.hid[sec.id][d.hidecol];
      RS.save(); renderSaisie(); fillPrintHead();
    }
    else if (d.delcol) {
      const sec = RS.allSections()[S.sec];
      S.cc[sec.id] = (S.cc[sec.id] || []).filter((c) => c.k !== d.delcol);
      RS.save(); renderSaisie(); fillPrintHead();
    }
    else if (b.id === "mkSheet") {
      const name = ($("nsName").value || "").trim();
      if (!name) { $("nsName").focus(); return; }
      const id = "s" + Date.now().toString(36);
      S.cs.push({ id, short: name });
      S.cc[id] = [{ k: "n1", l: "Nombre", t: "num", after: "" }];
      S.sec = RS.allSections().length - 1;
      RS.ui.newSheet = false;
      RS.ui.panel = true;
      RS.save(); renderSaisie(); fillPrintHead();
    }
    else if (b.id === "addCol") {
      const sec = RS.allSections()[S.sec];
      const name = ($("ncName").value || "").trim();
      if (!name) { panelMessage("Écrivez d'abord le nom de la colonne."); $("ncName").focus(); return; }
      const type = $("ncType").value;
      const col = { k: "x" + Date.now().toString(36) + Math.floor(Math.random() * 100), l: name, t: type, after: $("ncAfter").value || "" };
      if (type === "calc") {
        const pick = (cls) => [].map.call(document.querySelectorAll("#colpanel input." + cls + ":checked"), (i) => i.value);
        col.plus = pick("pl");
        col.minus = pick("mn");
        if (!col.plus.length && !col.minus.length) { panelMessage("Pour un calcul, cochez au moins une colonne à additionner ou à soustraire."); return; }
      }
      S.cc[sec.id] = (S.cc[sec.id] || []).concat([col]);
      RS.save(); renderSaisie(); fillPrintHead();
    }
    else if (b.id === "addRow") { RS.rowsOf(S.cur, RS.allSections()[S.sec], true).push({ v: "" }); RS.save(); renderSaisie(); fillPrintHead(); }
    else if (b.id === "reset") twoStep(b, "Appuyez encore pour tout effacer", () => { RS.edit(S.cur); RS.state.months[S.month][S.cur] = RS.freshData(); RS.save(); render(); });
    else if (b.id === "delSheet") twoStep(b, "Appuyez encore pour supprimer", () => {
      const sec = RS.allSections()[S.sec];
      S.cs = S.cs.filter((x) => x.id !== sec.id);
      delete S.cc[sec.id]; delete S.lbl[sec.id]; delete S.hid[sec.id];
      Object.keys(S.months).forEach((mo) => Object.keys(S.months[mo]).forEach((si) => delete S.months[mo][si].d[sec.id]));
      S.sec = 0;
      RS.save(); render();
    });
    else if (b.id === "clearDemo") twoStep(b, "Appuyez encore pour effacer", () => {
      S.months = {};
      S.demo = false;
      RS.save(); render();
    });
    else if (b.id === "print") print(false);
    else if (b.id === "printAll") print(true);
    else if (b.id === "printRep" || b.id === "printSites") print(false);
    else if (b.id === "installApp" && installEvent) {
      installEvent.prompt();
      installEvent.userChoice.then(() => { installEvent = null; if (S.page === "dash") renderDash(); });
    }
  });

  render();

  // Installation comme application : le navigateur nous prévient quand c'est possible.
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    installEvent = e;
    if (S.page === "dash") renderDash();
  });
  window.addEventListener("appinstalled", () => {
    installEvent = null;
    if (S.page === "dash") renderDash();
  });

  // Fonctionnement sans réseau : on garde les fichiers du site sur le téléphone.
  if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();
