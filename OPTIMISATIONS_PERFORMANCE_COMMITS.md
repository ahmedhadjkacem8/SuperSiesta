# Optimisations de performances — commits récents

Ce document décrit les optimisations visibles dans le code à l’issue des
commits orientés performance du 11 et du 12 octobre 2026. Les commits du
13 octobre consultés portent principalement sur des fonctionnalités et ne
décrivent pas de nouvelle optimisation de performance.

## Commits concernés

- `abdd47c` — `optimiser les images et le performance de site`
- `0345816` — `perf(frontend): prioritize hero LCP image`
- `a8eb23a` — `perf(frontend): defer GTM and Meta Pixel`
- `2749ac2` — `optimisation`

Les changements des commits `0345816` et `a8eb23a` ont ensuite été partiellement
annulés par `ab59e61` (`retour`). Les éléments ci-dessous décrivent le
fonctionnement final présent dans le code, consolidé ou réintroduit dans
`2749ac2`, et non une simple addition des changements de chaque commit.

## 1. Images : moins de données téléchargées

- Le backend expose une route d’images redimensionnées. Elle accepte des
  largeurs prédéfinies (96, 192, 384, 768, 1200 et 1600 px), réduit l’image à
  la largeur demandée et la sert au format WebP.
- Les variantes générées sont enregistrées et réutilisées. Leur nom est dérivé
  du chemin, de la date de modification de l’original et de la largeur : une
  nouvelle génération est donc nécessaire si la source change.
- `ResponsiveImage` produit un `srcSet` de variantes afin que le navigateur
  puisse choisir une taille adaptée. Les images sont chargées en différé par
  défaut et décodées de façon asynchrone. Le composant fournit aussi des
  dimensions pour limiter les décalages de mise en page et revient à l’image
  originale si la variante optimisée échoue.
- Le premier visuel du carrousel d’accueil est prioritaire (`eager` et priorité
  réseau élevée) pour aider le LCP. Les autres visuels ne sont pas tous
  téléchargés avec la même priorité ; le premier visuel est préchargé lorsque
  les données du carrousel sont disponibles.

Fichiers principaux : `SuperSiestaApi/app/Http/Controllers/Api/OptimizedImageController.php`,
`SuperSiestaFront/src/utils/imageUtils.ts`,
`SuperSiestaFront/src/components/ResponsiveImage.tsx` et
`SuperSiestaFront/src/components/HeroSlider.tsx`.

## 2. JavaScript chargé à la demande

- Les pages secondaires, y compris les pages d’administration, utilisent
  `React.lazy()` et un `Suspense` avec un fallback léger. La page d’accueil
  reste chargée directement.
- Vite sépare les dépendances React, le routeur et les animations dans des
  chunks distincts pour mieux répartir le code téléchargé.
- Les icônes gérées par `LucideIcon` sont importées individuellement et à la
  demande au lieu de charger ces icônes avec le bundle initial.
- Le visualiseur 3D (`@google/model-viewer`) est importé lorsqu’il approche de
  la zone visible, grâce à `IntersectionObserver`. Son code et le modèle 3D ne
  sont donc pas nécessaires au premier affichage si cette section reste hors
  écran.
- Un rapport de taille des bundles peut être produit à la demande avec
  `ANALYZE=true`; il ne s’ouvre pas automatiquement et reste un outil
  d’analyse local.

Fichiers principaux : `SuperSiestaFront/src/App.tsx`,
`SuperSiestaFront/vite.config.ts`,
`SuperSiestaFront/src/components/common/LucideIcon.tsx` et
`SuperSiestaFront/src/hooks/useLazyModelViewer.ts`.

## 3. Scripts tiers différés

- Google Tag Manager et Meta Pixel ne bloquent plus le chargement initial avec
  des scripts synchrones dans le HTML.
- Leur téléchargement démarre à la première interaction, ou après le
  chargement de la page lorsque le navigateur est inactif (avec un délai de
  repli si `requestIdleCallback` n’est pas disponible).
- Des files d’attente sont initialisées avant le chargement des scripts pour
  conserver les événements de suivi émis entre-temps.

Fichier principal : `SuperSiestaFront/src/services/thirdParties.ts`.

## 4. Réactivité de l’interface

- `yieldToMain()` cède la main au navigateur avec `scheduler.yield()` lorsque
  disponible, et utilise `setTimeout(0)` en solution de repli.
- La boutique s’appuie sur les mécanismes React de mise à jour différée et de
  mémorisation là où ils sont utilisés, afin d’éviter que les mises à jour de
  filtres, de tri ou de listes ne monopolisent inutilement le rendu.

Fichiers principaux : `SuperSiestaFront/src/utils/yieldToMain.ts`,
`SuperSiestaFront/src/pages/Boutique.tsx` et
`SuperSiestaFront/src/components/ProductCard.tsx`.

## 5. Cache et transfert réseau

- Nginx active gzip pour les ressources textuelles configurées ainsi que HTTP/2
  pour le serveur HTTPS.
- Les fichiers versionnés de `/assets/`, images et polices reçoivent une
  politique de cache d’un an (`immutable`), tandis que `index.html` est servi
  avec `no-cache` afin que le navigateur puisse récupérer les nouvelles
  références de bundles après un déploiement.
- Le backend applique des règles de cache différenciées : les ressources
  publiques et les variantes d’images peuvent être mises en cache, les
  réponses GET API non dynamiques ont un cache court, et les entités dynamiques
  (commandes, devis, factures, produits et clients) ne sont pas mises en cache.

Fichiers principaux : `SuperSiestaFront/docker/nginx/frontend.conf` et
`SuperSiestaApi/app/Http/Middleware/OptimizeHttpCache.php`.

## Résultats et limites

Ces modifications réduisent le travail et les ressources nécessaires au
chargement initial, favorisent les images adaptées à l’écran et améliorent la
réactivité perçue. Les commits seuls ne démontrent toutefois pas un gain
chiffré en production. Aucune valeur de baisse du LCP, de l’INP ou du poids
téléchargé n’est attribuée ici sans mesures comparables.

Pour quantifier l’impact, comparer avant et après déploiement avec Lighthouse
mobile, dans les mêmes conditions, et relever au minimum LCP, INP, CLS, TBT et
les tailles transférées. Vérifier également les en-têtes de cache et le
chargement effectif des variantes WebP sur le serveur déployé.
