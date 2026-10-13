# Registre Santé

Le registre en ligne d'un infirmier : dispensaire et maternité.

- Tableaux qui ressemblent à Excel : cases blanches pour écrire, **cases vertes qui se calculent seules**
  (les naissances augmentent la population, les décès la réduisent).
- 5 sites ou plus (＋ Site), 7 feuilles de départ, et l'infirmier peut **ajouter ses propres colonnes et feuilles**.
- Tranches d'âge pour la population, les consultations, les décès et la vaccination.
- **Rapport mensuel** prêt à imprimer, avec remarques et signatures.
- Fonctionne **sans réseau** une fois ouvert une première fois (utile en zone rurale).

Pour l'instant, les données restent sur l'appareil (dans le navigateur). La version avec base de données en ligne est décrite dans [`docs/MVP.md`](docs/MVP.md).

## Voir le site sur son ordinateur ou son téléphone

Il n'y a rien à installer. Dans le dossier du projet :

```bash
python3 -m http.server 8000
```

Puis ouvrir `http://localhost:8000` dans le navigateur. (Sur Termux : `pkg install python`, puis la même commande.)

## Vérifier que les calculs sont justes

```bash
node tests/run.js
```

Doit afficher « 15 tests réussis ».

## Mettre le site en ligne avec Vercel

Le dépôt est déjà prêt : pas de build, pas de réglage compliqué.

1. Aller sur [vercel.com](https://vercel.com) et se connecter avec **GitHub**.
2. Appuyer sur **Add New… › Project**, puis **Import** à côté du dépôt `registre-sante`.
3. Laisser les réglages tels quels :
   - Framework Preset : **Other**
   - Build Command : vide
   - Output Directory : vide
4. Appuyer sur **Deploy**. Au bout d'une minute, Vercel donne l'adresse du site (`registre-sante.vercel.app` par exemple).

Ensuite, **chaque fois que le code change sur GitHub, Vercel met le site à jour tout seul**.

Dépôt privé : Vercel peut quand même le publier, il faut seulement autoriser l'accès au dépôt quand Vercel le demande.

## Installer comme une petite application

Plus besoin de chercher le fichier `index.html` : une fois le site en ligne, il s'installe comme une application.

- **Dans le site** : page Accueil, carte « Installer l'application » (Android/Chrome et ordinateur).
- **Android (Chrome)** : menu ⋮ puis « Installer l'application ».
- **iPhone (Safari)** : bouton Partager puis « Sur l'écran d'accueil ».

L'application s'ouvre sans barre d'adresse et fonctionne sans réseau.

**Un vrai fichier APK (facultatif)** : une fois le site sur Vercel, aller sur pwabuilder.com, entrer l'adresse du site, choisir « Package for stores » puis Android. Ce n'est pas encore fait.

## Tranches d'âge modifiables

Sur les feuilles Âges, Consultations, Décès et Vaccination, le bouton « ⚙ Tranches d'âge » permet d'ajouter, renommer, déplacer ou supprimer les tranches d'âge (et les groupes de vaccination). Les colonnes et totaux suivent automatiquement. Les listes sont gardées dans `RS.state.ages` et `RS.state.vacGroups`.

## Où se trouve quoi

| Fichier | Rôle |
| --- | --- |
| `index.html` | La page. |
| `css/style.css` | L'apparence (couleurs et formes de la charte). |
| `js/config.js` | Les feuilles, les colonnes et les formules de départ. |
| `js/store.js` | Où les données sont gardées. C'est ici que la base de données en ligne se branchera. |
| `js/calc.js` | Totaux, chiffres du mois, alertes. |
| `js/app.js` | Les écrans et les boutons. |
| `sw.js`, `manifest.webmanifest` | Fonctionnement sans réseau et installation sur le téléphone. |
| `docs/` | Charte graphique, plan MVP. |
| `SKILL.md` | Consignes à donner à un agent IA qui continue le projet. |
| `tests/run.js` | Tests des calculs. |

## Ce qui reste à confirmer avec l'infirmier

- Les **maladies** à suivre dans son district (les tranches d'âge se règlent déjà dans le site).
- Les formulaires officiels du district, pour copier leurs colonnes.
- Qui doit voir les données (lui seul, un responsable de district ?).
