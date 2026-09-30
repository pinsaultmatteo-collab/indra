# Refonte indra.fr — maquette fonctionnelle

Site statique (HTML, CSS, JavaScript) : aucune dépendance à installer.

## Lancer la maquette

```bash
node tools/serve.js "$(pwd)/site" 8790
```

Puis ouvrir http://localhost:8790. Le double-clic sur `site/index.html` fonctionne aussi, mais le serveur local est recommandé pour les animations au défilement.

Les bibliothèques (GSAP, Lenis, Three.js) et les polices Google sont chargées depuis des CDN : une connexion internet est nécessaire lors de la démonstration.

## Arborescence (section 11 de la fiche de référence)

| Page | Fichier | Point fort |
| --- | --- | --- |
| Accueil | `index.html` | Hero 3D : un VHU en nuage de points qui se déconstruit en 6 familles de matières au défilement ; process en 5 étapes épinglé ; carte du réseau ; boucle TFIN |
| Assureurs | `assureurs.html` | Parcours d'un véhicule sinistré, maquette SIRA avec carte, formulaire rendez-vous grands comptes |
| Constructeurs | `constructeurs.html` | Objectifs REP animés, guichet unique, vue éclatée 3D d'un pack batterie, reporting |
| Le réseau | `reseau.html` | Carte interactive des 351 centres (recherche ville / CP / département, DROM), standards, rejoindre, cas Cazenave |
| Nos sites industriels | `sites-industriels.html` | 9 sites, studio photo, programme d'acquisitions |
| Pièces de réemploi | `pieces-reemploi.html` | 3 gammes, Opisto / Precis / Digipiec, traçabilité, ACV |
| Innovation & R&D | `innovation.html` | 7 programmes (verre, batteries, PP, cuivre, ergonomie, éco-conception, CIDER), frise digitale |
| AURECA | `aureca.html` | Catalogue 9 domaines, indicateurs 2025, témoignages réels |
| Particuliers | `particuliers.html` | Renvoi Goodbye Car, FAQ |
| À propos | `a-propos.html` | Frise 1985-2027, chaîne TFIN, gouvernance, certifications, marques, carrières |
| Actualités & presse | `actualites.html` | 12 actualités, médiathèque, communiqués |
| Contact | `contact.html` | Formulaire par profil (`?profil=assureur|constructeur|centre`), collectivités / SDIS |

## Charte

- Logo INDRA reconstruit en vecteur propre (`assets/img/logo-indra.svg`, `logo-indra-white.svg`, `logo-mark.svg`) à partir du logo officiel : « in » vert INDRA `#a0bf38`, « dra » acier dégradé, baseline « AUTOMOBILE RECYCLING ».
- Couleurs : vert INDRA `#a0bf38`, vert profond `#566d0f`, anthracite `#0a0d0b`, acier `#b4bec5`.
- Typographies : Raleway (police de la charte actuelle), Barlow Condensed (chiffres et labels), IBM Plex Mono (données techniques).
- Photos : sélection de la médiathèque indra.fr (77 médias) et des visuels The Future Is NEUTRAL (portrait Xavier Kaufman, 40 ans, atelier). Retaillées à 1800 px.
- Véhicule du hero (`assets/img/hero-car.webp`) : Renault Clio III, photo Daddi09, CC BY-SA 3.0, Wikimedia Commons, détourée (dérivé sous la même licence, crédit affiché dans le pied de page). Toute image PNG détourée peut la remplacer ; les repères de roues et vitrages se règlent dans `index.html` (option `cfg` de `INDRA.initHero`).

## Chiffres affichés — à valider avec INDRA avant mise en ligne

Conformément à la fiche de référence, ces chiffres viennent de sources publiques qui se contredisent parfois. Ils sont affichés dans la maquette pour la démonstration et doivent être arbitrés :

| Chiffre affiché | Source retenue | Alternative |
| --- | --- | --- |
| 350+ centres agréés | Communiqué 40 ans (TFIN, janv. 2026) | 235 (page TFIN), 330 (accueil actuel), 430+ réseaux élargis |
| 425 000 VHU / an | Communiqué 40 ans, nomination Kaufman | 330 000 (page TFIN) |
| 96,8 % TRV | indra.fr, dernière publication ADEME citée | « > 95 % » (TFIN 2026) |
| Réemploi > 15 % | Notes de Sophie Cazenave | à confirmer par la déclaration ADEME 2024/2025 |
| 39 assureurs, 15 constructeurs | TFIN 2026 | logos à obtenir |
| Garanties PIEC (12 / 6 mois par gamme) | Site actuel : « garantie 1 an / 6 mois » | répartition exacte par gamme à confirmer |
| Délais d'enlèvement J+1 à J+3, ≤ 72 h (SIRA) | Illustration | délais contractuels réels |
| Tableau de bord REP (page Constructeurs) | Données d'illustration, indiqué sur la page | — |
| Photos des 9 sites | Non disponibles publiquement | shooting à prévoir |

Liens externes SIRA (`sira.indra.fr`), catalogue PDF, présentation PDF : adresses à confirmer.

## Données

- `assets/data/reseau.js` : les 351 centres de l'annuaire indra.fr (nom, adresse, téléphone, coordonnées) projetés pour la carte SVG.
- `assets/data/france.js` : contours des 96 départements (simplifiés).
