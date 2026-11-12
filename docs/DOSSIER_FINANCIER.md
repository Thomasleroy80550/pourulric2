# Hello Keys — Dossier financier : coût global et valorisation de la plateforme

**Objet :** établir le coût global de la plateforme Hello Keys (coût de construction, coût historique, coûts de fonctionnement, coûts de maintenance, coût total de possession) et en déduire une estimation de sa valeur selon plusieurs approches reconnues (coûts, usage, substitution).

**Public cible :** dirigeant, expert-comptable, repreneur ou investisseur, conseil en cession.

**Date de référence :** 12 novembre 2026. Toutes les mesures techniques (volume de code, base de données, historique Git) et les volumes d'activité (clients, logements, relevés, flux) ont été relevés ce jour dans le dépôt et dans la base de données de production. Les tarifs de prestations et d'hébergement sont des tarifs publics constatés en 2026 ; les hypothèses sont explicitées et regroupées en annexe B pour pouvoir être ajustées.

> Avertissement : ce dossier est une estimation documentée, pas une expertise indépendante. Pour un usage comptable (immobilisation d'un logiciel créé), fiscal ou dans le cadre d'une transaction, les hypothèses doivent être validées par un expert-comptable ou un évaluateur. Aucune donnée individuelle de client n'est reproduite : seuls des agrégats figurent dans ce document.

## Sommaire

1. Synthèse
2. Périmètre évalué et données de référence
3. Méthode 1 — Coût de reconstruction par décomposition (bottom-up)
4. Méthode 2 — Contre-vérification par le modèle COCOMO II
5. Scénarios de reconstruction et coût de remplacement brut
6. Décote de dette technique et coût de remplacement net
7. Coût historique de production (approche comptable)
8. Coûts de fonctionnement annuels
9. Coûts de maintenance et coût total de possession sur 3 ans
10. Valeur d'usage : coûts évités et criticité opérationnelle
11. Approches complémentaires : substitution et comparables
12. Synthèse de valorisation et fourchette retenue
13. Facteurs d'ajustement à la hausse et à la baisse
14. Hypothèses, limites et mise à jour du dossier
15. Annexe A — Détail des calculs
16. Annexe B — Fiche de paramètres

---

## 1. Synthèse

| Indicateur | Valeur |
|---|---|
| Effort de reconstruction (équipe classique, méthode bottom-up) | 1 025 jours-homme (env. 4,7 années-homme) |
| Coût de remplacement brut, scénario central (freelance senior France, 575 EUR / jour) | 589 000 EUR |
| Coût de remplacement net après décote de dette technique (20 %) — approche retenue | 471 000 EUR |
| Fourchette nette selon le mode de reconstruction (équipe outillée IA / agence) | 252 000 EUR à 697 000 EUR |
| Borne haute industrielle (COCOMO II ajusté, nette) | 1 292 000 EUR |
| Valeur d'usage actualisée sur 5 ans (coûts évités nets du run minimal) | 147 000 EUR |
| Coût historique de production estimé (développement interne assisté par IA) | env. 48 000 EUR (hypothèse 3 h / jour ouvré sur 17 mois) |
| Coût de fonctionnement annuel (hébergement et services techniques) | 700 EUR à 1 650 EUR |
| Coût de maintenance annuel (scénario évolutif externalisé, 5 jours / mois) | 34 500 EUR |
| Coût total de possession sur 3 ans, hors construction (scénario évolutif) | env. 108 000 EUR |
| **Fourchette de valorisation indicative retenue** | **250 000 EUR à 470 000 EUR, valeur centrale env. 360 000 EUR** |

Lecture : la plateforme est un actif logiciel sur mesure, exploité en production depuis juin 2025 par 146 clients actifs et 183 logements, qui produit l'intégralité des relevés mensuels de la conciergerie (2 590 relevés, 1,18 million d'euros HT facturés par Hello Keys via la plateforme depuis le lancement, 3,12 millions d'euros reversés aux propriétaires). Son coût de fonctionnement est marginal (moins de 1 700 EUR par an) au regard des flux traités. Sa valeur est principalement une valeur de remplacement : ce qu'il en coûterait pour la reconstruire à périmètre fonctionnel identique.

---

## 2. Périmètre évalué et données de référence

### 2.1 Périmètre

| Composant | Contenu |
|---|---|
| Application web propriétaire (bureau) | 63 pages : tableau de bord, calendrier, réservations, finances, relevés, compta LMNP, taxe de séjour, avis, logements, incidents, tickets, modules, parrainage, coffre-fort |
| Application mobile installable (V4, PWA) | 28 écrans, notifications push, verrouillage par code PIN, mise à jour à chaud |
| Espace d'administration | 55 pages : clients, onboarding, génération des relevés, statistiques, Stripe, Pennylane, newsletter, notifications, rapports techniques, blanchisserie, thermostats, consommation électrique |
| Pages publiques | 16 pages : connexion, inscription prospect, estimation, mini-sites, portail voyageur, signalements, statut des services |
| Backend | 79 fonctions serveur (Supabase Edge, Deno), 84 tables PostgreSQL, 242 politiques de sécurité par ligne, 23 fonctions et 23 déclencheurs SQL, 7 tâches planifiées, 6 espaces de stockage |
| Intégrations externes | KrossBooking (channel manager), Pennylane (comptabilité), Stripe Connect (virements), Resend (emails entrants et sortants), SMSFactor et Twilio (SMS), OpenAI (assistance rédactionnelle et analyses), Netatmo (thermostats), API consommation Linky, RTE Ecowatt, Freshdesk (support), Google Sheets (imports), Revyoos (avis, remplacé) |
| Documentation | Guide d'utilisation, passation technique avec inventaire, référence d'ingénierie de niveau code, présent dossier financier |

### 2.2 Mesures du code source (relevées le 12/11/2026)

| Mesure | Valeur |
|---|---|
| Fichiers TypeScript / TSX | 512 |
| Lignes de code applicatif (`src/`) | 106 344 |
| dont pages (162 fichiers) | 54 701 |
| dont composants métier (210 fichiers) | 33 470 |
| dont composants de bibliothèque shadcn/ui (50 fichiers, exclus de l'effort) | 4 887 |
| dont modules d'accès aux données et calcul (79 fichiers) | 11 933 |
| Fonctions serveur Edge (82 fichiers) | 14 950 lignes |
| Fichiers de migration SQL | 139 |
| Lignes non vides hors bibliothèque (base du calcul COCOMO) | 105 388 |
| Routes de l'application | 160 |
| Dépendances npm (production + développement) | 78 + 17 |

### 2.3 Base de données et infrastructure

| Mesure | Valeur |
|---|---|
| Tables du schéma applicatif | 84 (801 colonnes) |
| Politiques de sécurité par ligne (RLS) | 242 |
| Clés étrangères / index | 97 / 137 |
| Fonctions SQL et déclencheurs | 23 / 23 |
| Tâches planifiées (pg_cron) | 7 |
| Espaces de stockage de fichiers | 6 (1 206 fichiers, 590 Mo) |
| Taille de la base de production | 2 949 Mo |
| Secrets d'intégration configurés | 45 |

### 2.4 Historique de développement

| Mesure | Valeur |
|---|---|
| Création du projet Supabase (première trace) | 8 juin 2025 |
| Premier commit du dépôt actuel (« Init Dyad app », code déjà fonctionnel) | 15 septembre 2025 |
| Dernier commit | 12 novembre 2026 |
| Durée de développement cumulée | 17 mois |
| Commits dans le dépôt | 1 514 (environ 700 sur les trois premiers mois, puis 65 à 90 par mois) |
| Auteurs humains | 1 (développement assisté par IA via Dyad) |
| Versions publiées (compteur automatique) | 64 (v1.0.0.64) |
| Tests automatisés | aucun |

### 2.5 Activité réelle de la plateforme (agrégats de production)

| Mesure | Valeur |
|---|---|
| Comptes utilisateurs | 207 (3 administrateurs, 204 clients) |
| Clients actifs « en ligne » | 146 (plus 19 en cours d'onboarding, 39 contrats résiliés conservés) |
| Logements gérés | 183 (156 propriétaires équipés) |
| Utilisateurs connectés au cours des 30 derniers jours | 75 |
| Relevés mensuels produits | 2 590 (1 406 générés par la plateforme, 1 184 saisis ou importés) |
| Cadence de relevés générés | 40,3 par mois en 2025, 83,7 par mois en 2026 |
| Facture Hello Keys moyenne par relevé | 601 EUR HT en 2025, 709 EUR HT en 2026 |
| Montant facturé par Hello Keys via la plateforme | 527 453 EUR HT en 2025 ; 653 220 EUR HT sur 11 mois 2026 (712 600 EUR annualisés) ; 1 183 100 EUR cumulés |
| Montants reversés aux propriétaires via les relevés | 1 398 458 EUR en 2025 ; 1 716 240 EUR en 2026 ; 3 121 035 EUR cumulés |
| Réservations traitées automatiquement (notifications) | 3 415 |
| Événements email de réservation ingérés | 4 822 |
| Notifications délivrées dans l'application | 7 517 |
| Envois de newsletter | 1 001 (8 campagnes) |
| Rapports techniques suivis | 80 |
| Espaces partagés / accès délégués | 11 / 7 |

---

## 3. Méthode 1 — Coût de reconstruction par décomposition (bottom-up)

### 3.1 Principe

Chaque élément du système est classé par taille (nombre de lignes) et reçoit un effort unitaire en jours-homme correspondant à sa reconstruction par une équipe professionnelle classique (développeur confirmé, sans assistance IA), spécifications comprises mais hors recette et pilotage, qui sont ajoutés ensuite en pourcentage.

### 3.2 Efforts unitaires retenus

| Élément | Taille | Nombre | Effort unitaire | Sous-total |
|---|---|---|---|---|
| Page | moins de 150 lignes | 51 | 0,5 j | 25,5 j |
| Page | 150 à 400 lignes | 60 | 1,5 j | 90 j |
| Page | 400 à 800 lignes | 43 | 3,5 j | 150,5 j |
| Page | plus de 800 lignes | 8 | 7 j | 56 j |
| Composant | moins de 150 lignes | 132 | 0,25 j | 33 j |
| Composant | 150 à 400 lignes | 69 | 1 j | 69 j |
| Composant | 400 à 800 lignes | 6 | 2,5 j | 15 j |
| Composant | plus de 800 lignes | 3 | 5 j | 15 j |
| Module de données / calcul | moins de 150 lignes | 60 | 0,5 j | 30 j |
| Module de données / calcul | 150 à 400 lignes | 15 | 1,5 j | 22,5 j |
| Module de données / calcul | 400 à 800 lignes | 3 | 3 j | 9 j |
| Module de données / calcul | plus de 800 lignes | 1 | 6 j | 6 j |
| Fonction serveur Edge | moins de 150 lignes | 48 | 0,75 j | 36 j |
| Fonction serveur Edge | 150 à 400 lignes | 29 | 2 j | 58 j |
| Fonction serveur Edge | 400 à 800 lignes | 5 | 4 j | 20 j |
| Table (schéma, droits, politiques, index) | — | 84 | 0,5 j | 42 j |
| Fonction SQL | — | 23 | 1 j | 23 j |
| Déclencheur SQL | — | 23 | 0,25 j | 5,75 j |
| Tâche planifiée | — | 7 | 0,25 j | 1,75 j |
| Espace de stockage | — | 6 | 0,25 j | 1,5 j |

### 3.3 Intégrations externes (effort hors code : découverte des API, comptes de test, identifiants, cas limites)

| Intégration | Effort |
|---|---|
| KrossBooking (dont proxy à adresse IP fixe imposé par le fournisseur) | 10 j |
| Pennylane (facturation, score de paiement, deux agences) | 6 j |
| Stripe Connect (comptes, virements, rapprochement) | 6 j |
| Resend (emails sortants, réception et analyse des emails de réservation) | 4 j |
| Netatmo (OAuth, thermostats, planification) | 5 j |
| Consommation Linky et RTE Ecowatt | 4 j |
| OpenAI (8 cas d'usage) | 3 j |
| Notifications push Web (VAPID, service worker) | 3 j |
| SMSFactor et Twilio Verify | 2 j |
| Freshdesk | 2 j |
| Revyoos | 2 j |
| Google Sheets | 2 j |
| **Total intégrations** | **49 j** |

### 3.4 Récapitulatif de l'effort

| Poste | Jours-homme |
|---|---|
| Pages (162) | 322 |
| Composants (210) | 132 |
| Modules de données et calcul (79) | 67,5 |
| Fonctions serveur (82 fichiers) | 114 |
| Base de données | 74 |
| Intégrations | 49 |
| **Sous-total développement** | **758,5** |
| Conception UX/UI (trois interfaces : bureau, mobile, administration ; thèmes saisonniers) | 25 |
| Architecture et mise en place (build, PWA, déploiement, CI, enveloppe mobile) | 8 |
| Documentation | 5 |
| Recette fonctionnelle et correction (15 % du développement) | 114 |
| Pilotage, spécifications, coordination (15 % du développement) | 114 |
| **Total** | **1 024,5 j, arrondi à 1 025 j** |

À 220 jours ouvrés par an, cela représente environ **4,7 années-homme**, soit par exemple une équipe de trois personnes pendant dix-neuf mois.

### 3.5 Lecture par domaine fonctionnel

| Domaine | Éléments | Effort estimé (pages et fonctions serveur uniquement) |
|---|---|---|
| Espace propriétaire (bureau) | 63 pages | 137 j |
| Espace d'administration | 55 pages | 129 j |
| Pages publiques et portail voyageur | 16 pages | 31 j |
| Application mobile V4 | 28 écrans | 25 j |
| Emails, SMS, newsletters, push | 18 fonctions | 34 j |
| Comptes, invitations, sécurité | 15 fonctions | 15 j |
| KrossBooking | 6 fonctions | 15 j |
| Support, tickets, signalements | 10 fonctions | 14 j |
| Finance (Stripe, Pennylane, exports) | 12 fonctions | 13 j |
| Énergie et objets connectés | 9 fonctions | 13 j |
| Intelligence artificielle | 10 fonctions | 10 j |

Les composants partagés, les modules de calcul (moteur de relevés, moteur LMNP, génération PDF) et la base de données sont transverses à ces domaines.

---

## 4. Méthode 2 — Contre-vérification par le modèle COCOMO II

COCOMO II (Constructive Cost Model, Boehm, 2000) est le modèle paramétrique de référence de l'industrie pour estimer l'effort logiciel à partir de la taille du code. Il est appliqué ici comme contre-vérification et comme borne haute.

```text
Taille logique      KLOC = 105 388 lignes non vides x 0,70 (ratio lignes physiques -> instructions logiques
                           pour TypeScript / JSX) / 1 000 = 73,8 KLOC

Effort nominal      PM = A x KLOC^E            avec A = 2,94 ; E = 0,91 + 0,01 x somme des facteurs d'échelle
                                                (valeurs nominales : 18,97) = 1,0997
                    PM = 2,94 x 73,8^1,0997 = 333 personnes-mois

Multiplicateurs     TOOL très élevé 0,78 x PCAP élevé 0,88 x ACAP élevé 0,85 x PEXP élevé 0,88
d'effort retenus    x LTEX élevé 0,91 x DOCU faible 0,95 = 0,444

Effort ajusté       PM = 333 x 0,444 = 148 personnes-mois = 2 808 jours-homme (19 jours par mois)

Durée               TDEV = 3,67 x 148^0,3179 = 18 mois, soit 8,2 équivalents temps plein
```

Résultat : COCOMO II ajusté donne **2 808 jours-homme**, soit 2,7 fois la méthode bottom-up. L'écart est attendu : le modèle a été calibré sur des développements industriels classiques et surestime les applications construites sur des plateformes à haute productivité (Supabase, bibliothèque de composants, outillage IA), dont le code est verbeux (JSX) sans être proportionnellement complexe. Le résultat COCOMO est donc utilisé comme **borne haute industrielle**, et la méthode bottom-up comme **scénario central**.

---

## 5. Scénarios de reconstruction et coût de remplacement brut

### 5.1 Taux journaliers de référence (2026, hors taxes)

| Profil | Taux journalier | Source |
|---|---|---|
| Équipe offshore encadrée | 250 EUR | fourchette de marché |
| Développeur intermédiaire France (freelance ou salarié chargé) | 400 EUR | fourchette de marché |
| Développeur full-stack senior freelance France | 575 EUR | baromètre Malt 2026 : full-stack 558 à 573 EUR, React 563 EUR |
| Agence / ESN | 850 EUR | fourchette de marché |

### 5.2 Coût de remplacement brut

| Scénario | Effort | Taux | Coût brut |
|---|---|---|---|
| Offshore encadré | 1 025 j | 250 EUR | 256 000 EUR |
| Intermédiaire France | 1 025 j | 400 EUR | 410 000 EUR |
| **Senior freelance France (central)** | **1 025 j** | **575 EUR** | **589 000 EUR** |
| Agence / ESN | 1 025 j | 850 EUR | 871 000 EUR |
| Équipe outillée IA (facteur 2,5 sur le développement, recette et pilotage inchangés) | 547 j | 575 EUR | 315 000 EUR |
| Borne haute industrielle (COCOMO II ajusté) | 2 808 j | 575 EUR | 1 615 000 EUR |

Le scénario « équipe outillée IA » reflète le mode de reconstruction le plus probable en 2026 : les 796,5 jours de développement, conception et mise en place sont divisés par 2,5, tandis que les 228 jours de recette et de pilotage sont conservés, car l'assistance IA ne réduit ni le besoin de validation fonctionnelle avec les utilisateurs ni celui de coordination.

---

## 6. Décote de dette technique et coût de remplacement net

Un acquéreur ou un évaluateur applique une décote au coût de remplacement à neuf pour tenir compte de l'état réel de l'actif. Les éléments relevés dans la référence d'ingénierie justifient une décote de **20 %** :

| Constat | Effet |
|---|---|
| Absence de tests automatisés, compilation TypeScript non stricte, 45 erreurs de typage tolérées | coût de sécurisation avant évolution majeure |
| Absence de types générés depuis le schéma de base (326 accès non typés) | risque de régression silencieuse |
| Fichiers très volumineux (module d'administration de 1 818 lignes, pages de 1 000 à 1 600 lignes) | coût de reprise |
| 160 routes chargées statiquement, sans découpage du bundle | performance mobile |
| Dépendance forte à un fournisseur (KrossBooking) et à une personne (auteur unique) | risque opérationnel |
| Hygiène de certains secrets (secrets de tâches planifiées en clair, un espace de stockage public) | coût de remédiation |

À l'inverse, trois éléments réduisent la décote : une documentation complète et récente (quatre documents), un historique de 17 mois de validation en production avec de vrais utilisateurs, et des intégrations opérationnelles dont certaines exigent des autorisations fournisseur longues à obtenir (liste blanche d'adresses IP KrossBooking, accès API Pennylane, compte Stripe Connect).

| Scénario | Coût brut | Décote 20 % | **Coût de remplacement net** |
|---|---|---|---|
| Offshore encadré | 256 000 EUR | 51 000 EUR | 205 000 EUR |
| Intermédiaire France | 410 000 EUR | 82 000 EUR | 328 000 EUR |
| **Senior freelance France (central)** | **589 000 EUR** | **118 000 EUR** | **471 000 EUR** |
| Agence / ESN | 871 000 EUR | 174 000 EUR | 697 000 EUR |
| Équipe outillée IA | 315 000 EUR | 63 000 EUR | 252 000 EUR |
| Borne haute industrielle (COCOMO II) | 1 615 000 EUR | 323 000 EUR | 1 292 000 EUR |

---

## 7. Coût historique de production (approche comptable)

En comptabilité française, un logiciel créé en interne peut être immobilisé à son **coût de production** (temps passé valorisé au coût chargé, outillage, prestations directement affectables), et non à sa valeur de marché. Ce coût historique est très inférieur au coût de remplacement, car la plateforme a été développée par une seule personne avec une assistance IA.

```text
Hypothèse de temps     3 h par jour ouvré x 21,7 jours x 17 mois = 1 107 heures
Coût horaire chargé    40 EUR (dirigeant / salarié qualifié, charges comprises)
Temps valorisé         1 107 h x 40 EUR = 44 280 EUR
Outillage IA           17 mois x 100 EUR = 1 700 EUR   (abonnement d'assistance au développement, à confirmer)
Hébergement cumulé     17 mois x 120 EUR = 2 040 EUR   (Supabase, Vercel, services techniques)
Coût historique        env. 48 000 EUR
```

Le temps réel passé n'est pas tracé ; l'hypothèse de 3 heures par jour ouvré est cohérente avec la cadence observée (1 514 commits en 14 mois, journées atteignant 20 commits) mais doit être ajustée par le propriétaire. À 2 heures par jour, le coût historique est d'environ 33 000 EUR ; à 5 heures, d'environ 78 000 EUR.

---

## 8. Coûts de fonctionnement annuels

### 8.1 Hébergement et services techniques imputables à la plateforme

Conversion retenue : 1 USD = 0,90 EUR (hypothèse). Les volumes sont ceux constatés en production.

| Poste | Fournisseur | Base de facturation | Volume constaté | Coût annuel estimé |
|---|---|---|---|---|
| Base de données, authentification, fonctions serveur, stockage | Supabase (plan Pro) | 25 USD / mois + calcul ; 8 Go de disque, 2 millions d'appels de fonctions / mois inclus | base 2,9 Go ; tâches planifiées env. 260 000 appels / mois | 270 à 430 EUR |
| Hébergement du site | Vercel (plan Pro) | 20 USD / mois | 1 projet | 216 EUR |
| Emails sortants et entrants | Resend | gratuit jusqu'à 3 000 emails / mois, puis 20 USD / mois | relevés, notifications, newsletters | 0 à 216 EUR |
| Assistance rédactionnelle et analyses | OpenAI (gpt-4o-mini) | à l'usage (0,15 USD / million de jetons en entrée) | usage ponctuel admin | 60 à 240 EUR |
| SMS de notification | SMSFactor | env. 0,07 EUR / SMS | env. 210 réservations / mois | 60 à 200 EUR |
| Vérification SMS (code à usage unique) | Twilio Verify | env. 0,05 USD + SMS | 43 vérifications cumulées | 5 à 10 EUR |
| Proxy sortant à adresse IP fixe (exigence KrossBooking) | à confirmer | abonnement | permanent | 60 à 300 EUR |
| Nom de domaine et DNS | registrar | annuel | hellokeys.fr et sous-domaines | 15 à 30 EUR |
| Dépôt de code et intégration continue | GitHub | gratuit | 1 dépôt | 0 EUR |
| **Total hébergement et services** | | | | **700 à 1 650 EUR** |

Pour un ordre de grandeur : le fonctionnement technique coûte environ **1 EUR par logement et par mois**, pour des flux de 1,7 million d'euros reversés aux propriétaires en 2026.

### 8.2 Outillage de développement

| Poste | Coût annuel estimé |
|---|---|
| Assistance IA au développement (Dyad et fournisseur de modèle) | 240 à 2 400 EUR selon le plan (à confirmer sur factures) |

### 8.3 Outils métier non imputables

Les abonnements suivants existent indépendamment de la plateforme, qui se contente d'en consommer les API : KrossBooking (channel manager), Pennylane (comptabilité), Stripe (frais par transaction), Freshdesk (support), Google Workspace, matériel Netatmo. Ils ne sont pas comptés dans le coût de la plateforme.

---

## 9. Coûts de maintenance et coût total de possession sur 3 ans

### 9.1 Scénarios de maintenance

| Scénario | Hypothèse | Coût annuel |
|---|---|---|
| Maintenance corrective minimale externalisée | 2 jours / mois x 575 EUR | 13 800 EUR |
| Maintenance corrective et évolutive externalisée | 5 jours / mois x 575 EUR | 34 500 EUR |
| Ratio industriel classique (15 à 20 % du coût de remplacement central) | 589 000 EUR x 15 à 20 % | 88 000 à 118 000 EUR |
| Exploitation interne assistée par IA (situation actuelle) | temps du dirigeant | coût d'opportunité, non facturé |

Le ratio industriel correspond à une équipe dédiée ; il n'est pertinent que si la plateforme devait être reprise par une structure classique sans outillage IA.

### 9.2 Coût total de possession (TCO) sur 3 ans, hors construction

| Scénario | Fonctionnement (3 ans, borne haute) | Maintenance (3 ans) | **TCO 3 ans** |
|---|---|---|---|
| Minimal | 4 950 EUR | 41 400 EUR | 46 000 EUR |
| **Évolutif (retenu)** | **4 950 EUR** | **103 500 EUR** | **108 000 EUR** |
| Industriel classique | 4 950 EUR | env. 309 000 EUR | env. 314 000 EUR |

### 9.3 Coût global sur 3 ans, construction comprise

| Scénario | Construction nette | TCO 3 ans | **Coût global** |
|---|---|---|---|
| Équipe outillée IA + maintenance évolutive | 252 000 EUR | 108 000 EUR | 360 000 EUR |
| Senior freelance + maintenance évolutive | 471 000 EUR | 108 000 EUR | 579 000 EUR |
| Agence + maintenance industrielle | 697 000 EUR | 314 000 EUR | 1 011 000 EUR |

---

## 10. Valeur d'usage : coûts évités et criticité opérationnelle

### 10.1 Coûts évités annuels (hypothèses explicites)

| Fonction | Base réelle | Hypothèse de temps évité | Heures / an | Valorisation (35 EUR / h chargé) |
|---|---|---|---|---|
| Génération des relevés (import, calcul, PDF, facture Pennylane, email) | 84 relevés / mois (cadence 2026) | 50 min par relevé par rapport à un traitement manuel | 840 h | 29 400 EUR |
| Libre-service propriétaire (réservations, calendrier, finances, documents) | 146 clients actifs | 20 min de sollicitations évitées par client et par mois | 584 h | 20 440 EUR |
| Notifications automatiques de réservation et d'annulation | env. 2 560 réservations / an | 3 min par réservation | 128 h | 4 480 EUR |
| **Total des coûts évités** | | | **1 552 h** | **54 320 EUR / an** |

Ne sont pas valorisés, faute de base objective : la réduction des erreurs de calcul de commission, l'image de marque auprès des propriétaires (application dédiée, PWA, relevés professionnels), la capacité à accueillir de nouveaux clients sans embauche administrative, et les modules différenciants (pilotage du chauffage, suivi de consommation, parrainage, LMNP).

### 10.2 Valeur d'usage actualisée

```text
Coûts évités bruts          54 320 EUR / an
Run minimal à déduire       13 800 EUR (maintenance corrective) + 1 650 EUR (fonctionnement) = 15 450 EUR / an
Flux net                    38 870 EUR / an
Facteur d'actualisation     5 ans à 10 % : (1 - 1,10^-5) / 0,10 = 3,7908
Valeur d'usage nette        38 870 x 3,7908 = 147 000 EUR
Valeur d'usage brute        54 320 x 3,7908 = 206 000 EUR
```

### 10.3 Criticité opérationnelle

| Indicateur | Valeur |
|---|---|
| Part des relevés de la conciergerie produits par la plateforme depuis août 2025 | 100 % |
| Chiffre d'affaires Hello Keys facturé via la plateforme (annualisé 2026) | 712 600 EUR HT |
| Montants reversés aux propriétaires via les relevés (2026) | 1 716 240 EUR |
| Clients actifs dépendant de la plateforme pour leur suivi | 146 |
| Croissance de la cadence de relevés 2025 -> 2026 | x 2,1 |

Sans la plateforme, la conciergerie devrait reconstituer manuellement ces traitements ou acquérir plusieurs outils du marché ; la section suivante chiffre cette alternative.

---

## 11. Approches complémentaires : substitution et comparables

### 11.1 Coût de substitution par des outils du marché

| Besoin | Alternative du marché | Hypothèse tarifaire | Coût annuel |
|---|---|---|---|
| Portail propriétaire (réservations, calendrier, relevés simples) | module propriétaire d'un logiciel de gestion locative | 4 EUR / logement / mois x 183 logements | 8 800 EUR |
| Automatisation facturation et emails | outil d'automatisation et de reporting | 100 EUR / mois | 1 200 EUR |
| **Total** | | | **env. 10 000 EUR / an** |

Cette substitution couvre environ 40 % du périmètre fonctionnel (ni compta LMNP, ni portefeuille de parrainage, ni pilotage du chauffage, ni suivi de consommation, ni portail voyageur, ni application mobile dédiée, ni logique de commission propre à Hello Keys). Elle fournit un **plancher** de la valeur annuelle du service rendu, pas une valeur de l'actif.

### 11.2 Comparables

Il n'existe pas de marché de cession pour un logiciel interne de conciergerie ; les comparables disponibles sont les devis de développement sur mesure, qui sont précisément l'objet de la méthode bottom-up. En cas de cession de l'entreprise, un logiciel propriétaire de ce type est généralement valorisé par l'acquéreur selon l'approche par les coûts (coût de remplacement déprécié), ce qui conforte le choix de l'approche retenue.

---

## 12. Synthèse de valorisation et fourchette retenue

| Approche | Résultat | Rôle dans la conclusion |
|---|---|---|
| Coût de remplacement net, scénario central (senior France) | 471 000 EUR | borne haute de la fourchette retenue |
| Coût de remplacement net, équipe outillée IA | 252 000 EUR | borne basse de la fourchette retenue |
| Coût de remplacement net, agence | 697 000 EUR | scénario haut, non retenu |
| Borne haute industrielle (COCOMO II nette) | 1 292 000 EUR | référence théorique |
| Valeur d'usage nette actualisée (5 ans) | 147 000 EUR | contrôle de cohérence : valeur plancher |
| Coût historique de production | env. 48 000 EUR | base comptable éventuelle |
| Substitution annuelle par des outils du marché | env. 10 000 EUR / an | plancher du service rendu |

**Fourchette de valorisation indicative retenue : 250 000 EUR à 470 000 EUR, valeur centrale d'environ 360 000 EUR.**

Justification : la valeur d'un logiciel interne sans revenu propre se mesure d'abord par ce qu'il coûterait de le remplacer à périmètre identique, net de l'état de l'actif. En 2026, les deux modes de reconstruction les plus probables sont une équipe outillée IA (252 000 EUR) et un développeur senior en mode classique (471 000 EUR) ; la valeur centrale est leur moyenne. La valeur d'usage (147 000 EUR), calculée avec des hypothèses volontairement prudentes et sans valoriser les bénéfices qualitatifs, confirme que la fourchette basse n'est pas déconnectée du service rendu.

---

## 13. Facteurs d'ajustement à la hausse et à la baisse

### À la hausse

- La plateforme est en production depuis 17 mois avec 146 clients actifs et 75 utilisateurs connectés sur 30 jours : la reconstruction devrait aussi reproduire cette phase de validation terrain, non comptée dans l'effort.
- Les autorisations fournisseur (liste blanche KrossBooking, accès API Pennylane pour deux agences, Stripe Connect) sont acquises ; leur obtention est un délai incompressible pour un nouveau projet.
- Quatre documents de passation à jour réduisent fortement le coût de reprise par un tiers.
- La base contient 17 mois d'historique (2,9 Go) exploités par les statistiques, les classements et les analyses.

### À la baisse

- Dépendance à un auteur unique : une période de passation est nécessaire.
- Absence de tests automatisés et typage non strict : tout repreneur provisionnera un chantier de sécurisation (estimation : 40 à 60 jours).
- Dépendance à KrossBooking : un changement de channel manager imposerait de réécrire le proxy, la normalisation des réservations et le moteur de relevés (estimation : 60 à 90 jours).
- Certaines fonctionnalités sont expérimentales (« Alpha ») ou peu utilisées (1 mini-site, 6 écritures de portefeuille, 14 abonnements push), ce qui relativise la valeur de ces modules.

---

## 14. Hypothèses, limites et mise à jour du dossier

- Les efforts unitaires de la section 3 sont des estimations professionnelles, pas des devis ; un appel d'offres auprès de deux ou trois prestataires permettrait de les confirmer.
- Les taux journaliers sont des moyennes de marché 2026 ; ils varient selon la région, la durée de mission et le niveau d'autonomie attendu.
- Les coûts de fonctionnement sont estimés à partir des tarifs publics et des volumes constatés ; les factures réelles des fournisseurs font foi.
- Le coût historique repose sur une hypothèse de temps passé non tracée.
- Les coûts évités reposent sur des hypothèses de temps manuel ; ils peuvent être mesurés sur un mois d'activité pour fiabiliser la valeur d'usage.
- Les montants de flux (facturé, reversé) sont des agrégats calculés sur la table des relevés ; ils ne constituent pas des données comptables certifiées.
- Mise à jour : les mesures techniques se recalculent en quelques minutes (nombre de fichiers et de lignes, tables, fonctions, commits) ; les volumes d'activité se relisent dans l'administration (« Clients », « Relevés Sauvegardés », « Stats Hello Keys »).

---

## 15. Annexe A — Détail des calculs

```text
EFFORT BOTTOM-UP
  Pages           25,5 + 90 + 150,5 + 56            = 322,0 j
  Composants      33 + 69 + 15 + 15                 = 132,0 j
  Modules         30 + 22,5 + 9 + 6                 =  67,5 j
  Edge            36 + 58 + 20                      = 114,0 j
  Base            42 + 23 + 5,75 + 1,75 + 1,5       =  74,0 j
  Intégrations                                      =  49,0 j
  Développement                                     = 758,5 j
  Transverse      25 + 8 + 5                        =  38,0 j
  Recette         758,5 x 15 %                      = 114,0 j
  Pilotage        758,5 x 15 %                      = 114,0 j
  TOTAL                                             = 1 024,5 j  -> 1 025 j

SCÉNARIO ÉQUIPE OUTILLÉE IA
  (758,5 + 38) / 2,5 + 114 + 114                    = 546,6 j  -> 547 j

COÛTS BRUTS
  1 025 x 250 = 256 250     1 025 x 400 = 410 000
  1 025 x 575 = 589 375     1 025 x 850 = 871 250
  547 x 575   = 314 525     2 808 x 575 = 1 614 600

COÛTS NETS (x 0,80)
  205 000 / 328 000 / 471 500 / 697 000 / 251 600 / 1 291 700 (arrondis dans le corps du document)

FONCTIONNEMENT ANNUEL (bornes basse / haute)
  Supabase 270 / 432 ; Vercel 216 / 216 ; Resend 0 / 216 ; OpenAI 60 / 240 ; SMS 60 / 200 ;
  Twilio 5 / 10 ; proxy 60 / 300 ; domaine 15 / 30
  Total 686 / 1 644  -> 700 à 1 650 EUR

TCO 3 ANS (fonctionnement à la borne haute)
  Minimal    3 x (13 800 + 1 650) =  46 350
  Évolutif   3 x (34 500 + 1 650) = 108 450
  Industriel 3 x (103 000 + 1 650) = 313 950

VALEUR D'USAGE
  Heures      84 x 12 x 50/60 = 840 ; 146 x 12 x 20/60 = 584 ; 2 560 x 3/60 = 128 ; total 1 552 h
  Brut        1 552 x 35 = 54 320 EUR / an
  Net         54 320 - 15 450 = 38 870 EUR / an
  Actualisé   38 870 x 3,7908 = 147 350 EUR ; brut 54 320 x 3,7908 = 205 915 EUR

COÛT HISTORIQUE
  3 h x 21,7 j x 17 mois = 1 106,7 h ; x 40 EUR = 44 268 EUR ; + 1 700 + 2 040 = 48 008 EUR

FLUX TRAITÉS (table des relevés, agrégats)
  Facturé HK      2024 : 2 427 ; 2025 : 527 453 ; 2026 (11 mois) : 653 220 ; cumul 1 183 100 EUR
  Reversé         2024 : 6 337 ; 2025 : 1 398 458 ; 2026 : 1 716 240 ; cumul 3 121 035 EUR
  Annualisé 2026  653 220 / 11 x 12 = 712 600 EUR
```

---

## 16. Annexe B — Fiche de paramètres

Les paramètres ci-dessous sont ceux utilisés dans ce dossier. Modifier l'un d'eux impose de recalculer les sections concernées (références entre parenthèses).

| Paramètre | Valeur retenue | Sections |
|---|---|---|
| Efforts unitaires par tiers de taille | voir section 3.2 | 3, 5, 6, 9, 12 |
| Taux de recette et de pilotage | 15 % + 15 % du développement | 3, 5 |
| Facteur de productivité d'une équipe outillée IA | 2,5 sur le développement | 5, 6, 12 |
| Taux journaliers | 250 / 400 / 575 / 850 EUR | 5, 6, 9 |
| Décote de dette technique | 20 % | 6, 12 |
| Ratio lignes physiques -> logiques (COCOMO) | 0,70 | 4 |
| Multiplicateurs d'effort COCOMO | 0,444 | 4 |
| Parité USD / EUR | 0,90 | 8 |
| Heures de développement historiques | 3 h / jour ouvré sur 17 mois | 7 |
| Coût horaire chargé (historique / coûts évités) | 40 EUR / 35 EUR | 7, 10 |
| Temps manuel évité par relevé / par client / par réservation | 50 min / 20 min par mois / 3 min | 10 |
| Taux d'actualisation et horizon | 10 % sur 5 ans | 10 |
| Tarif de substitution | 4 EUR / logement / mois + 100 EUR / mois | 11 |

> Fin du dossier. Toute communication de ce document à un tiers (expert-comptable, repreneur, investisseur) doit s'accompagner de la mention de sa date de référence et de son caractère estimatif.
