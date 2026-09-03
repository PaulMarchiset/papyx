# Papyx

**Les outils PDF du quotidien, sans rien envoyer nulle part.**

Fusionner, découper, compresser, convertir des images en PDF, exporter des pages
en images, apposer un filigrane, numéroter, extraire le texte, corriger les
métadonnées : les mêmes gestes qu'un iLovePDF ou un Smallpdf, mais **tout se
passe sur votre machine**. Aucun fichier ne part sur un serveur, il n'y a ni
compte, ni file d'attente, ni limite de taille — et l'application ne fait
littéralement aucune requête réseau.

Cousin de [FFkit](https://github.com/PaulMarchiset/ffkit) : même pile technique
(Tauri 2 + React + Tailwind), même langage visuel, autre domaine.

## Les outils

| Outil | Ce qu'il fait |
|---|---|
| **Images → PDF** | Assemble JPG / PNG / WebP / AVIF en un document, format et marges au choix |
| **Fusionner** | Met bout à bout plusieurs PDF, dans l'ordre que vous fixez |
| **Diviser** | Par intervalles (`1-3, 8-10`), toutes les N pages, une page par fichier, ou extraction d'une sélection |
| **Organiser** | Vignettes de toutes les pages : réordonner, pivoter, supprimer |
| **PDF → Images** | Chaque page en PNG / JPG / WebP, de 72 à 600 DPI |
| **Compresser** | Rééchantillonne les pages en JPEG (trois niveaux, niveaux de gris en option) |
| **Filigrane** | Texte en travers des pages, centré ou en mosaïque, angle et opacité réglables |
| **Numéroter** | Numéros de page, position, format (`{n} / {total}`), page de départ |
| **Extraire le texte** | Récupère la couche texte dans un `.txt` |
| **Métadonnées** | Lit et réécrit titre, auteur, sujet, mots-clés, créateur, producteur |

Les documents protégés par mot de passe s'ouvrent dans les outils qui passent par
le moteur de rendu (PDF → Images, Compresser, Extraire le texte) : le mot de
passe se saisit dans la fiche du fichier.

## Prérequis

- Node.js 20+
- Rust stable (pour compiler l'application de bureau)

## Démarrer

```bash
npm install          # installe et copie les ressources pdf.js dans public/
npm run tauri dev    # application de bureau
npm run dev          # ou simplement le front dans un navigateur (voir plus bas)
```

## Construire

```bash
npm run tauri build
```

Les installeurs sortent dans `src-tauri/target/release/bundle/`.

## Tests

```bash
npm run build      # tsc --noEmit puis vite build — la vérification de types fait foi
npm run test:unit  # Vitest : les opérations PDF, sur de vrais documents générés
npm run test:e2e   # Playwright : les parcours complets dans un vrai navigateur
```

## Parcours

Tout se passe sur une seule page : les documents en haut, la grille d'outils en
dessous, et les réglages de l'outil choisi juste en dessous d'elle. Choisir un
outil n'ouvre pas d'écran — la grille se replie en une rangée, et en changer
coûte un clic.

Les deux ordres fonctionnent : choisir un outil puis lui donner des fichiers, ou
déposer les fichiers d'abord — la grille grise alors les outils qui ne savent pas
les lire. Les documents chargés restent en place quel que soit l'outil, et le
résultat d'un traitement peut alimenter le suivant sans repasser par le disque.

Un traitement se termine en un clic quand un dossier de sortie fixe est défini
(les fichiers y sont écrits dès la fin du run) ; sinon le bouton devient
« Enregistrer », au même endroit.

## Comment c'est fait

Tout le traitement PDF vit dans le front, dans la webview :

- **[pdf-lib](https://pdf-lib.js.org/)** pour tout ce qui est structurel — pages,
  ordre, rotation, filigranes, numéros, métadonnées. Le texte reste du texte, les
  vecteurs restent des vecteurs.
- **[pdf.js](https://mozilla.github.io/pdf.js/)** pour tout ce qui demande un
  rendu — vignettes, export en images, compression, extraction de texte. Ses
  tables CMap et polices standard sont recopiées dans `public/pdfjs/` au moment
  du `npm install` : elles sont servies depuis le disque, jamais depuis un CDN.

Le Rust (`src-tauri/`) ne fait que le strict minimum qu'une page web ne sait pas
faire : boîtes de dialogue natives, lecture/écriture des fichiers choisis, et
« afficher dans le dossier ». Aucune commande ne prend d'URL, il n'y a pas de
client HTTP dans le binaire.

Le dépôt de fichiers passe par l'API HTML5 plutôt que par le gestionnaire natif
de Tauri : sous Windows, ce dernier désactive le glisser-déposer *dans* la page,
dont dépendent la réorganisation des fichiers et des pages. Un fichier déposé
arrive donc sans son chemin d'origine — ce qui ne coûte qu'une infobulle, les
résultats étant écrits là où vous le demandez.

Conséquence utile : `npm run dev` ouvre la même application dans un navigateur
ordinaire, où les appels natifs retombent sur `<input type=file>` et des
téléchargements (voir `src/lib/services/fileSystem.ts`). C'est ce qui permet aux
tests Playwright de couvrir les parcours réels sans compiler le Rust.

## Ce que l'application ne fait pas

- **Chiffrer / déchiffrer.** pdf-lib ne sait pas écrire de PDF protégé. On peut
  *lire* un document protégé avec son mot de passe, pas en produire un.
- **Compresser sans perte.** « Compresser » rééchantillonne les pages en images :
  c'est efficace sur des scans, mais le résultat n'a plus de texte sélectionnable.
  L'interface le dit ; les autres outils, eux, ne touchent pas au contenu.
- **OCR.** Un scan sans couche texte ressort vide de l'extracteur de texte.
- **Filigranes hors alphabet latin.** Les tampons utilisent Helvetica (police
  standard, non embarquée) : le latin étendu passe, le cyrillique ou le japonais
  non.

## Licence

GPL-3.0
