# Pointage Carrière

**Le pointage hors ligne des stations de concassage et de lavage de sable.** Un appui par employé sur le téléphone, avec ou sans réseau, et un fichier Excel propre pour la paie en fin de mois.

[ⵜⴰⵎⴰⵣⵉⵖⵜ](README.zgh.md) · [العربية](README.ar.md) · **Français** · [English](README.md) · [Español](README.es.md)

<p>
  <img src="docs/screenshots/phone-fr.png" alt="Écran de pointage en français sur téléphone" width="24%">
  <img src="docs/screenshots/phone-month.png" alt="Bilan du mois : jours, absences, heures supplémentaires et paie par employé" width="24%">
  <img src="docs/screenshots/phone-advances.png" alt="Avances d'un employé pour le mois" width="24%">
  <img src="docs/screenshots/phone-offline.png" alt="Mode hors ligne" width="24%">
</p>

## De quoi s'agit-il

Sur la plupart des stations de concassage autour de Marrakech, le pointage tient dans un cahier, puis il est ressaisi dans un fichier Excel qu'une seule personne comprend. Des pages se perdent, les totaux sont faux à la troisième copie, et la paie se discute en fin de mois.

Pointage Carrière remplace le cahier. Le chef de station l'ouvre sur son téléphone, appuie une fois par employé, et le pointage est enregistré sur l'appareil. En fin de mois, un bouton produit le fichier Excel dont le comptable a besoin. L'application fonctionne au fond d'un lit d'oued sans réseau, dans la poussière, avec des gants.

Il est libre d'utilisation, de modification et de partage sous licence MIT. Il ne demande ni compte, ni serveur, ni abonnement.

**Démonstration :** https://meskikcode.github.io/quarry-pointage-lite/ (à ouvrir sur un téléphone, puis à installer).

## Ce que fait l'application

- **Tout le monde présent en un appui.** La plupart des jours, presque tout le monde est là. Un bouton marque toute l'équipe présente (ou une seule équipe), puis on corrige les quelques exceptions. L'action s'annule, et elle n'écrase jamais quelqu'un déjà pointé.
- **Pointage en un appui.** Présent, demi-journée, retard ou absent, sur une seule rangée de grands boutons. Une absence porte un motif : non justifiée, maladie ou autorisée. Un second appui sur le statut choisi l'efface.
- **Le mois en un coup d'œil.** Pour chaque employé : jours travaillés, absences, heures supplémentaires et paie à verser, avec le total du mois, dans l'application et pas seulement dans le fichier Excel.
- **Postes de jour et de nuit**, chacun avec ses pointages, à n'importe quelle date.
- **Heures supplémentaires** par employé et par poste : un bouton « +1 h », qui ouvre un compteur dès qu'il y a des heures à ajuster.
- **L'effectif réel d'une station.** Chef concassage, chef matériel, comptable, électricien-opérateur, soudeur, conducteurs de chargeuse, de pelle et de camion, ouvriers et gardiens. Tout autre poste (pompiste, agent de pesée, magasinier) se saisit avec son propre intitulé, car aucune station n'a le même effectif.
- **Deux modes de paie**, comme sur le terrain :
  - *Mensuel* : sous contrat. Le salaire est dû pour le mois même si des jours manquent, et les heures supplémentaires sont payables.
  - *Journalier* : payé au jour travaillé. Les heures supplémentaires ne sont payées que si un tarif horaire est saisi pour l'employé.
- **Avances.** L'argent remis avant la paie se saisit par employé, avec une date et une note, et se déduit du reste à payer. Un solde négatif s'affiche en rouge.
- **Export Excel mensuel, prêt pour le comptable.** Trois feuilles : un récapitulatif par employé (jours travaillés, absences par motif, heures supplémentaires, salaire de base, heures à payer, paie estimée, avances, reste à payer), tous les pointages, et toutes les avances. Avec titre, en-tête figé, vrais nombres et vraies dates, ligne de total et impression en paysage. C'est une aide à la préparation de la paie, pas une déclaration CNSS.
- **Sauvegarde et restauration.** Les données n'existent que sur l'appareil : toute la base s'enregistre dans un fichier et se restaure depuis ce fichier.
- **Un rappel de sauvegarde.** Dès que la dernière sauvegarde a une semaine (ou trois jours après la première utilisation, sur un appareil jamais sauvegardé), un message le signale, avec le bouton qui la fait.
- **Le mois d'un employé, jour par jour.** Un calendrier montre en couleur le poste de jour et de nuit de chaque date, pour régler en quelques secondes un « j'étais là le 14 ».
- **Le nom du site** en haut de l'écran et sur chaque feuille Excel.
- **Partir d'une liste vide.** Effacer l'équipe d'exemple (et tout le reste) en deux appuis, et supprimer un employé saisi par erreur. Un employé qui a des pointages ou des avances peut seulement être désactivé : aucun mois passé ne change.
- **Accessible.** Chaque écran et chaque fenêtre passe un audit automatique WCAG 2.1 AA en français et en arabe, et tout se commande au clavier.
- **Cinq langues** : tamazight (tifinagh), arabe (de droite à gauche), français, anglais et espagnol.
- **Installable et entièrement hors ligne.** Après la première visite, l'application démarre sans aucun réseau.
- **Toutes les tailles d'écran**, du téléphone de 320 px au moniteur de bureau.

## Confidentialité

Pas de compte, pas de serveur, pas de mesure d'audience. L'application n'envoie aucune requête à un tiers : polices, icônes et bibliothèque Excel sont embarquées. Les noms, les numéros de CIN et les salaires restent dans la base du navigateur, sur l'appareil, et n'en sortent que dans les fichiers exportés par l'utilisateur. Un test automatique échoue si l'application contacte une autre origine.

## Installer sur un téléphone

1. Ouvrir la démonstration dans Chrome sur Android (ou Safari sur iPhone).
2. Chrome : menu, puis **Ajouter à l'écran d'accueil** ou **Installer l'application**. Safari : Partager, puis **Sur l'écran d'accueil**.
3. Ouvrir l'application depuis l'écran d'accueil. Elle fonctionne désormais sans connexion.

L'équipe affichée au premier lancement est fictive. Modifier ou désactiver ces fiches, puis saisir l'effectif réel.

## Lancer en local

Node.js 22.12 ou plus récent.

```bash
git clone https://github.com/MeskikCode/quarry-pointage-lite.git
cd quarry-pointage-lite
npm install
npm run dev          # serveur de développement sur http://localhost:3000
```

Le service worker n'est actif que dans la version de production :

```bash
npm run build        # export statique dans out/, avec le service worker
npm run preview      # sert out/ sur http://localhost:4173
```

Vérifications : `npm run lint`, `npm run typecheck`, `npm test` (164 tests unitaires), `npm run test:e2e` (96 tests de bout en bout, audit d'accessibilité compris, téléphone et bureau).

## Qualité mesurée

Lighthouse 13.6 sur la version de production, médiane de trois mesures sur un téléphone moyen simulé (4G lente, processeur 4 fois plus lent) : performance 89 sur un téléphone en français, 90 en arabe, 68 en anglais; accessibilité, bonnes pratiques et référencement à 100. Le contenu s'affiche en 1,1 s en français et en arabe. Le détail et les réserves sont dans le [README anglais](README.md#measured-quality).

## Comment c'est construit

Next.js exporté en fichiers statiques, base IndexedDB (Dexie) sur l'appareil, service worker Serwist qui met tout l'export en cache, write-excel-file pour Excel, Tailwind CSS sur les jetons du système de design MeskikCode. Les règles (pointage, paie, export, sauvegarde) sont des fonctions simples dans `src/lib/`, testées sans navigateur.

La documentation technique est en anglais : [conception du système](docs/system-design.md), [modèle de données](docs/data-model.md), [système de design](docs/design-system.md), [traductions](docs/translations.md), [cahier des charges](BLUEPRINT.md).

## État des traductions

Le français, l'arabe, l'anglais et l'espagnol ont été rédigés par MeskikCode. **Les textes en tamazight sont un brouillon** qui n'a pas encore été relu par un lecteur natif. Les corrections sont les bienvenues : voir [docs/translations.md](docs/translations.md).

## Périmètre

Le projet reste volontairement réduit, pour fonctionner entièrement hors ligne sur un seul téléphone, sans rien à configurer. Il ne comprend pas :

- la synchronisation entre plusieurs téléphones, ni de tableau de bord au bureau ;
- le lien avec les bons de pesée et le tonnage produit ;
- la paie complète : retenues CNSS et fiscales, prêts sur plusieurs mois, bulletins imprimés.

Les idées et les besoins venus du terrain sont les bienvenus sous forme d'[issues](https://github.com/MeskikCode/quarry-pointage-lite/issues).

## Licence

Le code est publié sous [licence MIT](LICENSE), copyright Abdelmalek MESKIK. Le nom et le logo MeskikCode ne sont pas couverts par cette licence. Les polices sont sous licence SIL Open Font License.

---

Maintenu par [MeskikCode](https://meskikcode.com) à Marrakech (nom commercial d'Abdelmalek MESKIK).
