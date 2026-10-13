# Charte graphique

La version visuelle (écrans, composants) est dans le fichier de design partagé. Ce document donne les valeurs à utiliser dans le code (`css/style.css`).

## Idée

Un registre qui se lit en plein soleil, se remplit avec le pouce et finit sur papier. Le **vert savane** domine. L'**orange soleil** attire l'œil une seule fois par écran, comme la case orange du logo.

Le logo est une grille de 9 cases blanches sur fond vert, avec la case du centre en orange : un tableau.

## Couleurs

| Nom | Valeur | Usage |
| --- | --- | --- |
| Vert savane | `#0E6B4A` | Boutons, identité |
| Vert profond | `#0A4D36` | Titres, totaux, bouton appuyé |
| Vert tendre | `#E4F1EA` | Cases calculées automatiquement |
| Vert total | `#CFE6DA` | Ligne TOTAL |
| Encre | `#12201A` | Texte courant |
| Papier | `#F6F7F4` | Fond des écrans |
| Blanc | `#FFFFFF` | Cases où l'on écrit |
| Ligne | `#CAD5CE` | Bordures des tableaux |
| En-tête | `#E9EFEB` | En-têtes des tableaux |
| Texte atténué | `#4F6258` | Légendes, aides |
| Soleil | `#E8830C` | Accent du logo, anneau de focus |
| Soleil pâle / texte | `#FCEBD2` / `#7A4300` | Avertissements |
| Alerte / pâle | `#B3261E` / `#FBE4E1` | Négatifs, ruptures, erreurs |

Le jeu de couleurs est **clair uniquement** : lisibilité en plein soleil et impression.

## Typographie

| Rôle | Police | Poids | Où |
| --- | --- | --- | --- |
| Titres | Bricolage Grotesque | 600, 700 | Titres d'écran, sections, logo |
| Texte | Public Sans | 400, 500, 600 | Phrases, libellés, boutons |
| Chiffres | IBM Plex Mono | 400 à 600 | Cases de tableau, totaux (alignés à droite) |

Échelle : titre d'écran 28/34 · section 20/26 · corps 16/24 · légende 13/18. Texte des cases de saisie : **16 px minimum** (évite le zoom automatique sur téléphone).

## Formes et espacements

- Espacements en multiples de 4 px (4, 8, 12, 16, 24, 32, 48).
- Cellules de tableau : angles droits. Boutons : 8 px. Cartes : 12 px.
- **Cibles tactiles : 48 px de haut au minimum**, 8 px entre deux boutons.
- Bouton principal en bas de l'écran, à portée du pouce.

## Règles d'usage

1. **Un orange par écran.**
2. **Jamais la couleur seule** : chaque état a aussi un mot ou un signe (⚠, −, OK). Sur une impression noir et blanc, rien ne se perd.
3. **Blanc écrit, vert calcule.** On ne tape jamais dans une case verte.
4. **Chiffres alignés** à droite, police à chiffres de même largeur, espace pour les milliers (2 517).
5. **Impression sobre** : fond blanc, bordures sombres de 1 px, cases calculées en gris clair, en-tête avec site, mois et infirmier.

## Écrire

Phrases courtes, mots du métier, une idée par message. Dates en jj/mm/aaaa, nombres avec un espace (2 517).

| On écrit | On évite |
| --- | --- |
| Enregistré. | Opération réussie avec succès |
| Il manque le nombre de décès. | Erreur 422 |
| Ajouter une colonne | Paramètres du module de colonnes |
