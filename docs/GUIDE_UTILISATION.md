# Hello Keys — Guide d'utilisation de la plateforme

**Objet :** expliquer, écran par écran, comment utiliser le portail Hello Keys : l'espace propriétaire, la version mobile et l'espace d'administration réservé à l'équipe Hello Keys.

**Public cible :** nouveaux membres de l'équipe Hello Keys, administrateurs, personnes chargées de la formation des propriétaires.

**Statut :** ce guide décrit les menus, libellés et actions réellement présents dans l'application au moment de la rédaction. Les libellés cités entre guillemets sont ceux affichés à l'écran. Lorsqu'une fonctionnalité est signalée « en développement » ou « Alpha » dans l'interface, elle l'est également ici.

> Ce guide est un document d'usage. Il ne remplace ni la documentation technique de passation, ni les règles internes de l'entreprise (tarifs, contrats, procédures comptables). Les exemples ne contiennent aucune donnée client réelle.

## Sommaire

1. Comprendre la plateforme et les rôles
2. Se connecter, gérer son compte et son profil
3. Espace propriétaire — menu « Pilotage »
4. Espace propriétaire — menu « Analyse & Suivi »
5. Espace propriétaire — menu « Ressources »
6. Espaces partagés et accès délégués
7. Version mobile (V4) et application installable
8. Administration — accès et navigation
9. Administration — « Général »
10. Administration — « Gestion »
11. Administration — « Contenu »
12. Administration — « Finances »
13. Administration — « Support » et pages hors menu
14. Procédures pas à pas pour l'équipe Hello Keys
15. Précautions, actions irréversibles et bonnes pratiques
16. Glossaire

---

## 1. Comprendre la plateforme et les rôles

Le portail Hello Keys est l'outil central de la conciergerie. Il sert à deux publics :

- **Les propriétaires (clients)** : ils y suivent leurs réservations, leur calendrier, leurs finances, leurs avis voyageurs, leurs logements et leurs échanges avec Hello Keys.
- **L'équipe Hello Keys (administrateurs)** : elle y gère les comptes clients, les logements, la génération des relevés mensuels, la communication (annonces, newsletters, notifications) et le suivi des incidents.

### Les quatre rôles

| Rôle | Libellé dans l'interface | Ce qu'il voit |
|---|---|---|
| `user` | Utilisateur | L'espace propriétaire complet (menus Pilotage, Analyse & Suivi, Ressources) |
| `admin` | Administrateur | L'espace propriétaire **et** l'espace d'administration `/admin` |
| `accountant` | Comptable | Un menu réduit : « Performances », « Finances », « Taxe de Séjour » |
| `housekeeper` | Femme de ménage | Un menu réduit : « Mes rapports » (rapports de ménage) |

Le rôle d'un compte se modifie uniquement depuis l'administration (fiche client → champ « Rôle »).

### Les agences

Les clients sont rattachés à une agence : **« Côte d'opal »** (Berck) ou **« Baie de somme »** (Le Crotoy). L'agence conditionne certains traitements financiers (facturation, identifiant d'établissement KrossBooking) et les filtres de l'administration (« Clients Crotoy », « Clients Berck », « Sans agence »).

### Le parcours d'onboarding d'un client

Un nouveau client passe par plusieurs étapes avant d'être « en ligne » :

```text
Estimation envoyée → Estimation validée → CGUV acceptées
→ Clés en attente de réception → Clés récupérées → Shooting photo réalisé → En ligne (live)
```

Tant que le client n'est pas « En ligne », il est dirigé vers la page de suivi d'onboarding (`/onboarding-status`) à la connexion, et non vers son tableau de bord. L'administrateur fait avancer les étapes depuis l'onglet « Onboarding » de la page « Clients ».

## 2. Se connecter, gérer son compte et son profil

### Connexion

Page de connexion : `/login` (ordinateur) ou `/v4/login` (mobile).

- **Email + mot de passe** : saisie classique. Le mot de passe doit comporter au moins 6 caractères.
- **Lien magique** : après avoir saisi son email, l'utilisateur peut demander un « lien magique » reçu par email pour se connecter sans mot de passe.
- **Mot de passe oublié** : après avoir saisi son email, l'utilisateur demande un email de réinitialisation.
- **Vérification par SMS** : certains parcours (profil, sécurité) utilisent un code envoyé par SMS pour vérifier le numéro de téléphone.

À la première connexion ou après une mise à jour des conditions, une fenêtre demande d'**accepter les CGUV**. Refuser ferme la session.

Après connexion :

- un administrateur arrivant depuis la page de connexion est envoyé vers `/admin` ;
- un propriétaire « En ligne » arrive sur l'« Aperçu » (`/`) ;
- un propriétaire en cours d'onboarding arrive sur `/onboarding-status`.

### Se déconnecter

Le menu du compte (en haut de la barre latérale ou depuis « Mon Profil ») propose la déconnexion. Dans l'administration, le menu en haut à droite propose également « Déconnexion ».

### Mon Profil (`/profile`)

La page « Mon Profil » est organisée en onglets :

| Onglet | Contenu |
|---|---|
| « Données personnelles » | Nom, prénom, coordonnées, adresse |
| « Préférences de paiement » | Coordonnées bancaires pour « Paiement Airbnb/Booking.com » et « Paiement Abritel/Hello Keys » |
| « Mon offre » | « Mon forfait » (taux de commission), « Type de linge », « Mon agence », date de début de contrat, ancienneté, dernière signature CGUV ; boutons « Voir nos CGUV », « Voir mon estimation », « Télécharger une attestation », « Demander l'attestation d'assurance » |
| « Parrainage » | Hello Wallet : lien de parrainage, suivi des filleuls et des crédits |
| « KYC / Vérification » | Dépôt des justificatifs d'identité demandés |
| « Notifications » | Choix des alertes : nouvelles réservations et annulations, par email et par SMS (l'activation des notifications push se fait depuis la page « Notifications ») |
| « Paramètres » | Thème saisonnier, « Activer le module de dépenses », « Activer le livret d'accueil numérique » |
| « Sécurité » | Changement de mot de passe (pour les comptes connectés par mot de passe) |
| « Coffre-Fort » | Documents sécurisés déposés par Hello Keys (relevés, attestations, contrats) |
| « Accès délégués » | Espace partagé (inviter / révoquer un membre) et accès délégués aux relevés pour un comptable ou un tiers |

## 3. Espace propriétaire — menu « Pilotage »

La barre latérale de l'espace propriétaire est organisée en trois sections : « Pilotage », « Analyse & Suivi » et « Ressources ». Une bascule permet d'afficher un menu simplifié ou complet.

| Entrée | Adresse | Ce que l'on y fait |
|---|---|---|
| « Aperçu » | `/` | Tableau de bord : prochaines arrivées et départs, chiffres clés du mois, annonces importantes, raccourcis |
| « Calendrier » | `/calendar` | Planning des réservations par logement, consultation d'une réservation, blocage de dates pour un séjour propriétaire |
| « Réservations » | `/bookings` | Liste des réservations (passées, en cours, à venir) avec détail du séjour, des voyageurs et des montants |
| « Incidents » | `/reports` | Rapports techniques ouverts sur ses logements, suivi des échanges et des mises à jour |
| « Ménage » | `/housekeeping` | Tâches de ménage planifiées, notes et rapports de ménage liés aux réservations |
| « Mes tickets » | `/tickets` | Demandes d'assistance adressées à Hello Keys ; création d'un ticket et suivi de la réponse |
| « Notifications » | `/notifications` | Historique des notifications reçues (réservations, annonces, relevés) |
| « Mes logements » | `/my-rooms` | Fiche de chaque logement : informations générales, équipements, accès, sécurité, parking, règles, inventaire du mobilier, livret d'accueil numérique |

Lorsqu'un compte est **suspendu pour non-paiement**, les entrées « Calendrier », « Réservations », « Ménage », « Mes logements », « Finances » et « Compta LMNP » sont désactivées et une bannière de suspension s'affiche.

### Séjour propriétaire

Depuis le calendrier, le propriétaire peut réserver son logement pour lui-même. Ces séjours apparaissent avec un statut spécifique et ne génèrent pas de commission Hello Keys sur le relevé.

## 4. Espace propriétaire — menu « Analyse & Suivi »

| Entrée | Adresse | Ce que l'on y fait |
|---|---|---|
| « Performances » | `/performance` | Indicateurs d'activité (chiffre d'affaires, nuits, taux d'occupation, évolution) avec graphiques et synthèse |
| « Finances » | `/finances` | Onglets « Relevés », « Factures », « Virements », « Relogements », « Bilans », « Dépenses » (si activé) ; l'onglet « Rapports » est signalé « En développement » |
| « Compta LMNP » | `/lmnp` | Aide à la comptabilité en location meublée : paramètres, immobilisations, calcul annuel et exports PDF |
| « Taxe de Séjour » | `/tourist-tax` | Récapitulatif de la taxe de séjour par période à partir des réservations |
| « Mes Avis » | `/reviews` | Avis voyageurs collectés, notes, réponses et points d'amélioration |
| « Analyse Concurrentielle » | `/comp-set` | Comparaison du positionnement tarifaire avec des logements concurrents |
| « PowerSense » | `/powersense` | Suivi de la consommation électrique du logement (service sur candidature) |
| « Thermo Sync » | `/thermo-sync` | Pilotage du chauffage connecté (ThermoBnB / Netatmo) selon les réservations |

### Les relevés mensuels

Chaque mois, Hello Keys produit un **relevé** pour le propriétaire. Il récapitule les réservations de la période, les montants perçus, les frais de ménage, la taxe de séjour et la commission Hello Keys. Le relevé est consultable dans « Finances » → « Relevés », téléchargeable en PDF et envoyé par email lors de sa génération. Les factures Hello Keys correspondantes apparaissent dans l'onglet « Factures » (synchronisées avec la comptabilité).

Pour les comptes comptables, la page « Finances » affiche uniquement « Relevés » et « Factures ».

## 5. Espace propriétaire — menu « Ressources »

| Entrée | Adresse | Ce que l'on y fait |
|---|---|---|
| « N° d'enregistrement » | `/numero-enregistrement` | Déclarer le numéro d'enregistrement de meublé de tourisme de chaque logement |
| « Annonces » | `/announcements` | Actualités publiées par Hello Keys, avec possibilité de réagir |
| « Aides » | `/help` | Centre d'aide, FAQ, contact |
| « Marketplace » | `/marketplace` | Prestataires partenaires recommandés par Hello Keys |
| « Modules » | `/modules` | Activation de services complémentaires sur demande |
| « Nouveautés » | `/new-version` | Nouveautés et évolutions de l'application |

### Les modules

La page « Modules » liste les services complémentaires. Le propriétaire fait une **demande d'activation** ; l'équipe Hello Keys la valide depuis l'administration (« Demandes Modules »). Modules présentés :

- « Accès Comptable » : donner un accès à son comptable.
- « Compta LMNP — Liasse fiscale ».
- « Smart Pricing » : tarification dynamique.
- « Hello Safe ».
- « Taxe de Séjour ».
- « Supervision Travaux ».
- « Optimisation Charges ».
- « Consommables ».

## 6. Espaces partagés et accès délégués

### Espaces partagés

Un propriétaire peut inviter une autre personne (conjoint, associé) à rejoindre son espace. L'invité reçoit un lien ; s'il n'a pas encore de compte, il le crée à cette occasion (`/rejoindre-espace`). Une fois membre, il utilise le **sélecteur d'espace** en haut de l'application pour passer de son propre espace à l'espace partagé (`/espaces`). Le propriétaire principal peut révoquer un membre à tout moment depuis le panneau des espaces partagés.

### Accès délégués aux relevés

Depuis « Mon Profil » → « Accès délégués », le propriétaire invite un tiers (souvent un comptable) à consulter ses relevés. L'invitation s'accepte via `/redeem-invite`. L'administration dispose d'une vue d'ensemble de ces accès (« Accès délégués »).

### Demandes d'accès comptable

Un comptable peut aussi demander l'accès à un client. La demande apparaît dans l'administration, page « Clients », onglet « Demandes Comptable », avec les boutons « Approuver » et « Rejeter ».

## 7. Version mobile (V4) et application installable

Sur téléphone, l'application propose une interface dédiée (V4) avec une **barre de navigation en bas** : « Aperçu », « Calendrier », « Réservations », « Notifs », « Finances », « Stats », « Avis », « Profil », « Incidents ». Pour un compte comptable, la barre est réduite aux entrées financières.

Les écrans V4 couvrent : l'accueil, le calendrier, la liste et le détail des réservations, les finances (par mois), les avis, les messages, les notifications, les logements, les ménages, les idées, l'aide, le contact et les paramètres. La rubrique « Plus » (`/v4/plus`) rassemble les autres entrées, dont le parrainage.

### Installer l'application

La page `/installer` explique comment ajouter Hello Keys à l'écran d'accueil (application web installable). Une fois installée, l'application peut demander un **code PIN** à l'ouverture (configurable dans les paramètres de la version mobile, `/v4/parametres`) et proposer une mise à jour lorsqu'une nouvelle version est disponible.

## 8. Administration — accès et navigation

L'espace d'administration est accessible à l'adresse `/admin`, uniquement aux comptes de rôle « Administrateur ». Un utilisateur non autorisé est renvoyé vers l'accueil avec le message « Accès non autorisé. »

### Deux modes de menu

Le menu d'administration propose deux modes, mémorisés sur le navigateur :

- **« Simplifié »** : accès rapide aux pages les plus utilisées (« Générer Relevé », « Tableau de Bord », « Clients », « Logements », « Relevés Sauvegardés ») avec les autres rubriques repliées.
- **« Complet »** : toutes les pages, regroupées en cinq catégories : « Général », « Gestion », « Contenu », « Finances », « Support ».

Une cloche de notifications et un compteur d'**alertes de température** (logements équipés de thermostats) sont affichés dans l'en-tête. Le bouton « Retour au site » ramène à l'espace propriétaire.

### Tableau de bord (`/admin`)

La page « Tableau de Bord » affiche les indicateurs d'activité : nombre de clients et croissance récente, nombre de logements, chiffre d'affaires issu des relevés, rapports techniques en attente, rapports de réservation, demandes comptables, idées proposées, demandes de modules, prospects et alertes de température.

## 9. Administration — « Général »

| Page | Adresse | Usage |
|---|---|---|
| « Tableau de Bord » | `/admin` | Vue d'ensemble de l'activité |
| « Stats Hello Keys » | `/admin/hello-keys-stats` | Statistiques de facturation de Hello Keys (commissions, ménages) par période |
| « Stats Kross » | `/admin/kross-stats` | CA, clients, nuits et réservations KrossBooking par période |
| « Revue Client » | `/admin/client-performance` | Synthèse mensuelle par client |

## 10. Administration — « Gestion »

### « Clients » (`/admin/users`) — la page centrale

En-tête de la page « Gestion des Clients » :

- « Ajouter un client » : création d'un compte (prénom, nom, email, rôle, estimation de revenus, identifiant client Pennylane). Le client reçoit un email de bienvenue.
- « Importer des clients » : import en masse depuis un fichier.
- « Recalculer les scores de paiement » : met à jour le score de ponctualité de paiement (A à E) de tous les clients actifs à partir de la comptabilité.
- « Désactiver Smart Pricing (Tous) » : coupe la tarification dynamique pour l'ensemble des clients.

Onglets de la page : « Tous les clients », « Clients Crotoy », « Clients Berck », « Smart Pricing », « Sans agence », « Anciens clients », « Onboarding », « Demandes Comptable ». Un champ « Rechercher par nom ou email... » filtre chaque liste.

Menu d'actions « ⋯ » sur chaque ligne :

- « Modifier le client » : ouvre la fiche complète (voir ci-dessous).
- « Voir les relevés » : ouvre « Relevés Sauvegardés » filtrés sur ce client.
- « Historique de connexion ».
- « Se connecter en tant que ce client » : ouvre l'espace du client tel qu'il le voit. Un badge « Impersonation active » et un bouton « Retour admin » apparaissent en haut de l'écran. Utile pour l'assistance.
- « Téléphone » : modification rapide du numéro.
- « Agence : … » : rattachement à une agence.
- « Smart Pricing actif / désactivé » : bascule du module pour ce client.
- « Voir le compte Stripe » ou « Créer le compte Stripe ».
- « Remettre en client actif » (si contrat résilié) ou « Sortie définitive du client ».
- « Supprimer totalement (irréversible) » : suppression complète du compte, confirmée en tapant « SUPPRIMER ».

Onglet « Onboarding » : chaque client en cours d'intégration affiche sa progression avec les boutons « Étape suivante », « Marquer "En ligne" », « Relancer par email » et « Modifier le client ».

### La fiche client (« Modifier le client »)

La fiche regroupe tout le paramétrage d'un compte :

- **Identité** : « Prénom », « Nom », « Email (admin) », « Adresse », « Ville », « Code Postal », « Rôle » (Utilisateur, Administrateur, Comptable, Femme de ménage).
- **États du compte** : « Bannir l'utilisateur » (déconnexion et blocage), « Suspendre pour non-paiement » (bloque les fonctionnalités principales et affiche une bannière), « Résiliation de contrat en cours ».
- **Onboarding** : « Statut actuel », « Méthode de livraison des clés choisie », téléversement du document CGUV signé (PDF).
- **Paiement** : IBAN / BIC pour Airbnb/Booking.com, IBAN / BIC pour Abritel/Hello Keys avec « Synchroniser avec Hello Keys », « ID Compte Stripe ».
- **Contrat et facturation** : « Forfait (%) » (taux de commission), « ID Propriété Krossbooking », « ID Client Pennylane », « Type de linge », « Agence », « Date de début de contrat », « Revenu Annuel Estimé (€) », « Détails de l'estimation », « IDs Revyoos ».
- **Modules et services** : « Gérer les prix/restrictions », « Accès ThermoBnB », « Accès PowerSense » avec « PRM / PDL Linky », « Prix du kWh (€) » et « Token Conso API ».
- **Notifications du client** : nouvelles réservations, annulations et modifications, par email et par SMS.
- **KYC** : « Statut KYC » et « Documents fournis ».
- **Logements** : ajout d'un logement avec « ID Chambre (Krossbooking) », « Nom de la chambre », « ID Chambre Numéro 2 (Prix/Restrictions) », « URL iCal ».

> Le « Forfait (%) » et l'« ID Client Pennylane » sont indispensables à la génération des relevés : sans identifiant Pennylane, la création d'un relevé est bloquée.

### Autres pages « Gestion »

| Page | Adresse | Usage |
|---|---|---|
| « N° Enregistrement » | `/admin/housing-registrations` | Numéros d'enregistrement des logements communiqués par les clients |
| « Accès délégués » | `/admin/delegated-access` | Visualiser les accès délégués accordés par les propriétaires |
| « Logements » | `/admin/user-rooms` | Consulter et modifier les logements de tous les utilisateurs |
| « Tableau à clés » | `/admin/key-board` | Retrouver et classer les clés des logements par agence |
| « Config iCal » | `/admin/ical-config` | Configurer et importer les flux iCal des logements |
| « Blanchisserie » | `/admin/laundry` | Calculer les commandes de linge à partir des réservations |
| « Compteurs coupés » | `/admin/utility-cuts` | Liste des logements où électricité ou eau sont coupées, avec historique |
| « Temperature » | `/admin/temperature` | Température des logements (thermostats et stations météo connectés) |
| « Réponses IA » | `/admin/smart-replies` | Analyse des messages voyageurs KrossBooking et préparation de réponses semi-automatiques à valider |
| « Stratégies » | `/admin/strategies` | Définir les stratégies de prix |
| « Demandes Modules » | `/admin/module-requests` | Traiter les demandes d'activation de modules faites par les propriétaires |
| « Demandes PowerSense » | `/admin/module-requests?module=electricity` | Candidatures au service PowerSense |
| « Demandes Saison 2026 » | `/admin/season-requests` | Voir et traiter les demandes de prix saison |
| « Marketplace » | `/admin/marketplace` | Gérer les prestataires affichés dans la marketplace |
| « Demandes Hivernage » | `/admin/hivernage-requests` | Voir et exporter les demandes d'hivernage |
| « Mini-sites » | `/admin/mini-sites` | Suivre les mini-sites créés par les propriétaires et leur publication |
| « Demandes de domaine » | `/admin/domain-requests` | Traiter manuellement les demandes de nom de domaine |
| « IDs Revyoos manquants » | `/admin/revyoos-missing` | Compléter les identifiants Revyoos (avis) manquants |

## 11. Administration — « Contenu »

| Page | Adresse | Usage |
|---|---|---|
| « Pages » | `/admin/pages` | Créer et modifier des pages de contenu, visibles sur `/pages/<slug>` |
| « Newsletter » | `/admin/newsletter` | Rédiger (avec aide à la rédaction) et envoyer une newsletter à tous les clients ; suivi des campagnes et des envois |
| « Notifications & Push » | `/admin/notifications` | Envoyer des notifications dans l'application et des notifications push ; gérer les modèles |
| « Annonces » | `/admin/announcements` | Publier des annonces pour tous les utilisateurs (affichées dans « Annonces » et en bannière) |
| « FAQ » | `/admin/faq` | Gérer les questions / réponses du centre d'aide |
| « Changelog » | `/admin/changelog` | Publier les nouveautés visibles dans « Nouveautés » |
| « Idées » | `/admin/ideas` | Consulter les suggestions et votes des utilisateurs |
| « Documents » | `/admin/documents` | Déposer des documents dans le coffre-fort des clients |

## 12. Administration — « Finances »

### « Générer Relevé » (`/admin/invoice-generation`)

La page « Génération de Facture Manuelle » est organisée en cinq blocs numérotés :

1. **« 1. Client & Période »** : choisir le client (clients actifs uniquement) et la « Période de facturation » (mois). Les relevés déjà existants pour ce client sont rappelés. La création est bloquée pour un ancien client ou un client sans identifiant Pennylane.
2. **« 2. Importer le relevé »** : soit importer le fichier Excel (.xlsx) exporté de KrossBooking, soit utiliser « Générer depuis Krossbooking » (mode « Alpha », sans Excel) qui récupère automatiquement les réservations de la période. Dans les deux cas, vérifier les montants.
3. **« 3. Résumé & Facturation »** : total de commission, total des frais de ménage, « Frais de ménage propriétaire (TTC) », facture HT, TVA et total TTC. Cocher « Hello Keys perçoit les loyers ? » si c'est le cas, puis choisir les « Sources de paiement » (Stripe, Airbnb) et éventuellement « Déduire la facture des loyers ? » avec la source de déduction.
4. **« 4. Relevé Détaillé »** : tableau des réservations avec les commissions calculées ; chaque ligne est modifiable (crayon) pour corriger un montant.
5. **« 5. Virements à effectuer »** : synthèse des virements à réaliser au propriétaire.

Le bouton « Actions » propose « Sauvegarder le Relevé » ou « Sauvegarder et Envoyer par Email ». Dans les deux cas, le relevé est enregistré, le PDF généré et la facture transmise à la comptabilité ; le propriétaire est informé par email.

> Vérifier systématiquement qu'aucun relevé n'existe déjà pour le même client et la même période avant de sauvegarder : la plateforme ne refuse pas les doublons.

### Autres pages « Finances »

| Page | Adresse | Usage |
|---|---|---|
| « Calcul Commission » | `/admin/commission-explained` | Explication détaillée du calcul de la commission Hello Keys |
| « Ajouter Stats Manuelles » | `/admin/manual-stats` | Saisir manuellement des statistiques mensuelles passées |
| « Relevés Sauvegardés » | `/admin/statements` | Rechercher « par client, période ou statut », consulter le détail, « Envoyer par e-mail » au client, « Envoyer un email de test » à une adresse de son choix, envoyer une relance de paiement, mettre à jour le statut de paiement et suivre le « Statut Pennylane » |
| « Leaderboard Logements » | `/admin/leaderboard` | Classement des logements par période à partir des relevés |
| « Comparatif Agences » | `/admin/agency-comparison` | Comparatif agence vs agence (année ou mois), exportable en PDF |
| « Statuts de facturation » | `/admin/billing-status` | Dernier relevé par client pour contrôler que la facturation est à jour |
| « Facturation Consommables » | `/admin/consumables` | Facture annuelle des consommables : 2 € HT par logement et par mois d'occupation |
| « Stats 2025 manquantes » | `/admin/missing-2025-stats` | Mois 2025 sans statistiques par client |
| « Créer Facture (Pennylane) » | `/admin/create-pennylane-invoice` | Créer une facture client directement dans la comptabilité |
| « IDs Pennylane manquants » | `/admin/pennylane-missing` | Clients sans identifiant Pennylane renseigné |
| « Synthèse des Virements » | `/admin/transfer-summary` | Total des virements à effectuer par client, avec statut de vérification |
| « Transactions Stripe » | `/admin/stripe-transactions` | Consulter les paiements reçus via Stripe |
| « Transferts Stripe » | `/admin/stripe-transfers` | Consulter les transferts vers les comptes propriétaires |
| « Rapprochement Stripe » | `/admin/stripe-match` | Lier les comptes Stripe aux utilisateurs |
| « Note de Relogement » | `/admin/rehousing-note` | Créer une note de relogement ou de compensation pour un client |
| « Doublons Stripe » | `/admin/stripe-duplicates` | Détecter les virements potentiellement en double |

## 13. Administration — « Support » et pages hors menu

| Page | Adresse | Usage |
|---|---|---|
| « Rapports Techniques » | `/admin/technical-reports` | Suivre les problèmes techniques signalés par les propriétaires ou les voyageurs ; créer un rapport (« `/new` »), le modifier, ajouter des mises à jour et des photos, imprimer le rapport |
| « Signalements (bugs) » | `/admin/error-logs` | Consulter les erreurs applicatives signalées par les utilisateurs, avec analyse assistée |

Pages accessibles par leur adresse mais absentes du menu :

| Adresse | Usage |
|---|---|
| `/admin/settings` | Paramètres globaux de l'application |
| `/admin/wallet` | Gestion du Hello Wallet (crédits, demandes, parrainages) |
| `/admin/crm` | Recherche d'un client et de ses informations de support |
| `/admin/status` | État des services affiché sur la page publique `/status` |
| `/admin/hivernage-email` | Emails liés à la campagne d'hivernage |
| `/admin/recovery` | Procédure de récupération d'un accès administrateur |
| `/admin-v2`, `/admin-v2/users` | Nouvelle interface d'administration en cours de construction |

### Signalements par les voyageurs

Un voyageur peut signaler un problème sans compte via `/logement/<id>/signaler`, puis suivre son signalement sur `/signalement/<id>` ou `/suivi`. Ces signalements alimentent les rapports techniques.

## 14. Procédures pas à pas pour l'équipe Hello Keys

### A. Créer un nouveau client et l'amener « En ligne »

1. « Clients » → « Ajouter un client » : renseigner prénom, nom, email, estimation et identifiant Pennylane si connu.
2. Ouvrir « Modifier le client » : compléter l'agence, le « Forfait (%) », l'« ID Propriété Krossbooking », l'« ID Client Pennylane » et ajouter les logements.
3. Dans l'onglet « Onboarding », faire progresser le client avec « Étape suivante » à chaque jalon (estimation validée, CGUV, clés, shooting). Utiliser « Relancer par email » si le client n'avance pas.
4. Lorsque tout est prêt, cliquer « Marquer "En ligne" » : le client accède alors à son tableau de bord complet.

### B. Produire le relevé mensuel d'un client

1. « Générer Relevé » → choisir le client et la période.
2. Contrôler l'absence de relevé existant pour cette période.
3. Importer l'export Excel KrossBooking ou utiliser « Générer depuis Krossbooking ».
4. Vérifier le « Relevé Détaillé » ligne par ligne ; corriger si nécessaire.
5. Renseigner les frais de ménage propriétaire et les options de perception des loyers.
6. « Actions » → « Sauvegarder et Envoyer par Email ».
7. Vérifier dans « Relevés Sauvegardés » que le relevé apparaît avec son PDF et son état Pennylane.

### C. Traiter une demande de module

1. « Demandes Modules » (ou « Demandes PowerSense »).
2. Ouvrir la demande, vérifier le client et le module.
3. Valider ou refuser ; si besoin, activer le paramètre correspondant dans la fiche client (par exemple « Accès PowerSense », « Smart Pricing »).

### D. Communiquer avec les propriétaires

- Information ponctuelle à tous : « Annonces » (visible dans l'application) ou « Notifications & Push » (alerte immédiate).
- Communication rédigée et envoyée par email : « Newsletter ».
- Information durable : « FAQ » ou « Pages ».
- Nouveautés produit : « Changelog ».

### E. Assister un propriétaire qui ne comprend pas un écran

1. « Clients » → menu « ⋯ » → « Se connecter en tant que ce client ».
2. Reproduire le parcours tel que le client le voit (le badge « Impersonation active » reste affiché).
3. Cliquer « Retour admin » avant toute autre action administrative.

### F. Suivre un incident technique

1. « Rapports Techniques » : ouvrir le rapport ou en créer un.
2. Ajouter des mises à jour (texte, photos) au fil de l'intervention ; le propriétaire les voit dans « Incidents ». Des réponses rapides prêtes à l'emploi sont proposées (« Le problème est en cours de résolution. », …).
3. Marquer le rapport comme résolu lorsque l'intervention est terminée (badge « Résolu ») ; le rapport peut encore recevoir des notes et être imprimé.

## 15. Précautions, actions irréversibles et bonnes pratiques

- **« Supprimer totalement (irréversible) »** supprime le compte et ses relevés. Préférer « Sortie définitive du client » (le client passe dans « Anciens clients » et peut être remis actif).
- **Sauvegarder un relevé déclenche des effets réels** : PDF, transmission comptable et email au propriétaire, même avec « Sauvegarder le Relevé ». Relire avant de valider.
- **« Désactiver Smart Pricing (Tous) »** agit sur l'ensemble des clients ; ne l'utiliser qu'en connaissance de cause.
- **Stripe** : la création d'un compte ou un transfert sont des opérations financières ; vérifier l'identité du client et les montants.
- **Thermostats** : les actions de pilotage de chauffage agissent sur des équipements réels dans les logements.
- **Mode impersonnalisation** : les actions effectuées le sont au nom du client ; revenir à son compte dès l'assistance terminée.
- **Données personnelles** : ne jamais copier d'IBAN, de pièce d'identité ou de mot de passe dans un ticket, un email ou une capture d'écran.
- **Mot de passe et accès** : chaque membre de l'équipe utilise son propre compte administrateur ; ne pas partager d'identifiants.

## 16. Glossaire

| Terme | Définition |
|---|---|
| Relevé | Document mensuel récapitulant les réservations et les montants d'un propriétaire, produit par Hello Keys |
| Facture Pennylane | Facture comptable émise dans l'outil de comptabilité Pennylane à partir du relevé |
| Commission (« Forfait ») | Pourcentage prélevé par Hello Keys sur le revenu généré par les réservations |
| Onboarding | Parcours d'intégration d'un nouveau client, de l'estimation à la mise en ligne |
| KrossBooking | Logiciel de gestion des réservations (channel manager) connecté aux plateformes Airbnb, Booking, Abritel… |
| Smart Pricing | Tarification dynamique des nuits, activable par client |
| PowerSense | Service de suivi de la consommation électrique via le compteur Linky |
| ThermoBnB / Thermo Sync | Pilotage automatique du chauffage connecté selon les réservations |
| Hello Wallet | Portefeuille de crédits du propriétaire (parrainage, compensations) |
| Mini-site | Site vitrine du logement créé par le propriétaire, publié sur `/sites/<slug>` |
| KYC | Vérification d'identité du propriétaire (justificatifs) |
| Revyoos | Service de collecte des avis voyageurs |
| iCal | Flux de calendrier permettant de synchroniser les disponibilités |
| Impersonnalisation | Connexion d'un administrateur à l'espace d'un client pour l'assister |
