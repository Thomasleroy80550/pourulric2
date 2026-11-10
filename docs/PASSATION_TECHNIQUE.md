# Hello Keys — Documentation technique de passation

**Objet :** transmettre le fonctionnement du portail propriétaire et de son back-office à l’équipe qui reprendra sa maintenance après le départ prévu en décembre.

**Public cible :** développeur repreneur, responsable technique et administrateur d’exploitation.

**Statut :** documentation du code et des métadonnées Supabase accessibles au moment de la rédaction. L’année du départ n’a pas été précisée. Le destinataire nominatif, le domaine de production et les responsables d’accès restent à confirmer.

**Confidentialité :** diffusion interne restreinte. Aucun mot de passe, jeton, numéro bancaire, donnée client ou valeur de secret ne doit être ajouté à ce document. Les anomalies de sécurité ci-dessous doivent être traitées dans un circuit interne sécurisé.

> Cette documentation n’est pas une certification de sécurité ni une recette de production. Les requêtes effectuées pour la préparer sont des lectures de métadonnées. Aucun traitement financier, envoi d’email, commande de thermostat ou modification de base n’a été déclenché. Le site n’a pas été modifié.

## Sommaire

1. Vue d’ensemble et architecture
2. Démarrage, routage et versions d’interface
3. Authentification et autorisation
4. Données et identifiants métier
5. Réservations et KrossBooking
6. Relevés financiers et calculs
7. Stripe, Pennylane et automatisations externes
8. Chauffage, consommation et Netatmo
9. Notifications, emails et support
10. Modules complémentaires et sites publics
11. Stockage des fichiers
12. Tâches planifiées et triggers
13. Développement, publication et retour arrière
14. Diagnostic et procédures d’incident
15. Risques techniques et sécurité
16. Organisation de la passation de décembre

Voir également [l’inventaire détaillé](PASSATION_INVENTAIRE.md) : **160 déclarations de routes, 78 fonctions Edge avec un fichier source et 54 modules API frontend recensés**. Ces nombres décrivent le dépôt inspecté, pas la fréquentation ni les déploiements actifs.

---

## 1. Vue d’ensemble et architecture

Le portail Hello Keys est une application web de gestion de locations. Il permet notamment aux propriétaires de consulter leurs réservations, leurs finances, leurs performances et leurs avis, et au personnel Hello Keys de gérer les comptes, les logements, les relevés et les services associés.

L’application est une **SPA** : le navigateur charge le HTML et les ressources JavaScript, puis React gère les écrans. Le serveur d’hébergement du frontend n’exécute pas les calculs métier React. Les données sont soit lues dans Supabase, soit récupérées auprès d’API tierces via des fonctions serveur.

```text
Navigateur / PWA
  └─ React + React Router + composants UI
       ├─ TanStack Query et état React
       ├─ src/lib/* : accès aux données et adaptations métier
       │    ├─ Supabase Auth
       │    ├─ Supabase Data API → PostgreSQL / RLS / RPC
       │    ├─ Supabase Storage
       │    └─ Supabase Edge Functions → services externes
       └─ Génération locale de certains PDF et traitement XLSX

PostgreSQL
  ├─ Tables, contraintes, fonctions SQL et triggers
  ├─ pg_cron → traitements planifiés
  └─ pg_net → certains appels HTTP depuis la base

Edge Functions (Deno)
  └─ KrossBooking, Stripe, Pennylane, Resend, Netatmo,
     RTE, SMS, support et analyse assistée par IA
```

### Stack observée

Les versions ci-dessous sont les **contraintes déclarées** dans `package.json`, pas un relevé des versions réellement résolues en production.

| Couche | Technologie |
|---|---|
| Interface | React `^18.3.1`, TypeScript `^5.5.3` |
| Compilation | Vite `^6.3.4`, React SWC |
| Routage | React Router DOM `^6.26.2` |
| Cache de requêtes | TanStack React Query `^5.56.2` |
| UI | Tailwind CSS `^3.4.11`, shadcn/ui, Radix UI, Lucide |
| Formulaires | React Hook Form, Zod |
| Données / Auth | Supabase JS `^2.50.0` côté navigateur |
| PDF / exports | jsPDF, AutoTable, html2canvas, XLSX, JSZip |
| Graphiques / dates | Recharts, date-fns |
| PWA | vite-plugin-pwa, Workbox |
| Enveloppe native possible | Capacitor 7 |
| Gestionnaire déclaré | pnpm 10.12.1 |

`next-themes` est utilisé pour les thèmes : cela ne signifie pas que le projet utilise Next.js. Le framework de compilation est bien Vite.

### Répartition du code

| Emplacement | Responsabilité |
|---|---|
| `src/main.tsx` | Entrée React et comportements globaux du navigateur |
| `src/App.tsx` | Providers et toutes les routes |
| `src/pages/` | Écrans propriétaire, publics et administrateur |
| `src/pages/v4/` | Interface mobile V4 et hooks de données associés |
| `src/components/` | Layouts, formulaires, dialogues, impressions et composants métier |
| `src/components/ui/` | Composants de base shadcn/ui |
| `src/contexts/InvoiceGenerationContext.tsx` | État et orchestration de génération des relevés |
| `src/lib/` | APIs frontend, modèles, calculs et exports |
| `src/integrations/supabase/client.ts` | Instance partagée du client Supabase |
| `supabase/functions/<nom>/index.ts` | Backend Edge, dans un contexte Deno distinct du frontend |
| `public/` | Ressources statiques et script push du service worker |
| `vite.config.ts`, `vercel.json` | Compilation, PWA et réécriture SPA |

Le projet Supabase relié est `dkjaejzwmmwwzhokpbgs`. Des URLs vers ce projet sont également codées en dur dans plusieurs modules. Une migration de projet exige donc davantage qu’un changement d’une seule variable.

## 2. Démarrage, routage et versions d’interface

### Composition de l’application

Dans `App.tsx`, un `QueryClient` est créé au niveau du module. Le parcours normal est enveloppé dans les providers suivants : React Query, thèmes, tooltips, routeur, génération des relevés, session et frontière d’erreur globale. Les toasts, prompts PWA, bandeaux et redirections mobiles sont intégrés à cette composition.

Les chemins `/embed/avis`, `/preview/digicode` et `/halloween` utilisent une branche autonome : ils ne passent pas par le fournisseur de session ni tous les providers du shell habituel. Toute modification de ces écrans doit tenir compte de cette différence.

### Routes principales

| Surface | Chemins représentatifs |
|---|---|
| Accueil desktop | `/`, `/home-classic`, `/home-v2`, `/home-v3` |
| Réservations et planning | `/bookings`, `/calendar`, `/planning-v2`, `/planning-v3` |
| Finances | `/finances`, `/wallet`, `/performance`, `/prevision-ca`, `/lmnp` |
| Logements | `/my-rooms`, `/numero-enregistrement`, `/mini-site` |
| Support et rapports | `/tickets`, `/tickets/:id`, `/reports`, `/messages` |
| Administration | `/admin` et nombreux sous-chemins spécialisés |
| Nouvelle interface admin | `/admin-v2`, `/admin-v2/users` |
| Mobile | `/v4` et sous-chemins de réservation, finance, messages et paramètres |
| Public | `/sites/:slug`, `/logement/:roomId/signaler`, `/signalement/:reportId`, `/suivi` |
| Netatmo | `/integrations/netatmo` et `/integrations/netatmo/callback` |

La route `/` rend **`DashboardPageV3`**, et non `Index.tsx`. `Index.tsx` est utilisé ici pour `/halloween`.

`MobileV4Redirect.tsx` effectue des redirections vers la V4 selon le contexte mobile et le chemin. Pour investiguer une navigation inattendue, examiner à la fois ce composant et le fournisseur de session.

**Attention aux commentaires obsolètes :** `App.tsx` qualifie encore la V4 de « maquette / données fictives », mais `src/pages/v4/v4-data.ts` utilise les APIs réelles de logements, réservations, relevés, avis, notifications et tickets. Il ne faut donc pas considérer toute la V4 comme une démonstration hors production. La réalité de chaque sous-écran se vérifie individuellement.

`MigrationBanner.tsx` contient une annonce de migration du 16 au 18 novembre, avec un début fixé au **16 novembre 2026 à 08:00 heure de Paris**. C’est une information d’interface, pas une preuve que la migration a eu lieu ni un mécanisme de blocage serveur. Revalider le bandeau avant la passation finale.

## 3. Authentification et autorisation

### Cycle de session

`SessionContextProvider.tsx` expose `session`, `profile` et `loading` via `useSession()`.

1. Le client s’abonne à `supabase.auth.onAuthStateChange` et lit la session initiale avec `getSession()`.
2. Lorsqu’une session existe, `getProfile()` vérifie l’utilisateur avec `auth.getUser()` puis lit son profil.
3. Le rôle et le statut d’onboarding pilotent les redirections.
4. Un heartbeat met à jour `profiles.last_seen_at` immédiatement, puis toutes les 60 secondes.
5. Le retour à un onglet visible relance la validation de session et du profil.
6. Les revalidations après le premier chargement sont réalisées en arrière-plan pour éviter de démonter les formulaires ouverts.

Les administrateurs arrivant depuis certaines pages de connexion ou d’onboarding vont vers `/admin`. Les utilisateurs ordinaires qui ne sont pas au statut `live` sont orientés vers `/onboarding-status`, sauf exceptions définies dans le provider.

L’absence de session redirige vers `/login`, sauf chemins autorisés par une liste utilisant `startsWith`. Cette liste inclut notamment les connexions, invitations, mini-sites, signalements, le suivi, l’installation et `/smart-pricing`. Ne pas confondre cette whitelist avec la liste complète des routes.

### Contrôles métier à la connexion

- Une nouvelle version des CGUV impose le dialogue d’acceptation via `CURRENT_CGUV_VERSION`.
- Quitter ce dialogue sans acceptation déclenche une déconnexion locale.
- L’absence de numéro d’enregistrement déclenche une information pour les utilisateurs non administrateurs ; le masquage de cette information est conservé en mémoire pour le cycle courant du provider.
- La résiliation de contrat déclenche un avertissement ; son blocage effectif dépend des écrans et APIs concernés.
- Les états de suspension et le verrouillage PWA sont intégrés au parcours de session.

### Modes d’authentification observés

- Connexion email / mot de passe dans `Login.tsx` et `v4/LoginV4.tsx`.
- OTP téléphone via `auth-api.ts`, `send-sms-otp` et `verify-sms-otp`.
- Changement de mot de passe via `auth.updateUser`.
- Réinitialisation V4 avec retour vers `/profile`.
- Déverrouillage d’appareil PWA via `pwa-unlock` et `pwa_device_locks`.

La récupération du mot de passe doit faire l’objet d’une recette complète : le provider ne comporte pas de branche spécifique `PASSWORD_RECOVERY`, et `App.tsx` ne déclare pas de route dédiée `/reset-password`. L’existence d’un appel de récupération ne garantit pas que l’utilisateur atteint correctement l’écran de modification.

### Trois niveaux de protection distincts

1. **Interface** : `AdminLayout.tsx` vérifie `profile.role === 'admin'`, refuse le rendu et redirige sinon. Ce contrôle ne remplace pas une protection serveur et ne prouve pas que toutes les pages admin utilisent ce layout.
2. **Data API** : les privilèges PostgreSQL déterminent les opérations accessibles ; les politiques RLS déterminent les lignes accessibles.
3. **Edge / RPC** : vérifier l’identité, le rôle et l’autorisation métier avant une action privilégiée. Un client `service_role` contourne les politiques RLS ordinaires.

Les fonctions inspectées utilisent des stratégies différentes : JWT vérifié avec `auth.getUser()`, secret cron pour les automates, ou parcours publics dédiés. Il n’existe pas de garantie globale d’autorisation fournie par le seul nom d’une fonction.

### Création du profil

Le trigger `on_auth_user_created` sur `auth.users` appelle `public.handle_new_user()` pour créer `profiles`. Les données initiales proviennent en partie de `raw_user_meta_data`, dont le rôle dans l’implémentation observée. Ce point est sensible et doit être revu avec les règles de création de comptes.

## 4. Données et identifiants métier

Les métadonnées interrogées montrent la RLS activée sur toutes les tables `public` recensées. Cela ne certifie pas la pertinence des policies, des privilèges de colonnes, des RPC ou des fonctions serveur.

### Identifiants à ne pas confondre

| Identifiant | Usage |
|---|---|
| `auth.users.id` / `profiles.id` | Identité UUID de la personne |
| `user_rooms.user_id` | Rattachement du logement à un profil |
| `room_id` | Identifiant du logement dans les échanges KrossBooking |
| `id_room_type` | Catégorie / type de logement KrossBooking |
| `krossbooking_property_id` / `property_id` | Établissement KrossBooking |
| `pennylane_customer_id` | Client dans la comptabilité externe |
| `stripe_account_id` | Compte connecté Stripe |
| `invoices.id` | Relevé interne UUID, distinct d’une facture Pennylane |
| `mini_sites.slug` | Adresse publique du mini-site |

### Principaux ensembles de tables

| Domaine | Tables |
|---|---|
| Identités et partages | `profiles`, `account_members`, `delegated_invoice_viewers`, `accountant_client_relations`, `accountant_requests` |
| Logements | `user_rooms`, `room_furniture`, `room_utility_events`, `digital_booklets`, `key_board_slots` |
| Finances | `invoices`, `expenses`, `recurring_expenses`, `rehousing_notes`, `transfer_verification_statuses`, `client_statement_notes`, `client_payment_scores` |
| Wallet / parrainage | `hello_wallet_accounts`, `hello_wallet_entries`, `hello_wallet_requests`, `hello_wallet_referrals`, plus tables historiques `credit_transactions` et `referrals` |
| Communication | `notifications`, `conversations`, `messages`, `push_subscriptions` |
| Réservations / avis | `processed_reservations`, `reservation_email_events`, `reservation_email_sync_runs`, `krossbooking_reviews`, `review_replies` |
| Exploitation | `housekeeping_notes`, `technical_reports`, `technical_report_updates`, `reports`, `hivernage_requests`, `consumable_billings`, `season_price_requests` |
| Énergie | `conso_caches`, `netatmo_tokens`, `netatmo_thermostats`, `netatmo_weather_stations`, `netatmo_logs`, `thermostat_scenarios`, `thermostat_schedules`, `temperature_alert_settings` |
| Publication | `pages`, `announcements`, `faqs`, `changelog`, `mini_sites`, `domain_requests` |
| Campagnes | `newsletter_campaigns`, `newsletter_queue`, `newsletter_deliveries` |
| Technique | `error_logs`, `app_settings`, `app_secrets`, `push_config`, `krossbooking_token_cache`, `pwa_device_locks`, `pwa_installs`, `admin_page_usage` |
| Fiscalité LMNP | `lmnp_settings`, `lmnp_fixed_assets` |

Certaines tables ont une RLS active sans policy. Ce peut être volontaire pour des accès exclusivement serveur ; ne pas ajouter une policy permissive simplement pour faire disparaître une erreur frontend.

### Profil propriétaire

`profiles` porte une part importante de la configuration : agence, taux de commission, onboarding, établissement KrossBooking, client Pennylane, compte Stripe, préférences de notification, activation de modules, résiliation, suspension et paramètres d’énergie.

Le statut d’onboarding est un enum :

```text
estimation_sent → estimation_validated → cguv_accepted
→ keys_pending_reception → keys_retrieved → photoshoot_done → live
```

Cette liste décrit les valeurs existantes et le parcours métier apparent ; elle n’établit pas l’existence d’une machine à états imposant chaque transition.

### Relevés internes

`invoices` conserve `user_id`, une période textuelle, `invoice_data` JSONB, `totals` JSONB, l’auteur, les états Pennylane et de transfert, `source_type`, `is_paid` et `paid_at`.

Les relevés peuvent être générés ou manuels. Aucun index unique utilisateur/période n’a été observé dans le schéma retourné : une relance doit donc vérifier les données existantes plutôt que présumer qu’un doublon sera rejeté.

Le schéma montre une suppression en cascade des relevés lors de la suppression du profil. La suppression d’un compte a donc des conséquences documentaires et financières, et ne doit jamais être utilisée comme simple résolution d’un problème de connexion.

## 5. Réservations et KrossBooking

### Chemin de lecture

```text
Page / hook V4
→ getUserRooms()
→ fetchKrossbookingReservations(userRooms)
→ krossbooking-proxy
→ API KrossBooking v5 via proxy HTTP amont
→ normalisation des réservations
→ calendrier / liste / calculs
```

`src/lib/krossbooking.ts` normalise les dates, logements, statuts, voyageurs, commissions OTA et montants. Les informations de voyageurs peuvent provenir de la réservation ou des sous-éléments `rooms`. Si seul le total est disponible sans répartition, le normaliseur le considère comme adulte : cette règle influe sur la taxe de séjour et doit être connue.

### Caches

| Cache frontend KrossBooking | Durée configurée |
|---|---|
| Types de logement | 30 minutes |
| Réservations | 2 minutes |
| Tâches ménage | 5 minutes |

Ces caches en mémoire sont distincts du cache TanStack Query et du cache PWA. Le cache de réservations du module n’est pas indexé par utilisateur. Plusieurs hooks V4 ont aussi une clé de requête ne comprenant pas l’identité du compte. Une recette de changement de compte doit vérifier qu’aucune donnée précédente n’est réutilisée.

### Proxy serveur

`krossbooking-proxy` :

- Vérifie le JWT utilisateur avec `getUser()` pour les appels non cron.
- Charge un contexte de profil et de logements ; les administrateurs et les propriétaires n’ont pas le même périmètre.
- Accepte des secrets cron configurés pour les appels automatiques.
- Utilise `Deno.createHttpClient({ proxy: ... })` pour l’accès au fournisseur.
- Conserve le jeton KrossBooking en mémoire et dans `krossbooking_token_cache`.
- Renouvelle un jeton rejeté puis réessaie une fois.

La configuration du proxy amont est une dépendance critique : vérifier son hébergement, son secret éventuel, sa sortie IP et les autorisations fournisseur. Une erreur « IP not allowed » ne se résout pas en modifiant le calendrier React.

Les actions comprennent la lecture des réservations, les logs, le ménage, les types de logement, les messages, les avis, l’enregistrement de réservations et les modifications du channel manager. L’exhaustivité des contrôles de prix et de périmètre doit être vérifiée action par action.

Pour les séjours propriétaire, les types visibles incluent `PROPRI`, `PROP0` et l’annulation `CANC`. Les actions d’écriture influencent réellement la disponibilité : les tests doivent utiliser des logements de recette ou un créneau explicitement approuvé.

## 6. Relevés financiers et calculs

Le centre du traitement est `InvoiceGenerationContext.tsx`, utilisé par l’écran `/admin/invoice-generation`.

### Import XLSX

Le traitement lit la première feuille, supprime la première ligne et interprète des **positions de colonnes**, pas une correspondance par nom d’en-tête.

| Donnée | Index du tableau, base 0 |
|---|---|
| Arrivée / départ | 2 / 3 |
| Nuits / voyageurs | 4 / 7 |
| Portail | 16 |
| Voyageur | 18 |
| Total original payé | 22 |
| Prix séjour / taxe / ménage | 23 / 24 / 25 |
| Commission plateforme / frais paiement | 38 / 39 |

Les lignes trop courtes sont ignorées, ainsi que les lignes dont le champ voyageur vaut `PROPRIETAIRE`. Un changement de format de l’export fournisseur peut donc modifier les calculs sans nécessairement produire un blocage visible.

### Import depuis KrossBooking

Ce chemin est encore nommé « Alpha » dans le code. La période attend le format français « Mois AAAA ». Les réservations sont retenues selon le **mois du départ**, non le mois de l’arrivée. Les annulations `CANC` sont exclues ; les séjours `PROPRI` / `PROP0` sont inclus sans commission Hello Keys.

Cette différence avec le traitement XLSX doit être conservée dans les contrôles de rapprochement : les deux chemins ne sont pas entièrement équivalents.

### Formules observées

Pour une ligne standard :

```text
CA = prix séjour + frais ménage + taxe de séjour retenue
Montant versé = CA − commission plateforme − frais de paiement
Revenu généré = montant versé − frais ménage − taxe de séjour retenue
Commission Hello Keys = revenu généré × taux de commission
Total facture = somme des commissions + somme des ménages + ménage propriétaire additionnel
```

Pour Airbnb et Booking, la taxe retenue est mise à zéro. Dans le chemin KrossBooking, le prix séjour est d’abord reconstitué en retirant la taxe réelle et le ménage du montant total, puis le CA est reconstruit avec la taxe neutralisée.

Le taux de commission par défaut du schéma `profiles` est **0,26**, soit 26 %. Ne pas passer `26` à une fonction qui attend une fraction.

`montantVerse` n’est pas le revenu propriétaire final après toutes les charges : il faut distinguer versement plateforme, revenu généré, commission Hello Keys et total facturé. Les agrégations des pages de performance et de la V4 doivent être vérifiées avec leurs propres helpers.

Les totaux de base agrègent l’ensemble de `processedData`. La sélection de lignes sert aussi à établir les détails de transfert : elle ne doit pas être supposée filtrer tous les totaux.

### Sauvegarde et effets de bord

```text
Sauvegarde ou mise à jour de invoices
→ appel sendStatementDataToMakeWebhook
→ génération locale du PDF
→ upload dans statements
→ sendStatementByEmail
→ réinitialisation de l’état d’édition
```

Points importants :

- **Le mode de sauvegarde simple envoie lui aussi un email.** `sendEmail=false` modifie la présentation, pas l’existence de l’envoi.
- L’émission est basée sur `created_at` ; une échéance à J+15 est calculée pour les données envoyées au webhook.
- L’enchaînement n’est pas une transaction distribuée. Une erreur après la sauvegarde peut laisser un relevé enregistré mais un PDF ou un email manquant.
- Une mise à jour peut également relancer des effets externes.
- Le mapping des transferts classe Airbnb d’un côté et les autres sources vers Stripe ; cette convention doit être validée avec la finance.
- Le JSON `totals` sauvegardé par ce contexte n’inclut pas nécessairement tous les champs calculés en mémoire, notamment `totalCA` : certains consommateurs reconstruisent le CA.

**Procédure sûre :** avant de relancer, rechercher le relevé utilisateur/période, contrôler ses totaux, vérifier le PDF, puis vérifier les opérations externes. Ne pas réimporter et sauvegarder aveuglément après un message d’erreur.

## 7. Stripe, Pennylane et automatisations externes

### Stripe

Les APIs frontend et pages d’administration couvrent comptes connectés, transactions, rapprochement, transferts, doublons et versements. Les fonctions incluent `create-stripe-account`, `create-stripe-account-link`, `list-stripe-transfers`, `reconcile-stripe-transfers` et `initiate-stripe-payout`.

`initiate-stripe-payout` vérifie l’utilisateur et son rôle administrateur dans le code inspecté. Une opération Stripe peut réussir même si la mise à jour Supabase échoue ensuite. Pour un incident, l’état fournisseur doit être contrôlé avant de rejouer une opération.

Ne pas confondre paiement voyageur, transfert vers compte connecté, versement bancaire et simple drapeau de suivi dans `invoices`. La présence d’une page de rapprochement n’établit pas une synchronisation comptable exhaustive.

La configuration live/test, les webhooks actifs, leurs signatures et la stratégie d’idempotence doivent être confirmés avec le détenteur du compte Stripe.

### Pennylane

`src/lib/pennylane-api.ts` passe par `pennylane-proxy` pour la création et la lecture de factures. Le proxy cible l’API externe **v1** dans la source inspectée. L’agence et l’identifiant client du profil participent au choix de contexte.

Points à contrôler :

- Cohérence agence / clé API / identifiant client.
- Compatibilité des types : le schéma expose `pennylane_customer_id` en texte, alors que certains traitements le convertissent en nombre.
- Délégation : le frontend recherche un propriétaire délégué, mais le proxy observé utilise le client de l’appelant pour un non-admin. La consultation déléguée doit être testée de bout en bout.
- Création : une vérification d’identité est présente, mais aucune condition explicite réservant la branche `create_customer_invoice` aux administrateurs n’a été observée.
- Une clé est écrite en dur dans la branche d’agence « Baie de somme » ; sa valeur est volontairement absente de ce document.
- La source contient des caractères de délimitation anormaux à la place de certains template literals. Sa compilabilité et la correspondance avec la fonction réellement déployée doivent être contrôlées séparément.

### Make et autres automatisations

La génération des relevés appelle `sendStatementDataToMakeWebhook` dans `admin-api.ts`. Le webhook est choisi selon `krossbooking_property_id` : **1 → Crotoy, 2 → Berck** ; une autre valeur est traitée comme une erreur. Le payload comprend le client Pennylane, la période, la commission Hello Keys, les frais de ménage, le ménage propriétaire et les dates d’émission / échéance.

Le frontend effectue directement l’appel HTTP vers Make. La réponse met à jour `pennylane_status` et éventuellement `pennylane_invoice_url`. Les erreurs sont enregistrées mais non propagées pour ne pas interrompre la génération du relevé : **un succès affiché pour le relevé peut coexister avec `pennylane_status='error'`**. La fonction de relance utilise la date du jour pour l’émission et J+15 pour l’échéance.

Le scénario externe, ses accès, son mapping, ses reprises et sa gestion des doublons doivent être transmis par son responsable. Les URLs de webhook sont des éléments sensibles, actuellement référencés dans le code frontend : leur exposition et leur protection doivent être revues ; ne pas recopier leurs valeurs dans la passation.

## 8. Chauffage, consommation et Netatmo

### Consommation électrique

`ElectricityConsumptionPage.tsx` utilise `conso-proxy` avec le PRM, les paramètres d’accès, le type de mesure et la plage de dates. Le fournisseur ciblé par le proxy est `conso.boris.sh`. Le profil comporte `conso_prm`, `conso_token`, `conso_price_per_kwh` et l’activation du service. `conso_caches` et `refresh-conso` constituent la partie cache / actualisation serveur.

Le proxy observé valide les paramètres et transmet le token fournisseur fourni dans le payload, **sans vérification de session Supabase dans cette source**. Revoir son exposition, ses quotas et la confidentialité des logs. Le traitement `refresh-conso`, lui, utilise un secret cron et un client serveur privilégié pour lire les profils et actualiser les mesures.

Les composants Ecowatt passent par la fonction `ecowatt`, avec des paramètres RTE côté serveur. La disponibilité des données fournisseur, leur fraîcheur et le tarif appliqué doivent être distingués d’un problème de rendu graphique.

### OAuth et pilotage Netatmo

```text
Connexion Netatmo
→ callback /integrations/netatmo/callback
→ netatmo-auth : vérification utilisateur et échange du code
→ stockage dans netatmo_tokens
→ netatmo-proxy : appels fournisseur et renouvellement du jeton
```

Le mapping des thermostats et stations est conservé dans les tables dédiées. Les callbacks autorisés et scopes OAuth doivent être repris dans le compte développeur Netatmo. Le frontend ne doit jamais recevoir le secret client.

### Automatisation ThermoBnB

- `thermobnb-auto-planner` combine logements, scénarios, thermostats et réservations pour alimenter `thermostat_schedules`.
- `thermobnb-scheduler` lit les tâches éligibles, appelle le proxy Netatmo et conserve un résultat d’exécution ou d’échec.
- `temperature-alerts` et les paramètres associés couvrent les alertes.

Il s’agit d’actions sur des équipements réels. Avant un test, obtenir l’accord de l’exploitation et préciser logement, consigne, durée et procédure de retour manuel. Ne jamais couper les automatismes globalement sans vérifier les logements concernés.

## 9. Notifications, emails et support

### Notifications internes et push

Les notifications sont persistées dans `notifications`. Les abonnements push sont conservés dans `push_subscriptions`, la configuration sensible dans `push_config`, et les réceptions navigateur sont gérées par `public/push-sw.js`.

Le trigger inventorié `on_notification_created_push` appelle **`notify_push_on_notification()`**. Le nom a été confirmé dans le catalogue PostgreSQL. Pour diagnostiquer un envoi, examiner la définition de cette fonction et les appels vers `push-notifications` ; la présence du trigger ne prouve pas la livraison au navigateur.

Le diagnostic push doit distinguer : insertion de notification, exécution du trigger, appel Edge, réponse du service push, permission navigateur et service worker actif.

### Emails et newsletters

Resend est utilisé par plusieurs fonctions d’envoi et de réception. Les newsletters disposent d’une architecture à campagnes / queue / deliveries, avec `enqueue-newsletter` et `process-newsletter-queue`.

Le worker de queue utilise une authentification par secret cron. La planification, les campagnes, les destinataires en attente et les résultats d’envoi sont des couches distinctes. Avant reprise d’une campagne, vérifier les livraisons déjà enregistrées pour éviter les doublons.

Les événements de réservation par email disposent de plusieurs chemins : `resend-inbound-email`, `ingest-reservation-email-event`, `sync-resend-krossbooking-emails`, et des tables d’événements et de runs. Le cron historique `check_new_reservations` est désactivé dans le snapshot observé ; cela ne signifie pas que toutes les notifications de réservation sont désactivées.

### Support et signalements

Le code contient des intégrations Freshdesk et des proxys de tickets propriétaire. La messagerie interne `conversations` / `messages` ne doit pas être confondue avec ces tickets externes.

Le portail invité `guest-logement-portal` expose des parcours publics de signalement et de suivi. Il utilise un client serveur privilégié ; la sécurité repose donc sur les validations et preuves d’accès de chaque action, pas sur une session propriétaire. Prévoir une revue spécifique anti-abus et confidentialité des médias.

### IA

Des fonctions spécialisées couvrent l’analyse d’avis, les suggestions de réponse KrossBooking, la rédaction d’annonces/newsletters, les bilans et les erreurs. Les secrets OpenAI sont référencés côté Edge.

Une suggestion IA n’est pas automatiquement une validation métier. Les coûts, quotas, modèles réellement utilisés et règles de diffusion des données client doivent être confirmés par intégration, en particulier pour les messages voyageurs.

## 10. Modules complémentaires et sites publics

- **Logements :** formulaires de données générales, équipements, accès, sécurité, parking et inventaire du mobilier.
- **Ménage / linge :** tâches fournisseur, notes internes, commandes et rapports ; vérifier quel service constitue la source de vérité pour chaque écran.
- **Saison / hivernage :** demandes et tarifs associés, avec routes millésimées. `/hivernage-2027` réutilise `Hivernage2026Page` : ne pas déduire le millésime réel du seul nom du fichier.
- **Wallet Hello Keys :** ledger en centimes, demandes et parrainages via RPC. `hello_wallet_request` verrouille le compte, contrôle le solde et utilise un identifiant de demande pour la reprise ; `hello_wallet_review` traite la validation et la restitution du solde non utilisé. Les privilèges wallet sont distincts du seul rôle de profil.
- **LMNP :** calcul annuel dans `lmnp-engine.ts`, paramètres et immobilisations dans les tables dédiées, exports PDF. Les calculs doivent être validés par la comptabilité ; l’interface n’est pas une preuve de conformité fiscale.
- **Mini-sites :** `mini-site-api.ts`, `mini_sites`, statut `draft` / `published`, lecture publique par slug, médias dans un bucket dédié.
- **Domaines :** `domain_requests` et pages de gestion. Une demande de domaine dans la base ne prouve pas que DNS, certificat et routage ont été provisionnés.
- **Contenus :** pages, FAQ, actualités, annonces et changelog.

## 11. Stockage des fichiers

### Buckets observés dans Supabase

| Bucket | Public | Limites configurées observées |
|---|---|---|
| `technical_reports_media` | Non | Pas de taille / MIME déclarés dans les métadonnées retournées |
| `kyc-documents` | Non | Pas de taille / MIME déclarés |
| `statements` | **Oui** | Pas de taille / MIME déclarés |
| `secure_documents` | Non | Pas de taille / MIME déclarés |
| `mini-site-media` | Oui | 5 Mio ; JPEG, PNG, WebP, SVG |
| `guest_report_media` | Oui | 10 Mio ; formats image dont HEIC / HEIF |

Le caractère privé d’un bucket impose aussi de vérifier les policies `storage.objects` et les URLs signées. La fonction générique `uploadFile()` retourne une URL publique, ce qui n’est pas une stratégie adaptée universellement aux buckets privés.

`uploadStatementPdf()` stocke les relevés dans `statements`. **Un bucket public permet la lecture d’un objet à toute personne disposant de son URL**, indépendamment de la protection de la ligne `invoices`. L’absence de liste publique des fichiers ne rend pas leur contenu privé.

Pour les reprises, vérifier également les options d’upload et la politique d’écrasement. Une restauration PostgreSQL ne restaure pas à elle seule tous les objets Storage ni les documents conservés chez les fournisseurs.

## 12. Tâches planifiées et triggers

### Snapshot pg_cron

Les expressions sont celles retournées par la base. Le fuseau d’exécution doit être confirmé dans la configuration ; ne pas présumer l’heure de Paris.

| Job | Planification | Actif |
|---|---|---|
| `check_new_reservations` | `*/5 * * * *` | Non |
| `LINNKY` | `0 0 * * *` | Oui |
| `ThermoBnB Scheduler` | `30 seconds` | Oui |
| `PLANNER` | `30 seconds` | Oui |
| `sync_resend_krossbooking_emails_every_minute` | `* * * * *` | Oui |
| `scan-krossbooking-reviews-daily` | `0 3 * * *` | Oui |
| `process_newsletter_queue_every_minute` | `* * * * *` | Oui |

Les commandes ont volontairement été masquées pour ne pas exposer de secrets. Les noms `LINNKY` et `PLANNER` suggèrent leur fonction mais leur cible exacte doit être confirmée en inspectant la commande dans un environnement sécurisé. L’état `active=true` ne prouve pas le succès des dernières exécutions.

### Triggers significatifs observés

| Événement | Effet |
|---|---|
| Création d’utilisateur Auth | Création du profil par `handle_new_user()` |
| Nouveau message | Actualisation de la conversation |
| Nouvelle note ménage | Création de notifications pour les propriétaires rattachés au logement |
| Nouvelle note de relogement | Traitement de notification / email |
| Nouvelle notification | Déclenchement du traitement push |
| Nouveau parrainage historique | Synchronisation vers le wallet |
| Insertion / changement de rôle profil | Synchronisation du statut administrateur wallet |
| Mise à jour de nombreuses tables | Actualisation de `updated_at` |

Ces effets peuvent s’exécuter lors d’une importation ou d’une reprise. Une restauration ou un replay doit être préparé en tenant compte des triggers, des crons et des envois externes.

## 13. Développement, publication et retour arrière

### Configuration observée

- `package.json` déclare `dev`, `build` et `preview`, basés sur Vite.
- Le build Vite produit normalement `dist` ; Capacitor utilise aussi `webDir: 'dist'`.
- `vercel.json` réécrit toutes les routes vers `index.html`, ce qui permet le rechargement d’un chemin React Router.
- Cette présence ne prouve pas que Vercel est l’hébergeur actif.
- `tsconfig.app.json` désactive `strict`, `noUnusedLocals` et `noUnusedParameters`.
- Aucun script de test automatisé n’est déclaré dans le manifeste inspecté. La couverture de tests et la CI n’ont pas été établies.
- Les fonctions Edge ont leurs propres imports distants Deno / Supabase, avec des versions variables. Leur validation n’est pas remplacée par le build frontend.
- Les migrations de base sont gérées séparément : comparer le schéma effectif à l’historique, ne pas assimiler la présence d’un fichier à son application.

### PWA

`vite.config.ts` configure `registerType: 'prompt'`, le manifeste Hello Keys, le pré-cache Workbox, la suppression des anciens caches et `clientsClaim`. Le service worker importe `push-sw.js`. La taille maximale d’une ressource pré-cachée est de 8 Mio.

L’icône PWA est extraite du favicon lors du chargement de la configuration Vite. Une divergence entre onglet et application installée peut provenir de l’ancien service worker et non d’un déploiement manquant.

La PWA ne garantit pas que les opérations métier fonctionneront hors connexion : les lectures de données et actions financières restent dépendantes du réseau et des services externes.

### Accès à transmettre avant publication autonome

- Dépôt Git et procédure de revue.
- Projet Dyad si ce workflow reste utilisé.
- Hébergeur du frontend, historique de déploiement et rollback.
- Projet Supabase, accès Auth / DB / Storage / Edge et journaux.
- Registre DNS et propriétaire des domaines.
- Comptes développeurs et opérateurs des fournisseurs.
- Gestionnaire de secrets, droits minimaux et procédure de rotation.
- Comptes Apple / Google et certificats si une application Capacitor est réellement distribuée ; la configuration présente n’en constitue pas une preuve.

### Procédure recommandée de livraison

1. Identifier le commit à publier et la cible ; séparer frontend, schéma, Edge et configuration fournisseur.
2. Vérifier TypeScript, compiler le frontend et valider séparément les fonctions Edge modifiées.
3. Faire une recette avec plusieurs rôles et deux comptes propriétaires distincts.
4. Pour les opérations externes, contrôler les effets réels sans déplacer d’argent ou piloter un équipement non autorisé.
5. Publier selon le workflow confirmé, vérifier un accès direct aux routes profondes et une ouverture PWA.
6. Surveiller les erreurs, queues et crons après livraison.

### Retour arrière

Le rollback frontend ne remet pas automatiquement en arrière le schéma PostgreSQL, les objets Storage, les fonctions Edge, les emails ni les transactions fournisseur. Avant toute publication sensible, définir explicitement ce qui peut être annulé et ce qui nécessite une compensation métier.

### Sauvegardes à confirmer

Le plan de sauvegarde, la rétention, l’existence du PITR et la dernière restauration testée n’ont pas été vérifiés. La passation finale doit contenir une preuve de restauration en environnement isolé couvrant base, Storage, configuration Auth et dépendances critiques. Ne jamais restaurer en production pour tester la procédure.

## 14. Diagnostic et procédures d’incident

### Ordre général de diagnostic

1. Noter heure, rôle, écran, action et identifiants internes strictement nécessaires.
2. Reproduire avec un compte de recette et sans action irréversible.
3. Examiner console et requête réseau : URL cible, statut HTTP et message ; ne pas copier les headers d’authentification.
4. Vérifier le contexte de session, le cache Query et le cache du module métier.
5. Identifier si l’échec vient de la Data API, d’une Edge Function, du fournisseur ou du rendu.
6. Consulter les journaux Edge et, pour un automate, les runs cron et tables de suivi.
7. Vérifier si des effets ont déjà réussi avant toute relance.

`error-logging-api.ts` construit des payloads d’erreur et appelle `log-client-error`. Les écrans admin et fonctions associés permettent la consultation et l’analyse. Ne pas supposer que toutes les erreurs asynchrones de tous les modules sont capturées par une frontière d’erreur React.

### Cas fréquents

| Symptôme | Vérifications prioritaires |
|---|---|
| Boucle de connexion | Session Supabase, lecture du profil, onboarding, redirection mobile, whitelist, CGUV |
| Calendrier vide | `user_rooms`, établissement et types KrossBooking, autorisation serveur, proxy amont, fournisseur, caches |
| Données d’un ancien compte | Identité des query keys, caches globaux et traitement du sign-out / changement d’espace |
| `permission denied for table` | GRANT du rôle PostgreSQL, puis policies ; ne pas désactiver la RLS |
| Liste vide sans erreur | Filtre utilisateur / agence, données absentes ou RLS excluant les lignes |
| Relevé absent après erreur | Rechercher `invoices` avant reprise ; PDF, webhook et email sont des étapes séparées |
| Relevé incorrect | Format XLSX, mois de départ, séjours propriétaire, taxe OTA, commission fractionnaire, mapping logement |
| Transfert incohérent | État Stripe réel, identifiants, compte connecté, drapeaux Supabase et tentatives précédentes |
| Facture Pennylane inaccessible | Agence, identifiant client, clé, syntaxe de la source, version déployée et délégation |
| Thermostat non piloté | OAuth, token, mapping, scénario, tâches planifiées, résultats du scheduler, réponse Netatmo |
| Newsletter bloquée | Job actif, authentification cron, queue, campagne et livraisons fournisseur |
| Push absent | Notification créée, trigger effectif, Edge, abonnement, permission et service worker |
| Ancienne UI sur PWA | Déploiement ciblé, prompt de mise à jour et version du service worker |

En preview Dyad, des problèmes d’authentification persistants peuvent justifier **More options (⋮) → Clear Cache** dans le panneau Preview, puis un nouvel essai. Cette opération efface les données navigateur et peut déconnecter d’autres previews. Ce n’est pas un substitut à la recherche de cause.

### Garde-fous d’exploitation

- Ne jamais tester un payout, un envoi massif ou une consigne de chauffage sans autorisation.
- Ne pas désactiver la RLS pour débloquer une interface.
- Ne pas recréer un utilisateur pour réparer une session.
- Ne pas réactiver le cron historique de réservations sans vérifier le nouveau flux email.
- Ne pas rejouer une campagne ou un webhook sans vérification des destinataires / documents déjà traités.
- Ne jamais transmettre une capture contenant un JWT, une clé, un IBAN ou un document KYC.

## 15. Risques techniques et sécurité

Les points suivants sont des constats de passation, **pas des correctifs appliqués**.

| Priorité | Constat et preuve | Action à prévoir |
|---|---|---|
| Critique | Clé Pennylane en dur dans `pennylane-proxy` | Rotation / révocation avec le propriétaire du compte ; stockage en secret ; revue de l’exposition et de l’historique |
| Critique | `profiles` autorise l’utilisateur à mettre à jour sa propre ligne ; GRANT UPDATE global et aucun contrôle de colonne sensible observé dans le schéma retourné | Tester et supprimer les possibilités de changement de rôle / permissions côté serveur ; l’exclusion TypeScript dans `updateProfile` ne protège pas la Data API |
| Élevée | `handle_new_user()` lit le rôle dans les métadonnées utilisateur | Imposer le rôle sûr côté serveur ; contrôler l’inscription et les endpoints de création |
| Élevée | `statements` est public alors que les relevés sont sensibles | Évaluer l’exposition, migrer vers un accès privé / signé avec une procédure de transition approuvée |
| Élevée | Branches Pennylane de création sans restriction admin explicite et lecture déléguée incohérente | Vérifier les droits par action et par client cible |
| Élevée | Délimiteurs de chaînes anormaux et logs non normalisés dans la source Pennylane | Vérifier la compilabilité Deno et la version déployée ; assainir les logs |
| Élevée | Caches KrossBooking / Query parfois non indexés par utilisateur | Recette multi-compte, invalidation et isolation lors des changements de session |
| Élevée | GRANTs larges observés sur `profiles` et `invoices`, dont privilèges non nécessaires à la Data API ordinaire | Revue du moindre privilège, y compris opérations non couvertes par la RLS comme TRUNCATE |
| Élevée | Pipeline relevé → webhook → PDF → email non atomique, sans unicité utilisateur/période dans le schéma observé | Définir idempotence, suivi des étapes et procédure de reprise |
| Moyenne | Sauvegarde simple / édition envoie un email | Documenter ce comportement dans la formation et les tests |
| Moyenne | Formats XLSX positionnels et montants parfois textuels | Conserver des exports de recette anonymisés et contrôler les colonnes après évolution fournisseur |
| Moyenne | Noms de secrets affichés avec retours ligne pour certaines variantes `APP_BASE_URL` / Pennylane | Comparer les noms attendus par le code aux noms réellement configurés ; ne pas supposer leur normalisation |
| Moyenne | Configurations spécifiques au projet codées à plusieurs endroits | Établir une liste de remplacement avant une migration de backend |
| Moyenne | Récupération de mot de passe sans parcours dédié établi | Recette complète des emails, callbacks autorisés et écran final |
| Moyenne | Automates toutes les 30 secondes | Vérifier chevauchement, quotas, idempotence et effets sur appareils réels |
| Moyenne | TypeScript non strict et aucun script de test déclaré | Mettre en place progressivement une recette reproductible, sans refonte aveugle |
| Moyenne | Commentaires V4 et contenus de migration millésimés | Actualiser les informations de passation après la migration effective |

La liste n’est pas exhaustive. Les tables `app_secrets`, les policies Storage, les RPC `SECURITY DEFINER`, les endpoints publics et l’ensemble des fonctions Edge nécessitent une revue dédiée. Les logs de profil dans le fournisseur de session peuvent exposer trop d’informations dans la console : vérifier le niveau de journalisation en production.

## 16. Organisation de la passation de décembre

### Avant le départ

- [ ] Nommer un repreneur technique et un référent métier finance / exploitation.
- [ ] Confirmer l’année et la date du départ, les domaines et les environnements concernés.
- [ ] Transmettre les accès par un gestionnaire sécurisé, avec MFA et comptes nominatifs.
- [ ] Vérifier qu’aucune dépendance critique ne repose uniquement sur un compte personnel du partant.
- [ ] Prioriser les risques critiques avant autonomie du repreneur.
- [ ] Relever la version réellement déployée du frontend et de chaque Edge critique.
- [ ] Confirmer les scénarios Make, webhooks, jobs et callbacks fournisseur.
- [ ] Faire un exercice de restauration et un exercice de rollback isolés.
- [ ] Préparer des comptes de recette propriétaire, admin, délégué et comptable.
- [ ] Actualiser cette documentation après la migration annoncée et avant le départ définitif.

### Ateliers de transfert recommandés

1. **Architecture et accès** : navigation du dépôt, Auth, profil, RLS, environnements et publication.
2. **Réservations et exploitation** : mapping KrossBooking, planning, ménage, signalements et incidents fournisseur.
3. **Finances** : production d’un relevé anonymisé, contrôle des formules, PDF, envoi, Pennylane, Stripe et reprise après échec.
4. **Automates** : crons, queue email, push, consommation, Netatmo et retour manuel.
5. **Mise en situation** : le repreneur diagnostique une panne simulée et réalise une livraison de recette sans aide directe.

### Matrice de responsabilité à finaliser

| Système | Responsable et suppléant à nommer | Preuve attendue |
|---|---|---|
| Frontend / dépôt / hébergement | Référent technique | Accès nominatif et rollback connu |
| Supabase | Administrateur backend | Accès, journaux, sauvegardes et restauration |
| KrossBooking et proxy amont | Référent channel manager / réseau | Contrat API, sortie IP et mapping |
| Stripe | Responsable finance habilité | Accès live/test, procédure de rapprochement |
| Pennylane / Make | Responsable comptable et automatisation | Agences, comptes, scénarios et contrôles de doublons |
| Resend / SMS / push | Responsable communication technique | Domaines, quotas, secrets et délivrabilité |
| Netatmo / ThermoBnB | Responsable exploitation | Mapping équipements et procédure manuelle |
| DNS / domaines / stores éventuels | Responsable infrastructure | Propriété, renouvellements et certificats |

### Critères de passation réussie

Le repreneur sait expliquer le chemin d’une réservation jusqu’à l’écran, distinguer un relevé interne d’une facture externe, diagnostiquer un problème de session / RLS / Edge / fournisseur, reprendre un pipeline partiellement exécuté sans doublon, et publier puis annuler une version de recette. Il dispose des accès et connaît la personne à contacter pour chaque dépendance externe.

### Limites de cette version

Non établis : hébergeur effectivement utilisé, domaine de production, SLA, coût mensuel, volumes, quotas réels, CI, secrets valides, déploiements Edge actifs, webhooks fournisseur, succès des dernières exécutions cron, politique de sauvegarde/PITR et inventaire exhaustif des policies Storage. Ces éléments doivent être ajoutés avec leurs preuves, sans inventer leur configuration.

**Sources principales :** `package.json`, `src/App.tsx`, `SessionContextProvider.tsx`, `AdminLayout.tsx`, `MobileV4Redirect.tsx`, `InvoiceGenerationContext.tsx`, APIs de `src/lib/`, hooks V4, fonctions Edge citées, configuration Vite / Vercel / Capacitor et métadonnées Supabase consultées. Le README antérieur se limitait à une ligne d’accueil ; cette passation constitue une nouvelle documentation, non la simple reprise d’un manuel existant.
