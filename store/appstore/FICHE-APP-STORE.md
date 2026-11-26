# RobotKids : dossier de soumission App Store (iPhone)

Préparé le 26 nov. 2026, à partir de la liste de contrôle « app-store-compliance » (lue, pas installée) et de l'état réel du projet.
Achat unique : **robotkids_unlock**, non consommable, 4,99 €. Pas d'abonnement, pas d'essai.

## 1. Audit : ce qui est déjà bon

| Point exigé par Apple | État |
|---|---|
| Aucun SDK d'analyse, de publicité ou de suivi | OK (dépendances : WebView, voix, achats, ouverture de liens) |
| Aucune donnée collectée, aucun compte | OK : pas de suppression de compte à prévoir |
| Achat protégé par un contrôle parental (catégorie Enfants) | OK : achat seulement dans l'espace parents, derrière le code à 4 chiffres |
| Bouton « Restaurer mes achats » (obligatoire pour un non consommable) | OK : écran Achat et écran de verrouillage |
| Politique de confidentialité accessible dans l'appli | OK : lien dans l'espace parents (robotkids.robotkids.workers.dev/privacy) |
| Conditions d'utilisation (EULA) | OK : lien vers le contrat standard d'Apple dans l'espace parents |
| Liens sortants seulement derrière le contrôle parental | OK |
| Chiffrement : `ITSAppUsesNonExemptEncryption` = false | OK |
| Orientation, iPhone seulement | OK |
| **Fichier de confidentialité Apple (PrivacyInfo.xcprivacy)** | **Ajouté aujourd'hui** (aucun suivi, aucune donnée collectée, UserDefaults et dates de fichiers déclarés) |

## 2. À faire de votre côté dans App Store Connect

1. **Catégorie Enfants** : cochez « Kids » pour l'appli, tranche d'âge la plus basse qui s'applique (5 ans et moins). Les règles sont les mêmes pour toutes les tranches.
2. **Achat intégré** : créez `robotkids_unlock` (Non consommable, 4,99 €) et **rattachez-le à la première version de l'appli** avant d'envoyer à la revue. Apple refuse un premier achat envoyé seul.
3. **Confidentialité de l'App Store** (« App Privacy ») : répondez **« Aucune donnée collectée »**.
4. **Questionnaire d'âge** : répondez « Aucun » / « Non » à toutes les questions de contenu sensible.
5. **Captures d'écran iPhone** : faites, 8 images en 1320 × 2868 dans `store/appstore/screenshots/` (script `store/make-screenshots-ios.mjs`). À déposer dans la version 1.0, taille 6,9 pouces.
6. **URL de confidentialité** : https://robotkids.robotkids.workers.dev/privacy (page publiée).
7. **URL d'assistance** : le site RobotKids, ou une adresse e-mail de contact.
8. **Coordonnées pour la revue** : prénom, nom, téléphone au format international (+33…), e-mail.

## 3. Textes de la fiche (limites Apple respectées)

### Français
- **Nom** (30 max) : RobotKids
- **Sous-titre** (30 max) : Jeux, robots et code dès 3 ans
- **Texte promotionnel** (170 max) : Un seul achat, pas d'abonnement : jeux Montessori, blocs, circuits et vrai code pour les enfants de 3 à 12 ans. Sans publicité, fonctionne sans Internet.
- **Mots-clés** (100 max) : enfant,robot,programmation,montessori,code,éducatif,circuit,logique,jeu,maternelle,primaire
- **Description** :
  RobotKids apprend aux enfants de 3 à 12 ans à jouer, construire et programmer des robots.

  POUR LES 3 – 6 ANS : des jeux de style Montessori (chiffres, lettres, couleurs, jours de la semaine) avec une voix qui lit tout.
  POUR LES 6 – 8 ANS : guider un robot avec des blocs, puzzles et défis.
  POUR LES 8 – 12 ANS : monter un circuit (capteurs, lampes, moteurs), puis passer au vrai code.

  PENSÉ POUR LES PARENTS
  • Un seul achat de 4,99 €, une fois pour toutes : pas d'abonnement, pas de renouvellement.
  • Aucune publicité, aucune donnée collectée, aucun compte.
  • Fonctionne sans Internet.
  • L'achat et les réglages sont protégés par un code parent.
  • Plusieurs enfants, limite de temps de jeu, suivi de la progression.

### English
- **Name**: RobotKids
- **Subtitle**: Robots, coding and games 3-12
- **Promotional text**: One purchase, no subscription: Montessori-style games, blocks, circuits and real code for kids aged 3 to 12. No ads, works offline.
- **Keywords**: kids,robot,coding,montessori,programming,educational,circuit,logic,game,preschool,STEM
- **Description**:
  RobotKids teaches children aged 3 to 12 to play, build and program robots.

  AGES 3 – 6: Montessori-style games (numbers, letters, colours, days of the week) with a voice that reads everything aloud.
  AGES 6 – 8: guide a robot with blocks, puzzles and challenges.
  AGES 8 – 12: build a circuit (sensors, lamps, motors), then move on to real code.

  MADE FOR PARENTS
  • One purchase of 4.99 €, once and for all: no subscription, no renewal.
  • No ads, no data collected, no account.
  • Works offline.
  • Purchases and settings are protected by a parent code.
  • Several children, daily play limit, progress tracking.

### Achat intégré `robotkids_unlock`
- **Nom affiché** FR : RobotKids : accès complet · EN : RobotKids: Full access
- **Description** (45 caractères max chez Apple) FR : Débloque tous les jeux, en un seul achat. · EN : Unlocks every game with one purchase.
- **Capture pour la revue** : `store/appstore/iap-review-achat.png` (écran « Achat » de l'espace parents, bouton « Débloquer RobotKids : 4,99 € »).
- **État (26 nov.)** : créé dans App Store Connect (Apple ID 6839771847), 4,99 € base France, tous pays, FR + EN. Reste : déposer la capture de revue.

## 4. Notes pour la revue (champ « Notes » d'App Store Connect)

> RobotKids is a Kids Category app. It has no login, no accounts, no ads, no analytics and collects no data.
> The whole app is locked until a one-time, non-consumable in-app purchase (robotkids_unlock, 4.99 EUR) is made. The purchase is only reachable inside the parent area, which is protected by a 4-digit parent code (parental gate).
>
> How to reach the purchase:
> 1. Launch the app and choose a language.
> 2. First-run parent setup: answer the adult question, create a 4-digit parent code (for example 1234), enter a child name and age.
> 3. On the lock screen tap "Je suis un parent" (I am a parent), enter the parent code.
> 4. The "Achat" screen shows "Débloquer RobotKids : 4,99 €". Use a sandbox account to buy. "Restaurer mes achats" restores it.
>
> Privacy policy and Terms of Use links are inside the parent area. External links are only reachable behind the parent code.
> The app works offline. No hidden or remotely enabled features.

## 5. Risques à surveiller

- **Verrou total avant achat** : Apple l'accepte pour un achat unique, mais un relecteur peut demander ce qu'il voit sans payer. Les notes ci-dessus lui donnent le chemin. Si Apple refuse, la solution est de laisser quelques activités libres.
- **Texte « Google Play »** dans l'appli : les écrans iPhone parlent d'Apple, vérifié dans le code. La page de confidentialité est mise à jour pour citer aussi Apple.
- **Premier achat intégré** : doit partir avec la première version (point 2 de la section 2).
