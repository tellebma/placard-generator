# Placard Generator

Configurateur de placard sur mesure pour le fabriquer soi-même : conception interactive (plan 2D et vue 3D), puis dossier de fabrication complet — liste de débit, plan de découpe des panneaux, liste de courses et notice de montage, imprimable en PDF.

## Fonctionnalités

- Placard droit ou sous-pente, colonnes, étagères, penderie, portes battantes
- Plan interactif : glisser les étagères, la tringle et les séparations, double-clic pour ajouter
- Vue 3D (three.js) avec portes ouvrables
- Liste de débit (dimensions finies, chants), calepinage par bandes, quincaillerie, budget estimé
- Suivi d'atelier avec cases à cocher, annuler/rétablir, thème sombre, export CSV/JSON

## Développement

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # tests du moteur de calcul (Vitest)
npm run build    # build de production dans dist/
```

## Docker

```bash
docker build -t placard-generator .
docker run -p 8080:8080 placard-generator
```

La CI (GitHub Actions) lance les tests puis publie l'image sur GHCR :
`ghcr.io/tellebma/placard-generator:latest` (branche `main`), plus un tag par commit (`sha-xxxxxxx`) et par version (`v1.2.3` → `1.2.3`, `1.2`).

## Vercel

`vercel.json` configure le build Vite (`dist/`) et la réécriture des routes vers `index.html`. Il suffit d'importer le dépôt dans Vercel.
