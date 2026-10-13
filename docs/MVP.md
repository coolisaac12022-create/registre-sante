# MVP : ce qui est fait, ce qui vient ensuite

**Objectif du MVP :** un infirmier remplit son registre du mois sur téléphone, voit les totaux se calculer, et imprime son rapport mensuel, sans Excel.

Priorité de travail : **le front-end d'abord** (ce que l'infirmier voit et touche), **le back-end ensuite** (garder les données en ligne).

## Version 1 : fait (front-end, sans serveur)

- [x] 4 écrans : Accueil, Saisie, Rapport, Sites
- [x] 7 feuilles : Population, Âges, Consultations, Maternité, Décès, Vaccination, Stock
- [x] Formules automatiques et ligne TOTAL
- [x] 5 sites, bouton ＋ Site
- [x] Colonnes ajoutables, renommables, masquables (type Nombre, Texte ou Calcul + / −)
- [x] Feuilles ajoutables
- [x] Un registre par mois
- [x] Alertes : stock bas, vaccins sous 80 %, chiffres différents entre deux feuilles
- [x] Impression A4 paysage (une feuille ou toutes)
- [x] Fonctionne sans réseau, installable sur Android
- [x] Données gardées sur l'appareil

**Limite connue :** les données ne quittent pas le téléphone. Si le téléphone est perdu ou le navigateur vidé, elles sont perdues.

## Version 1.1 : à faire ensuite (front-end)

1. Voir l'infirmier utiliser la version 1 et noter ce qui gêne (ses colonnes, ses maladies, ses mots).
2. Copier les colonnes des formulaires officiels du district.
3. Bouton **Exporter en fichier** (copie de sauvegarde) et **Importer**. Utile avant la base de données.
4. Supprimer un site, déplacer une colonne.
5. Rapport en **PDF** directement (aujourd'hui : Imprimer › Enregistrer en PDF).

## Version 2 : back-end (données en ligne)

Pour retrouver ses données sur n'importe quel téléphone et ne jamais les perdre.

**Choix recommandé : Supabase** (base de données PostgreSQL + connexion avec mot de passe, offre gratuite), appelé directement depuis le site hébergé sur Vercel. Pas de serveur à écrire.

Étapes :

1. Créer un projet Supabase, activer la connexion par e-mail.
2. Créer les tables (esquisse ci-dessous) avec la règle « chacun ne voit que ses données » (Row Level Security).
3. Dans `js/store.js`, remplacer `RS.storage.load / save` par des appels à Supabase. Le reste du site ne change pas.
4. Écran de **connexion** (e-mail + mot de passe).
5. Garder une copie locale pour travailler sans réseau, puis **synchroniser** au retour du réseau.

```sql
-- Esquisse, à adapter
create table sites (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users,
  name text not null
);
create table periods (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites on delete cascade,
  month date not null,
  notes jsonb not null default '{}',
  unique (site_id, month)
);
create table sheet_rows (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references periods on delete cascade,
  sheet text not null,
  position int not null,
  data jsonb not null default '{}'
);
create table custom_columns (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users,
  sheet text not null,
  key text not null,
  label text not null,
  kind text not null check (kind in ('num','text','calc')),
  after_key text,
  plus text[] default '{}',
  minus text[] default '{}'
);
-- Row Level Security : owner = auth.uid() sur chaque table (via sites pour periods et sheet_rows)
```

## Plus tard

- Plusieurs infirmiers, un responsable de district qui voit tous les sites.
- Statistiques sur plusieurs mois (courbes).
- Rappel quand le rapport du mois n'est pas rempli.

## Données de santé : à faire avant de saisir de vrais patients

Ce registre contient des **chiffres**, pas de noms de patients. Garder cette règle : ne jamais ajouter de nom, de téléphone ou d'adresse de patient sans en parler à l'infirmier et à son responsable. Avant d'ouvrir la version en ligne, vérifier avec l'infirmier ce que son district exige pour la protection des données.
