---
name: registre-sante
description: Continuer le développement du site Registre Santé (registre en ligne du dispensaire et de la maternité d'un infirmier en Côte d'Ivoire). Front-end d'abord, back-end ensuite. À utiliser pour toute modification de l'interface, des tableaux, des formules ou de la base de données.
---

# Registre Santé : consignes de travail

## Le projet en une phrase

Un site où un infirmier remplit des tableaux type Excel (maternité, dispensaire, plusieurs sites), voit les totaux se calculer, et imprime un rapport mensuel. Utilisé surtout sur un téléphone Android, parfois sans réseau, en zone rurale du nord de la Côte d'Ivoire.

## Priorités : 70 % front-end, 30 % back-end

Toujours finir et tester le front-end avant de toucher au back-end. Le front-end est ce que l'infirmier voit : si le tableau est lent, confus ou illisible, rien d'autre n'a d'importance.

## Parler à Isaac

L'utilisateur est débutant et écrit en français. Expliquer lentement, **une idée à la fois**, avec des étapes numérotées. Donner l'action exacte (quel bouton, quelle commande). Montrer un aperçu visuel dès que possible. Pas de jargon sans explication.

## Front-end (priorité 1)

### Règles de conception

1. **Suivre la charte** (`docs/CHARTE.md`) : couleurs, polices, formes. Ne jamais inventer une nouvelle couleur : ajouter une variable `--nom` dans `:root` de `css/style.css`.
2. **Mobile d'abord.** Tout doit marcher à 390 px de large. Cibles tactiles de 48 px minimum. Texte de saisie à 16 px minimum.
3. **Blanc écrit, vert calcule.** Une case verte n'est jamais modifiable.
4. **Jamais la couleur seule** : ajouter un mot ou un signe (⚠, −, OK) à tout état.
5. **Un orange par écran.**
6. **Imprimable.** Toute nouvelle page ou feuille doit avoir un rendu `@media print` propre (A4 paysage, noir et blanc).
7. **Textes en français simple**, phrases courtes. Messages d'erreur : ce qui manque et comment corriger.
8. **Accessibilité** : vrais `<button>` et `<label>`, `aria-label` sur les boutons-icônes, anneau de focus visible.

### Structure du code

Site statique sans outil de build, pour qu'il s'ouvre partout et se publie sur Vercel tel quel.

- `js/config.js` : feuilles, colonnes, formules. **Ajouter une colonne ou une feuille de départ se fait ici.**
- `js/store.js` : état et stockage (`RS.storage`). Seul fichier à changer pour brancher la base de données.
- `js/calc.js` : totaux, résumé du mois, alertes.
- `js/app.js` : écrans et événements.
- Scripts classiques chargés dans l'ordre (pas de modules ES) pour que `index.html` marche aussi ouvert depuis un fichier.

### Une colonne

`{ k: clé, l: libellé, t: "text" | "num" | "calc", tot: 1, f: (ligne) => nombre }`. Les nombres passent toujours par `RS.N()` (case vide = 0).

### Avant de dire « c'est fini »

1. `node tests/run.js` : tous les tests passent.
2. Ouvrir le site à 390 px et à 1280 px : pas de défilement horizontal de la page, tableaux lisibles.
3. Saisir un chiffre : la case verte et le TOTAL changent.
4. Aperçu d'impression de chaque feuille.
5. Recharger : les données sont toujours là.
6. Couper le réseau, recharger : le site s'ouvre.

## Back-end (priorité 2)

Ne commencer qu'après accord sur le front-end.

- **Choix :** Supabase (PostgreSQL + connexion), appelé depuis le navigateur. Pas de serveur à écrire. Schéma et étapes dans `docs/MVP.md`.
- **Une seule porte d'entrée :** remplacer `RS.storage.load/save` dans `js/store.js`. Les écrans ne parlent jamais directement à la base.
- **Hors réseau d'abord :** garder la copie locale, envoyer en ligne au retour du réseau. Ne jamais bloquer la saisie à cause du réseau.
- **Sécurité :** activer Row Level Security sur chaque table (chacun ne voit que ses données). Les clés Supabase « anon » peuvent être dans le code, jamais la clé « service_role ». Aucun secret dans GitHub.

## Données de santé

Le registre contient des **chiffres agrégés**, pas des patients. Ne jamais ajouter de nom, téléphone, adresse ou autre donnée identifiant un patient. Si l'infirmier le demande, en parler d'abord avec lui et son responsable.

## Publication

GitHub (`main`) → Vercel (Framework : Other, pas de build). Chaque envoi sur `main` met le site en ligne. Vérifier le site en ligne après chaque envoi.
