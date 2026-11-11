# RobotKids — dossier de publication Google Play

Fichier à publier : `release/RobotKids-5.7.3-release.aab` (Google Play n'accepte plus les .apk pour une nouvelle appli).
Fichier pour essayer sur un téléphone : `release/RobotKids-5.7.3-release.apk` (même contenu, même signature).

## 1. Identité technique (déjà réglée)
| | |
|---|---|
| Identifiant | `com.robotkids.app` (définitif après la première publication) |
| Version | 5.7.3 (code 60) — à augmenter à chaque nouvelle mise en ligne (`flutter_app/pubspec.yaml`, ligne `version:`) |
| Android cible | 36 (Android 16, exigé par Google Play depuis le 31 août 2026) · minimum : Android 7 (API 24) |
| Architectures | arm64-v8a, armeabi-v7a, x86_64 (64 bits inclus) |
| Autorisations | `INTERNET` (le serveur local de l'appli), `ACCESS_NETWORK_STATE` et `BILLING` (abonnement Google Play) — aucune autorisation sensible, pas d'identifiant publicitaire |
| Trafic réseau | seul `localhost` est autorisé en clair (`network_security_config.xml`) ; rien d'autre |
| Sauvegarde Android | désactivée (les données des enfants ne partent pas dans le cloud) |
| Réduction du code | R8 + réduction des ressources activés |
| Signature | clé d'envoi `android/upload-keystore.jks` (mots de passe dans `android/key.properties`) |

**⚠️ Sauvegardez `flutter_app/android/upload-keystore.jks` et `flutter_app/android/key.properties` dans un endroit sûr (coffre de mots de passe, disque externe).** Ils ne sont pas dans git. Si vous les perdez, Google peut réinitialiser la clé d'envoi (case « Play App Signing », recommandée : activée par défaut), mais c'est une démarche longue.

## 2. Avant de commencer dans la Play Console
1. Compte développeur Google Play (25 $, une fois). **Comptes personnels créés après nov. 2023** : il faut un **test fermé avec 12 testeurs pendant 14 jours** avant de demander la production. Un compte « organisation » n'a pas cette obligation.
2. Créer l'application : nom, langue par défaut **Anglais (États-Unis) – en-US** (le français est ajouté ensuite comme traduction), nom du package `com.robotkids.app`, « Application », **« Gratuite »** (le téléchargement est gratuit ; l'abonnement est un achat intégré, voir section 8 — ne pas choisir « Payante », qui ferait payer le téléchargement en plus).
3. Politique de confidentialité (déjà en ligne, en anglais puis en français, avec l'e-mail de contact) : **https://robotkids.robotkids.workers.dev/privacy** — à coller dans la Play Console. Site de présentation : https://robotkids.robotkids.workers.dev/ (dossier `site/`, publié avec `npx wrangler deploy`).

## 3. Fiche du store (copier-coller)
**Titre (30 caractères max)** — EN (par défaut) : `RobotKids: Coding & Games` · FR : `RobotKids : code & jeux`

**Description courte (80 max) — FR** : `Robots, code et jeux Montessori pour enfants de 3 à 12 ans. Sans pub.`
**Short description — EN** : `Robots, coding and Montessori games for kids 3–12. No ads.`

**Description complète — FR**
> RobotKids apprend la robotique et la programmation aux enfants de 3 à 12 ans, en jouant, sans publicité et sans connexion Internet. Essai gratuit de 7 jours, puis abonnement (mensuel ou annuel).
>
> 🧒 Pour les 3-6 ans : jeux de style Montessori dans l'univers des robots — chiffres, lettres, couleurs, jours de la semaine, mois, formes, tailles, sons, additions, horloge… Chaque jeu commence par un petit cours avec un exemple, puis des indices lumineux aident l'enfant. Tout est dit à voix haute : l'enfant n'a pas besoin de savoir lire.
>
> 🤖 Pour les 6-12 ans : guider un robot avec des blocs, puis écrire du vrai code (Python et JavaScript), assembler une carte électronique (batterie, capteurs, moteurs, lampe, haut-parleur), relever des défis du jour et construire son « Grand Projet ». Un parcours de 11 aventures qui s'adapte à l'âge.
>
> 👨‍👩‍👧 Pensé pour les parents : plusieurs profils d'enfants, espace parents protégé par un code secret, suivi des progrès, limite de temps par jour, choix des cartes ouvertes ou bloquées.
>
> 🔒 Respect de la vie privée : aucune publicité, aucun compte, aucune donnée envoyée. Tout reste sur l'appareil ; le paiement est géré par Google Play.
>
> 🌍 Disponible en français et en anglais, choisi au premier lancement.

**Full description — EN**
> RobotKids teaches robotics and programming to children aged 3 to 12 through play — no ads and no Internet connection needed. 7-day free trial, then a subscription (monthly or yearly).
>
> 🧒 Ages 3–6: Montessori-style games in a robot world — numbers, letters, colours, days of the week, months, shapes, sizes, sounds, addition, the clock… Each game starts with a short lesson and an example, then glowing hints help the child. Everything is spoken aloud, so no reading is needed.
>
> 🤖 Ages 6–12: guide a robot with blocks, then write real code (Python and JavaScript), build an electronic board (battery, sensors, motors, lamp, speaker), take daily challenges and create a "Big Project". An 11-adventure journey that adapts to the child's age.
>
> 👨‍👩‍👧 Made for parents: several child profiles, a parent area protected by a secret code, progress tracking, daily time limit, and the choice of which cards are open or blocked.
>
> 🔒 Privacy first: no ads, no accounts, no data sent anywhere. Everything stays on the device; payment is handled by Google Play.
>
> 🌍 Available in French and English, chosen at first launch.

**Catégorie** : Éducation · **Tags** : Éducation, Jeux éducatifs, Programmation · **Coordonnées** : contactrobotkids@gmail.com, (site facultatif).

## 4. Images (dossier `store/`)
- Icône 512 × 512 : `store/icon-512.png`
- Image de présentation 1024 × 500 : `store/feature-graphic-1024x500.png`
- Captures d'écran téléphone (1080 × 1920) : `store/screenshots/01…08-*.png` (2 minimum, 8 maximum). Régénérables avec `node store/make-screenshots.mjs`.
- Captures tablette 7" et 10" : facultatives (nécessaires seulement pour être mis en avant sur tablette).

## 5. Déclarations (Contenu de l'appli)
- **Public cible** : cocher **5 ans et moins**, **6-8 ans**, **9-12 ans** (pas les plus de 13 ans). Cela active la politique **Familles** de Google Play.
- **Application destinée aux enfants / Familles** : oui. Elle respecte : aucune publicité, aucun SDK publicitaire ou de mesure, aucun lien externe, aucune collecte de données ; abonnement géré par Google Play, avec contrôle parental (code) avant tout achat.
- **Publicités** : l'appli ne contient pas de publicités.
- **Identifiant publicitaire (AD_ID)** : non utilisé (aucune autorisation `AD_ID` dans l'appli).
- **Sécurité des données** : « Cette appli ne collecte ni ne partage aucune donnée utilisateur » · « Les données sont chiffrées en transit » : sans objet (aucune transmission) · « Vous pouvez demander la suppression des données » : les données sont locales, la désinstallation les efface.
- **Classification du contenu (questionnaire IARC)** : catégorie « Éducation/Référence » ; pas de violence, pas de sexualité, pas de langage grossier, pas de jeux d'argent, pas de contenu généré par les utilisateurs, pas de partage de position, pas d'interaction entre utilisateurs. Résultat attendu : **PEGI 3 / Tous publics**.
- **Applications gouvernementales / santé / finance / actualités** : non.
- **Accès à l'appli pour l'équipe de validation** : aucun identifiant nécessaire. Au premier lancement : choisir une langue ; l'écran « parent » demande de répondre à une multiplication (affichée à l'écran), de choisir un code à 4 chiffres (par exemple 7391), de le retaper, de noter le code de secours, puis de saisir le prénom, fille/garçon et la tranche d'âge de l'enfant.
- **Permissions sensibles / services de premier plan / exactes alarmes** : aucun.

## 6. Mise en ligne
1. *Production* (ou *Test fermé* au début) → « Créer une release » → téléverser `RobotKids-5.7.3-release.aab`.
2. Notes de version FR : `Première version : jeux Montessori pour les 3-6 ans, robots et code pour les 6-12 ans, en français et en anglais.` · EN : `First release: Montessori games for ages 3–6, robots and coding for ages 6–12, in French and English.`
3. Vérifier le rapport « Pre-launch » de Google (test automatique sur des appareils réels), corriger si besoin, puis « Envoyer pour examen ». L'examen d'une appli pour enfants prend en général quelques jours.

## 7. Mises à jour futures
1. Modifier le site/l'appli web, `node test-*.mjs` pour vérifier, puis dans `flutter_app` : `powershell -File sync_web.ps1`.
2. Augmenter `version: 5.7.3+60` (le chiffre après `+` doit toujours augmenter).
3. `flutter build appbundle --release` (et `flutter build apk --release` pour essayer), téléverser le nouveau `.aab`.

## 8. Abonnement (Google Play Billing)
**Prix décidés** : essai gratuit de **7 jours**, puis **3,99 €/mois** ou **29,99 €/an**. Sans abonnement actif, l'appli est verrouillée pour l'enfant ; seul l'espace parents (code) reste ouvert pour s'abonner.

**À créer dans la Play Console** (Monétiser → Produits → Abonnements). Les identifiants doivent être **exactement** ceux du code (`flutter_app/lib/billing.dart`) :
| ID du produit | Plan de base | Prix | Offre |
|---|---|---|---|
| `robotkids_monthly` | `monthly` — facturation mensuelle, renouvellement automatique | 3,99 € (France ; les autres pays se convertissent) | offre « essai gratuit » de **7 jours** pour les nouveaux abonnés |
| `robotkids_yearly` | `yearly` — facturation annuelle, renouvellement automatique | 29,99 € | offre « essai gratuit » de **7 jours** pour les nouveaux abonnés |

Étapes : 1) compte marchand (profil de paiement) ; 2) créer les deux produits et activer leur plan de base ; 3) ajouter l'offre d'essai gratuit de 7 jours (éligibilité : « nouveaux abonnés ») et l'activer ; 4) téléverser l'AAB (au moins en test fermé : sans cela les produits sont invisibles dans l'appli) ; 5) Paramètres → Test de licence : ajouter les e-mails des testeurs (ils ne paient pas réellement, les durées sont raccourcies) ; 6) installer l'appli depuis le lien de test (et non l'APK direct) pour tester l'achat.

**Déclarations à adapter** : « L'appli contient des achats intégrés » → **Oui** ; Sécurité des données : les paiements sont traités par Google Play, l'appli ne collecte rien (à déclarer « aucune donnée collectée ») ; la politique de confidentialité (`/privacy`) a été mise à jour pour mentionner l'abonnement.

**Comportement dans l'appli** : essai et achat uniquement dans l'espace parents → Abonnement ; « Restaurer mes achats » ; vérification au démarrage et à chaque retour dans l'appli ; hors ligne, accès conservé 3 jours après le dernier abonnement vu actif. Sur le web/PWA (hors Android), pas de paiement et pas de verrou. Le contrôle est fait sur l'appareil (pas de serveur) : suffisant pour une première version, un contrôle côté serveur (API Google Play Developer) pourra être ajouté plus tard contre la fraude.

## 9. Vidéo de présentation
`store/video/RobotKids-ad-en.mp4` et `RobotKids-ad-fr.mp4` (33 s, 1920 × 1080, voix off + musique synthétisée libre de droits). Google Play demande un lien YouTube (vidéo publique ou non répertoriée, sans publicité, monétisation désactivée) dans la fiche du store, champ « Vidéo ». Régénérer : `node store/video/build.mjs fr|en` (chemins de travail dans `C:/gtmp/ad`).
