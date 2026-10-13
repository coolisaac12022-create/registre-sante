/* Tests des calculs du registre.
   Lancer avec :  node tests/run.js
   Aucun outil à installer : il faut seulement Node.js. */
const fs = require("fs");
const vm = require("vm");
const path = require("path");
const assert = require("assert");

// Charge les fichiers js/ comme le ferait le navigateur, avec un faux localStorage.
function charger(stockage) {
  const store = stockage || {};
  const ctx = {
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = v; }
    },
    console
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  ["config", "store", "calc"].forEach((f) => {
    const code = fs.readFileSync(path.join(__dirname, "..", "js", f + ".js"), "utf8");
    vm.runInContext(code, ctx, { filename: f + ".js" });
  });
  return ctx.RS;
}

let reussis = 0;
function test(nom, fn) {
  try {
    fn();
    reussis++;
    console.log("OK     " + nom);
  } catch (e) {
    console.error("ECHEC  " + nom + "\n       " + e.message);
    process.exitCode = 1;
  }
}

test("Population fin = début + naissances + arrivées − décès − départs", () => {
  const RS = charger();
  const col = RS.SEC.pop.cols.find((c) => c.k === "f");
  assert.strictEqual(col.f({ d: 100, n: 5, a: 2, m: 3, p: 1 }), 103);
});

test("Les naissances augmentent la population, les décès la réduisent", () => {
  const RS = charger();
  const f = RS.SEC.pop.cols.find((c) => c.k === "f").f;
  const avant = f({ d: 100 });
  assert.ok(f({ d: 100, n: 4 }) > avant);
  assert.ok(f({ d: 100, m: 4 }) < avant);
});

test("Une case vide ou illisible compte pour 0", () => {
  const RS = charger();
  assert.strictEqual(RS.N(""), 0);
  assert.strictEqual(RS.N("abc"), 0);
  assert.strictEqual(RS.N(undefined), 0);
  assert.strictEqual(RS.N("12"), 12);
});

test("Chiffres du mois d'exemple (site 1)", () => {
  const RS = charger();
  const s = RS.summ(0);
  assert.strictEqual(s.popFin, 2517);
  assert.strictEqual(s.nais, 16);
  assert.strictEqual(s.decPop, 6);
  assert.strictEqual(s.cons, 328);
  assert.strictEqual(s.acc, 17);
  assert.strictEqual(s.vacRate, 83);
  assert.strictEqual(s.top, "Paludisme");
});

test("Les données d'exemple ne déclenchent pas d'alerte de cohérence", () => {
  const RS = charger();
  const alertes = RS.summ(0).alerts.join(" | ");
  assert.ok(!/Naissances :/.test(alertes), alertes);
  assert.ok(!/Décès :/.test(alertes), alertes);
  assert.ok(/Amoxicilline/.test(alertes) && /ACT/.test(alertes), "stock bas attendu");
  assert.ok(/Penta 3/.test(alertes) && /VAT/.test(alertes), "vaccins faibles attendus");
});

test("Une incohérence naissances / maternité est signalée", () => {
  const RS = charger();
  RS.edit(0).d.mat[0].viv = "50";
  assert.ok(RS.summ(0).alerts.some((a) => a.startsWith("Naissances")));
});

test("Taux de vaccination du bas = total faits ÷ total prévus", () => {
  const RS = charger();
  const rows = [{ v: "A", p: 20, g1: 14, g2: 2 }, { v: "B", p: 40, g1: 4 }];
  assert.strictEqual(RS.sheetTotals(RS.SEC.vac, rows).r, Math.round((20 / 60) * 100));
});

test("Stock bas : sous le seuil ou négatif", () => {
  const RS = charger();
  assert.strictEqual(RS.stockBas({ d: 100, s: 60, sl: 50 }), true);
  assert.strictEqual(RS.stockBas({ d: 100, s: 10, sl: 50 }), false);
  assert.strictEqual(RS.stockBas({ d: 5, s: 10 }), true);
  assert.strictEqual(RS.stockBas({ d: 0, s: 0, sl: 0 }), false);
});

test("Colonne ajoutée par l'infirmier : placée après la colonne choisie", () => {
  const RS = charger();
  RS.state.cc.mat = [{ k: "x1", l: "CPN 2", t: "num", after: "c1" }];
  const cles = RS.allCols(RS.SEC.mat).map((c) => c.k);
  assert.strictEqual(cles[cles.indexOf("c1") + 1], "x1");
});

test("Colonne de calcul ajoutée (+ / −), même enchaînée", () => {
  const RS = charger();
  RS.state.cc.mat = [
    { k: "x1", l: "Net", t: "calc", plus: ["viv"], minus: ["mn"], after: "mn" },
    { k: "x2", l: "Net x2", t: "calc", plus: ["x1", "x1"], minus: [], after: "x1" }
  ];
  const cols = RS.allCols(RS.SEC.mat);
  const net = cols.find((c) => c.k === "x1");
  const net2 = cols.find((c) => c.k === "x2");
  assert.strictEqual(net.f({ viv: 4, mn: 1 }), 3);
  assert.strictEqual(net2.f({ viv: 4, mn: 1 }), 6);
  const totaux = RS.sheetTotals(RS.SEC.mat, [{ viv: 4, mn: 1 }, { viv: 3, mn: 0 }]);
  assert.strictEqual(totaux.x1, 6);
});

test("Un calcul qui se référence lui-même ne bloque pas", () => {
  const RS = charger();
  RS.state.cc.mat = [{ k: "x1", l: "Boucle", t: "calc", plus: ["x1"], minus: [], after: "" }];
  const c = RS.allCols(RS.SEC.mat).find((x) => x.k === "x1");
  assert.strictEqual(c.f({}), 0);
});

test("Nom de colonne changé et colonne masquée", () => {
  const RS = charger();
  RS.state.lbl.mat = { c4: "CPN 3" };
  RS.state.hid.mat = { mn: true };
  const toutes = RS.allCols(RS.SEC.mat);
  assert.strictEqual(toutes.find((c) => c.k === "c4").l, "CPN 3");
  assert.ok(!RS.visCols(RS.SEC.mat).some((c) => c.k === "mn"));
  assert.ok(RS.visCols(RS.SEC.mat).some((c) => c.k === "v"), "la 1re colonne ne se masque jamais");
});

test("Lire un mois n'en crée pas, y écrire le crée", () => {
  const RS = charger();
  RS.peek(3, "2027-01");
  assert.strictEqual(RS.state.months["2027-01"], undefined);
  RS.edit(3, "2027-01");
  assert.ok(RS.state.months["2027-01"][3]);
});

test("Les données sont retrouvées après rechargement", () => {
  const stock = {};
  const RS = charger(stock);
  RS.edit(0).d.mat[0].viv = "9";
  RS.save();
  const RS2 = charger(stock);
  assert.strictEqual(RS2.peek(0).d.mat[0].viv, "9");
});

test("Lettres de colonnes : A, B, … Z, AA", () => {
  const RS = charger();
  assert.strictEqual(RS.colLetter(0), "A");
  assert.strictEqual(RS.colLetter(25), "Z");
  assert.strictEqual(RS.colLetter(26), "AA");
});

test("Tranche d'âge ajoutée : colonne, total et ligne de la feuille Âges", () => {
  const RS = charger();
  RS.state.ages.push({ k: "x1", l: "Moins de 5 ans" });
  const cols = RS.allCols(RS.SEC.cons).map((c) => c.k);
  assert.ok(cols.includes("x1"));
  assert.strictEqual(cols.indexOf("x1"), cols.indexOf("a4") + 1);
  const r = { a0: 1, x1: 4 };
  assert.strictEqual(RS.ageSum(r), 5);
  const rows = RS.rowsOf(0, RS.SEC.age, true);
  assert.strictEqual(rows.length, 6);
  assert.strictEqual(rows[5].v, "Moins de 5 ans");
});

test("Tranche d'âge renommée, déplacée, supprimée", () => {
  const RS = charger();
  RS.state.ages[0].l = "0–28 jours";
  assert.strictEqual(RS.rowsOf(0, RS.SEC.age, true)[0].v, "0–28 jours");
  assert.strictEqual(RS.rowsOf(0, RS.SEC.age, true)[0].k, "a0");
  const a = RS.state.ages.splice(1, 1)[0]; // supprime « 1–4 ans »
  const rows = RS.rowsOf(0, RS.SEC.age, true);
  assert.strictEqual(rows.length, 4);
  assert.ok(!rows.some((r) => r.k === a.k));
  assert.strictEqual(RS.ageSum({ a1: 50, a2: 2 }), 2);
  RS.state.ages.reverse();
  assert.strictEqual(RS.rowsOf(0, RS.SEC.age, true)[0].k, "a4");
});

test("Groupe de vaccination ajouté compte dans le total faits", () => {
  const RS = charger();
  RS.state.vacGroups.push({ k: "gz", l: "5–14 ans" });
  assert.strictEqual(RS.vacTotal({ g1: 2, gz: 3 }), 5);
  assert.ok(RS.allCols(RS.SEC.vac).some((c) => c.k === "gz"));
});

console.log("\n" + reussis + " tests réussis" + (process.exitCode ? ", avec des échecs" : ""));
