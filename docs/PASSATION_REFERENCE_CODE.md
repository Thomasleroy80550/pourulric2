# Hello Keys — Référence d'ingénierie (niveau code)

**Objet :** décrire le système tel qu'il est réellement implémenté, au niveau du code source, des schémas SQL, des politiques RLS, des fonctions Edge et des automates de base de données. Ce document complète la passation technique (vue d'ensemble) et le guide d'utilisation (vue fonctionnelle).

**Public cible :** ingénieur(e) logiciel senior appelé(e) à maintenir, auditer ou faire évoluer la plateforme. Prérequis : TypeScript strict, React 18 (hooks, contextes, Suspense non utilisé ici), PostgreSQL 15+ (RLS, SECURITY DEFINER, PL/pgSQL, pg_cron, pg_net), Deno et le runtime Supabase Edge, Workbox / service workers, jsPDF.

**Méthode :** chaque chiffre, chaque extrait de code et chaque définition SQL de ce document a été relevé directement dans le dépôt ou dans le catalogue PostgreSQL du projet au moment de la rédaction. Rien n'est extrapolé. Lorsqu'un point n'a pas pu être vérifié, il est marqué « à confirmer ».

> Avertissement : ce document contient des noms de tables, de colonnes, de secrets (noms uniquement, jamais les valeurs), des identifiants de projet et des règles de calcul financier. Il est strictement confidentiel.

## Sommaire

1. Métriques du dépôt et de la base
2. Topologie d'exécution
3. Chaîne de build, configuration TypeScript, PWA
4. Arbre des providers React et machine d'états de session
5. Couche d'accès aux données côté client
6. Pipeline KrossBooking : client, proxy Edge, jeton, normalisation
7. Moteur de relevés : formules, indices de colonnes, persistance
8. Modèle de données : DDL, contraintes, politiques RLS
9. Fonctions PL/pgSQL, triggers et automates
10. Fonctions Edge : conventions, inventaire, cas particuliers
11. Planification pg_cron et stockage
12. PWA, push, verrouillage d'appareil
13. Moteur LMNP
14. Matrice de sécurité et surface d'attaque
15. Invariants à ne jamais casser
16. Dette technique et points de rupture classés
17. Runbook d'intervention au niveau code
18. Index des identifiants techniques

---

## 1. Métriques du dépôt et de la base

### 1.1 Code applicatif (`src/`)

| Mesure | Valeur |
|---|---|
| Fichiers TypeScript / TSX | 512 |
| Lignes de code (`src/`, TS + TSX) | 106 344 |
| dont `src/pages/` (hors v4) | 50 400 lignes, 161 pages |
| dont `src/pages/v4/` (interface mobile) | 4 301 lignes |
| dont `src/components/` (hors `ui/`) | 33 465 lignes, 209 composants |
| dont `src/components/ui/` (shadcn/ui) | 4 887 lignes, 50 fichiers |
| dont `src/lib/` (modules d'accès API) | 11 933 lignes, 77 modules |
| dont `src/contexts/` | 520 lignes (1 contexte) |
| dont `src/hooks/` | 378 lignes (5 hooks) |
| Routes déclarées dans `src/App.tsx` | 160 `<Route>` |
| Routes chargées paresseusement (`React.lazy`) | 0 |
| Fichiers important le client Supabase | 135 |
| Appels `.from('<table>')` côté client | 326 |
| Appels `supabase.functions.invoke(` | 89 |
| Appels `.rpc(` | 8 |
| Dépendances `package.json` | 78 dependencies + 17 devDependencies |

### 1.2 Fichiers les plus lourds (source de risque de régression)

| Fichier | Lignes |
|---|---|
| `src/lib/admin-api.ts` | 1 818 |
| `src/pages/ElectricityConsumptionPage.tsx` | 1 577 |
| `src/pages/AdminUsersPage.tsx` | 1 494 |
| `src/pages/NetatmoDashboardPage.tsx` | 1 317 |
| `src/components/BookingPlanningGridStudio.tsx` | 1 278 |
| `src/pages/DashboardPage.tsx` | 1 260 |
| `src/pages/RevenueForecastPage.tsx` | 1 233 |
| `src/pages/LaundryOrdersPage.tsx` | 1 220 |
| `src/pages/AdminMissing2025StatsPage.tsx` | 1 024 |
| `src/components/admin/EditUserDialog.tsx` | 982 |
| `src/pages/DashboardPageV3.tsx` | 971 |
| `src/components/planning-v2/PlanningGanttV2.tsx` | 812 |

### 1.3 Backend Supabase

| Mesure | Valeur |
|---|---|
| Fonctions Edge (`supabase/functions/*/index.ts`) | 79 |
| Lignes cumulées des `index.ts` Edge | 14 906 |
| Module partagé | 1 (`_shared/payment-score.ts`) |
| Fichiers de migration (`supabase/migrations/`) | 139 |
| Tables du schéma `public` | 84 |
| Colonnes du schéma `public` | 801 |
| Colonnes de `profiles` | 64 |
| Colonnes de `user_rooms` | 54 |
| Politiques RLS (`pg_policies`, schéma public) | 242 |
| Clés étrangères | 97 |
| Index | 137 |
| Fonctions PL/pgSQL et SQL (`public`) | 23 |
| Triggers non internes | 22 dans `public` + 1 sur `auth.users` |
| Jobs `pg_cron` | 7 (6 actifs) |
| Buckets Storage | 6 |
| Secrets Edge déclarés | 45 noms |

### 1.4 Fonctions Edge les plus volumineuses

| Fonction | Lignes |
|---|---|
| `krossbooking-proxy` | 780 |
| `ingest-reservation-email-event` | 726 |
| `sync-resend-krossbooking-emails` | 520 |
| `check-new-reservations` | 516 |
| `netatmo-proxy` | 436 |
| `resend-inbound-email` | 393 |
| `guest-logement-portal` | 389 |
| `proprio-ticket-detail` | 383 |

---

## 2. Topologie d'exécution

```text
+--------------------------------------------------------------------------+
|  NAVIGATEUR / PWA / WebView Capacitor                                    |
|  React 18.3 + react-router-dom 6.26 + TanStack Query 5 + shadcn/ui       |
|  Service worker Workbox (vite-plugin-pwa 1.3) + push-sw.js               |
+-----------+------------------------------+-------------------------------+
            |  supabase-js 2.50 (anon key)  |  fetch() direct (Bearer JWT)
            v                              v
+-----------------------------+   +--------------------------------------+
|  PostgREST  (Data API)      |   |  Supabase Edge Runtime (Deno)        |
|  RLS = seule barriere       |   |  79 fonctions, verify_jwt = false    |
|  242 policies, 84 tables    |   |  auth.getUser() manuel + CRON_SECRET |
+-------------+---------------+   +------+-------------------------------+
              |                          |
              v                          v
+--------------------------------------------------------------------------+
|  PostgreSQL (projet dkjaejzwmmwwzhokpbgs)                                |
|  23 fonctions PL/pgSQL, 23 triggers, pg_cron (7 jobs), pg_net           |
|  Storage: 6 buckets                                                      |
+--------------------------------------------------------------------------+
              |            |            |            |            |
              v            v            v            v            v
        KrossBooking    Pennylane    Stripe      Resend      Netatmo / RTE
        (via proxy      (API v1/v2)  (Connect)   (emails     (OAuth2,
         egress IP fixe)                          entrants    Ecowatt)
                                                  + sortants)
        + SMSFactor, Twilio Verify, OpenAI, Freshdesk, Revyoos, Google Sheets
```

Points structurants :

- Il n'existe **aucun serveur applicatif propriétaire**. Toute logique serveur vit soit dans PostgreSQL (fonctions, triggers), soit dans les fonctions Edge Deno.
- Le frontend parle directement à PostgREST avec la clé anonyme : la sécurité des données repose **intégralement** sur les politiques RLS (section 8 et 14).
- Les jobs planifiés sont des appels HTTP `pg_net` déclenchés par `pg_cron` vers des fonctions Edge, authentifiés par un secret partagé (section 11).

---

## 3. Chaîne de build, configuration TypeScript, PWA

### 3.1 Outils

| Élément | Valeur |
|---|---|
| Gestionnaire de paquets | pnpm 10.12.1 (`packageManager` épinglé avec hash SHA-512) |
| Bundler | Vite + `@vitejs/plugin-react-swc` |
| Scripts | `dev` = `vite`, `build` = `vite build`, `preview` = `vite preview` |
| Tests automatisés | aucun script de test, aucun fichier `*.test.*` |
| CI | `.github/workflows/bump-version.yml` uniquement (incrément de `public/version.json`) |
| Hébergement front | Vercel, `vercel.json` = une seule règle de réécriture `/:path*` -> `/index.html` |
| Enveloppe mobile | Capacitor 7.4 (`capacitor.config.ts`, `webDir: 'dist'`), `appId` encore à la valeur générée `com.example.radiantaxolotlpouncemain2` |

### 3.2 `tsconfig.app.json` : le compilateur n'est PAS strict

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": false,
    "noImplicitAny": false,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": false,
    "paths": { "@/*": ["./src/*"] }
  }
}
```

Conséquences : `any` implicite partout, nullabilité non vérifiée, cas de `switch` sans `break` tolérés. Une vérification `tsc` globale remonte aujourd'hui **45 erreurs préexistantes** réparties dans le projet (non bloquantes pour Vite, qui transpile sans vérifier les types). Activer `strict: true` est un chantier à part entière (estimation : plusieurs milliers de diagnostics).

### 3.3 `vite.config.ts` : extraction d'icône et service worker

```ts
function extractPwaIconFromFavicon() {
  const ico = fs.readFileSync(path.resolve(__dirname, "public/favicon.ico"));
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
  const offset = ico.indexOf(pngSignature);            // PNG 256x256 embarque dans le .ico
  if (offset >= 0) fs.writeFileSync("public/icons/pwa-icon.png", ico.subarray(offset));
}
extractPwaIconFromFavicon();                            // execute a CHAQUE demarrage de Vite

VitePWA({
  registerType: 'prompt',                               // mise a jour sur confirmation utilisateur
  manifest: { name: 'Portail propriétaire Hello Keys', display: 'standalone',
              theme_color: '#255f85', start_url: '/', scope: '/' },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,     // bundle principal > 2 Mo
    importScripts: ['push-sw.js'],                      // handlers push/notificationclick
    navigateFallbackDenylist: [/^\/functions\//],
    cleanupOutdatedCaches: true,
    clientsClaim: true,
  },
})

define: {
  'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL
    || 'https://dkjaejzwmmwwzhokpbgs.supabase.co'),
}
```

À retenir : `maximumFileSizeToCacheInBytes` a dû être porté à 8 Mio parce que **les 160 routes sont importées statiquement** dans `App.tsx` ; le bundle principal dépasse la limite Workbox par défaut (2 Mio).

### 3.4 `src/main.tsx`

- Neutralise les gestes `gesturestart` / `gesturechange` sur pointeur grossier (Safari iOS ignore `user-scalable=no`).
- Impose un **splash screen natif d'au moins 1 400 ms** (`window.__splashShownAt` posé dans `index.html`), puis fondu de 450 ms et suppression du noeud DOM.
- Aucun `StrictMode`.

---

## 4. Arbre des providers React et machine d'états de session

### 4.1 Arbre (`src/App.tsx`)

```text
QueryClientProvider
 +- ThemeProvider (next-themes, attribute="class", themes: light | noel | halloween)
     +- TooltipProvider
         +- Toaster (shadcn) + Sonner
         +- BrowserRouter
             +- InvoiceGenerationProvider          <- etat global du generateur de releves
                 +- SessionContextProvider         <- session, profil, redirections, CGUV
                     +- GlobalAppErrorBoundary
                         +- Routes (160 <Route>)
```

Le `SessionContextProvider` est placé **sous** le routeur car il appelle `useNavigate()` et `useLocation()`. Toute page est donc re-rendue à chaque changement de `location.pathname` qui modifie les dépendances de `revalidateSessionAndProfile`.

### 4.2 `SessionContextProvider` : contrat

```ts
interface SessionContextType {
  session: Session | null;
  loading: boolean;
  profile: UserProfile | null;
}
```

### 4.3 Matrice de redirection (extrait fidèle de `revalidateSessionAndProfile`)

```ts
const isAdmin = userProfile.role === 'admin';
const isOnboardingComplete = userProfile.onboarding_status === 'live';

if (isAdmin) {
  if (['/login', '/v4/login', '/onboarding-status'].includes(location.pathname)) navigate('/admin');
} else if (!isOnboardingComplete) {
  if (location.pathname !== '/onboarding-status' && location.pathname !== '/estimation'
      && !location.pathname.startsWith('/redeem-invite')
      && !location.pathname.startsWith('/rejoindre-espace')) navigate('/onboarding-status');
} else if (['/onboarding-status', '/login', '/v4/login'].includes(location.pathname)) {
  navigate('/');
}

// Porte CGUV : version figee dans src/lib/constants.ts (CURRENT_CGUV_VERSION)
if (!userProfile.cguv_accepted_at || userProfile.cguv_version !== CURRENT_CGUV_VERSION) {
  setShowCguvModal(true);
}

// Sans session : liste blanche des chemins publics, sinon /login
const publicPaths = ['/login', '/v4/login', '/prospect-signup', '/redeem-invite',
  '/rejoindre-espace', '/sites/', '/smart-pricing', '/logement/', '/signalement/',
  '/suivi', '/installer'];
```

Règles induites :

| État | Chemin courant | Action |
|---|---|---|
| admin | `/login`, `/v4/login`, `/onboarding-status` | `navigate('/admin')` |
| user non `live` | tout sauf `/onboarding-status`, `/estimation`, `/redeem-invite*`, `/rejoindre-espace*` | `navigate('/onboarding-status')` |
| user `live` | `/onboarding-status`, `/login`, `/v4/login` | `navigate('/')` |
| sans session | hors liste blanche (préfixe) | `navigate('/login')` |

### 4.4 Effets de bord permanents

- **Heartbeat** : `updateUserLastSeen()` immédiatement puis toutes les **60 000 ms** tant qu'une session existe (colonne `profiles.last_seen_at`). Un onglet ouvert = 1 440 `UPDATE` par jour et par utilisateur.
- `hasInitializedRef` évite de remonter l'écran de chargement global lors des re-validations (`TOKEN_REFRESHED`, retour sur l'onglet) afin de ne pas démonter les formulaires en cours.
- Un profil `is_contract_terminated` déclenche un toast d'avertissement à chaque chargement de profil.
- Les écrans bloquants (`AccountSuspendedScreen`, `PwaSessionLock`, `CGUVModal`, `HousingRegistrationModal`, `OnboardingConfettiDialog`) sont rendus **par le provider lui-même**, au-dessus des pages.

---

## 5. Couche d'accès aux données côté client

### 5.1 Client unique

`src/integrations/supabase/client.ts` (613 octets) instancie **un seul** `createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)`. L'URL et la clé publique sont codées en dur ; aucune variable d'environnement n'est lue au runtime.

### 5.2 Absence de types générés

Le projet **n'utilise pas** `supabase gen types`. Les 84 tables sont manipulées via des interfaces écrites à la main dans `src/lib/*.ts`. Exemple : `UserProfile` (`src/lib/profile-api.ts`) déclare 73 propriétés optionnelles alors que `profiles` compte 64 colonnes ; plusieurs champs de l'interface n'existent pas en base (`created_at`, `last_sign_in_at` proviennent d'autres sources) et plusieurs colonnes réelles ne sont pas typées (`google_sheet_id`, `google_sheet_tab`, `key_deposit_address`, `key_sets_needed`). Tout renommage de colonne est donc **invisible pour le compilateur**.

### 5.3 Modèle d'appel standard (`getProfile`)

```ts
export async function getProfile(): Promise<UserProfile | null> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select(`*, onboarding_status, estimation_details, estimated_revenue,
             key_delivery_method, revyoos_holding_ids, kyc_documents, krossbooking_property_id`)
    .eq('id', user.id)
    .single();

  if (error) throw new Error(`Erreur lors de la récupération du profil : ${error.message}`);
  return data;
}
```

Remarque : `select('*', ...)` suivi de colonnes explicites est redondant mais inoffensif pour PostgREST. `auth.getUser()` provoque un aller-retour réseau vers GoTrue à chaque appel (contrairement à `getSession()`).

### 5.4 Répartition des 77 modules `src/lib/`

| Famille | Modules représentatifs |
|---|---|
| Accès tables | `profile-api.ts`, `admin-api.ts` (1 818 lignes, 55 fonctions exportées), `expenses-api.ts`, `notifications-api.ts`, … |
| Intégrations via Edge | `krossbooking.ts`, `pennylane-api.ts`, `stripe-api.ts`, `netatmo-api.ts`, … |
| Calcul | `lmnp-engine.ts`, `statement-pdf.ts`, `commission-*.ts`, … |
| Utilitaires | `download-utils.ts`, `constants.ts` (`CURRENT_CGUV_VERSION`), `utils.ts` (`cn`) |

### 5.5 Invocation d'une fonction Edge : deux styles coexistent

1. `supabase.functions.invoke('nom', { body })` (89 occurrences) : injecte automatiquement `Authorization: Bearer <access_token>` et `apikey`. Ne convertit en `Blob` que si `Content-Type` est `application/octet-stream` (cf. `download-handover`).
2. `fetch(URL_CODEE_EN_DUR, { headers: { Authorization } })` : utilisé par `callKrossbookingProxy` pour contrôler finement le parsing de la réponse texte.

---

## 6. Pipeline KrossBooking : client, proxy Edge, jeton, normalisation

### 6.1 Séquence complète

```text
Page React
  | fetchKrossbookingReservations(userRooms, forceRefresh)
  v
src/lib/krossbooking.ts
  | cache memoire (reservations: 2 min, housekeeping: 5 min, roomTypes: 30 min)
  | getProfile() -> krossbooking_property_id
  | Promise.all( userRooms.map(room => callKrossbookingProxy('get_reservations_for_room', ...)) )
  v
POST https://dkjaejzwmmwwzhokpbgs.supabase.co/functions/v1/krossbooking-proxy
  | Authorization: Bearer <JWT utilisateur>   OU   body.cron_secret (jobs)
  v
supabase/functions/krossbooking-proxy/index.ts
  | getUserContext(): auth.getUser() + profiles(role, krossbooking_property_id) + user_rooms
  |   -> admin : TOUTES les user_rooms ; user : seulement les siennes
  | getAuthToken(): memoire isolat -> table krossbooking_token_cache(id=1) -> /auth/get-token
  | switch(action) -> chemin API + payload
  | performKrossRequest(): fetch via Deno.createHttpClient({ proxy: KROSSBOOKING_UPSTREAM_PROXY_URL })
  | 401 / 403 "token invalid|expired" -> requestNewAuthToken() + 1 retry
  v
API KrossBooking (IP sortante fixe exigee par l'allowlist fournisseur)
```

### 6.2 Jeton partagé : mémoire + table

```ts
// Kross tokens are valid 7 days and auto-renew on each use, so one shared token is enough.
let inMemoryAuthToken: string | null = null;

async function getAuthToken(): Promise<string> {
  if (inMemoryAuthToken) return inMemoryAuthToken;
  const cached = await readCachedToken();          // krossbooking_token_cache WHERE id = 1
  if (cached) { inMemoryAuthToken = cached; return cached; }
  return await requestNewAuthToken();              // POST /auth/get-token, puis persistToken()
}

function isTokenRejected(status: number, responseText: string) {
  if (status === 401) return true;
  return status === 403 && /token/i.test(responseText) && /(invalid|expired|not valid)/i.test(responseText);
}
```

Propriétés :

- `inMemoryAuthToken` est **par isolat Deno** : plusieurs isolats peuvent demander un jeton en parallèle (pas de verrou). Le dernier écrit gagne dans la table (`upsert` sur `id = 1`).
- Le proxy d'egress (`KROSSBOOKING_UPSTREAM_PROXY_URL` / `_SECRET`) est obligatoire : KrossBooking filtre par IP (`isProviderIpDeniedError` détecte `/not allowed/i` et `/IP.*allowed/i`).
- Les secrets de cron acceptés sont une liste : `CRON_SECRET`, `CRON_SECRET_2`, `CRON_SECRET_NOTIFY_NEW_RESA` (+ une entrée supplémentaire), comparés après `trim()`.

### 6.3 Actions exposées par le proxy (switch exhaustif)

| `action` | Chemin KrossBooking | Garde-fous |
|---|---|---|
| `get_reservations_for_room` | `/reservations/get-list` | `id_room` obligatoire, `with_rooms: true` |
| `get_reservations_log` | `/logs/get-reservations-log` | `limit` 20 par défaut, `offset`, `page` |
| `get_housekeeping_tasks` | `/housekeeping/get-tasks` | `date_from` / `date_to` obligatoires |
| `save_reservation` | `/reservations/save` | 7 champs obligatoires, `userContext` requis (pas de cron) |
| `get_messages` | messagerie | contexte utilisateur |
| `get_single_message_thread` | messagerie | `getAuthorizedThread()` : vérifie l'appartenance du fil |
| `save_channel_manager` | channel manager (prix / restrictions) | contexte utilisateur |
| `get_room_types` | `/rooms/get-room-types` (à confirmer) | lecture seule |
| `get_all_reservations` | agrégation | `getAuthorizedReservations()` filtre sur les rooms du contexte |
| `get_reviews` | avis | lecture seule |

### 6.4 Normalisation brute -> `KrossbookingReservation`

```ts
export interface KrossbookingReservation {
  id: string;                    // String(res.id_reservation)
  guest_name: string;            // res.label || 'N/A'
  property_name: string;         // room.room_name (contexte de boucle, pas l'API)
  krossbooking_room_id: string;
  check_in_date: string;         // res.arrival   (YYYY-MM-DD)
  check_out_date: string;        // res.departure (YYYY-MM-DD)
  status: string;                // res.cod_reservation_status : CONF | CANC | PROPRI | PROP0 | ...
  amount: string;                // `${res.charge_total_amount}€`  <- CHAINE, pas nombre
  cod_channel?: string; ota_id?: string; channel_identifier?: string;
  tourist_tax_amount?: number;   // parseFloat(res.city_tax_amount)
  cleaning_fee_amount?: number;  // parseFloat(res.cleaning_fee_amount)
  property_id: number;           // res.property_id || profile.krossbooking_property_id
  id_room_type?: string;         // res.id_room_type || roomIdToRoomTypeMap.get(room.room_id)
  n_adults?: number; n_children?: number; n_guests?: number;   // extractOccupancy()
  ota_commissions_collected?: number; ota_commissions_deducted?: number;
}
```

`amount` est volontairement une chaîne suffixée `€` ; le moteur de relevés la re-parse avec `.replace(',', '.').replace(/[^\d.-]/g, '')`. Toute modification de ce format casse silencieusement les relevés générés « depuis Krossbooking ».

### 6.5 `extractOccupancy` : heuristique de repli en cascade

```ts
const rooms = Array.isArray(res?.rooms) ? res.rooms : [];
for (const room of rooms) {
  adults   += toInt(room?.n_adults ?? room?.adults ?? room?.n_adult);
  children += toInt(room?.n_children ?? room?.children ?? room?.n_child ?? room?.n_kids);
  guests   += toInt(room?.n_guests ?? room?.guests ?? room?.n_people ?? room?.occupancy);
}
if (adults === 0)   adults = toInt(res?.n_adults ?? res?.adults ?? res?.n_adult);
if (guests > 0 && adults === 0 && children === 0) adults = guests;   // tout le monde adulte
if (guests === 0)   guests = adults + children;
```

Cette fonction alimente la déclaration de taxe de séjour : six alias de champs par grandeur sont tolérés parce que l'API KrossBooking n'est pas stable sur ce point.

### 6.6 Dégradation

En cas d'erreur réseau, `fetchKrossbookingReservations` **retourne le cache périmé** s'il existe (`Returning stale reservations cache due to API error`), sinon `[]`. Les pages ne distinguent donc pas « aucune réservation » de « API en panne ».

---

## 7. Moteur de relevés : formules, indices de colonnes, persistance

Le moteur vit dans `src/contexts/InvoiceGenerationContext.tsx` (520 lignes) et expose deux entrées : `processFile` (export Excel KrossBooking) et `processFromKrossbooking` (API, mode « Alpha »).

### 7.1 Structure d'une ligne de relevé

```ts
export interface ProcessedReservation {
  portail: string; voyageur: string; arrivee: string; depart: string;
  nuits: number; voyageurs: number;
  prixSejour: number; fraisMenage: number; taxeDeSejour: number;
  ca: number;                  // chiffre d'affaires = total paye par le voyageur
  revenuGenere: number;
  commissionHelloKeys: number;
  montantVerse: number;
  originalTotalPaye: number; originalCommissionPlateforme: number; originalFraisPaiement: number;
}
```

### 7.2 Mode Excel : indices de colonnes codés en dur

```ts
const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
json.splice(0, 1);                                            // en-tete
json.forEach((row) => {
  if (!Array.isArray(row) || row.length < 40) return;         // ligne incomplete ignoree
  if ((row[18] || '').toUpperCase() === 'PROPRIETAIRE') return;  // sejours proprietaire exclus
  const portail              = row[16] || 'N/A';              // colonne Q
  const nuits                = parseInt(row[4]) || 0;         // colonne E
  const voyageurs            = parseInt(row[7]) || 0;         // colonne H
  const prixSejour           = parseFloat(row[23]) || 0;      // colonne X
  let   taxeDeSejour         = parseFloat(row[24]) || 0;      // colonne Y
  const fraisMenage          = parseFloat(row[25]) || 0;      // colonne Z
  const commissionPlateforme = parseFloat(row[38]) || 0;      // colonne AM
  const fraisPaiement        = parseFloat(row[39]) || 0;      // colonne AN
  // row[2] = arrivee (C), row[3] = depart (D), row[18] = voyageur (S), row[22] = total paye (W)
```

Tout changement de l'export KrossBooking (ajout ou déplacement d'une colonne) **décale silencieusement** les montants. Il n'y a pas de détection par nom d'en-tête.

### 7.3 Formules (identiques dans les deux modes)

```text
si portail contient "airbnb" ou "booking" : taxeDeSejour := 0   (la plateforme la collecte)

ca                  = prixSejour + fraisMenage + taxeDeSejour
montantVerse        = ca - commissionPlateforme - fraisPaiement
revenuGenere        = montantVerse - fraisMenage - taxeDeSejour
commissionHelloKeys = revenuGenere * commissionRate        (0 pour un sejour proprietaire)
```

`commissionRate` est le `profiles.commission_rate` du client, exprimé en fraction (0.20 pour « Forfait 20 % »).

### 7.4 Mode API : différences de sélection

```ts
const range = parseFrenchPeriodToRange(period);        // "Juillet 2024" -> [01/07, 31/07]
reservations.forEach((res) => {
  const status = (res.status || '').toUpperCase();
  if (status === 'CANC') return;                         // annulations exclues
  const isOwnerStay = status === 'PROPRI' || status === 'PROP0';   // inclus, commission = 0
  const checkOut = parseISO(res.check_out_date);
  if (checkOut < start || checkOut > end) return;        // rattachement au MOIS DU DEPART
  const totalAmount = parseFloat((res.amount || '0').replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
  const prixSejour  = totalAmount - fraisMenage - taxeDeSejour;   // taxe REELLE, avant mise a 0
  ...
});
processedReservations.sort((a, b) => (a.arrivee > b.arrivee ? 1 : a.arrivee < b.arrivee ? -1 : 0));
```

Le dictionnaire `FRENCH_MONTHS` accepte les variantes sans accent (`fevrier`, `aout`, `decembre`). Toute autre orthographe lève `Période invalide`.

### 7.5 Persistance (`saveInvoice`, `src/lib/admin-api.ts`)

```ts
const userProfile = await getProfileById(actualUserId);
if (!userProfile?.pennylane_customer_id?.trim()) {
  throw new Error("Impossible de créer un relevé pour ce client tant que l'ID Pennylane n'est pas renseigné.");
}
const payload = {
  user_id: actualUserId, period, invoice_data: invoiceData, totals,
  krossbooking_property_id: userProfile?.krossbooking_property_id || null,
  created_by: creatorId,                                   // admin connecte (auth.getUser)
};
const { data, error } = await supabase.from('invoices').insert(payload)
  .select(`*, profiles!user_id (first_name, last_name)`).single();
await createNotification(payload.user_id,
  `Votre nouveau relevé pour la période "${payload.period}" est disponible.`, '/finances');
```

Observations : aucune contrainte d'unicité `(user_id, period)` n'existe en base ; les doublons sont possibles. `invoice_data` et `totals` sont des `jsonb` libres, non validés par un schéma. La suite (PDF, Pennylane, email) est orchestrée côté client par la page `/admin/invoice-generation`, sans transaction : un échec intermédiaire laisse un relevé sans facture ou une facture sans email.

---

## 8. Modèle de données : DDL, contraintes, politiques RLS

### 8.1 `invoices` (DDL réel, abrégé)

```sql
CREATE TABLE public.invoices (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period text NOT NULL,                         -- "Juillet 2024" (texte libre)
  invoice_data jsonb NOT NULL,                  -- lignes ProcessedReservation[]
  totals jsonb NOT NULL,                        -- totalFacture, totalRevenuGenere, totalMontantVerse...
  created_at timestamptz DEFAULT now(),
  admin_comment text,
  stripe_transfer_completed boolean DEFAULT false,
  pennylane_status text DEFAULT 'pending',
  pennylane_invoice_url text,
  krossbooking_property_id integer,
  airbnb_transfer_completed boolean DEFAULT false NOT NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  transfer_statuses jsonb DEFAULT '{}'::jsonb,  -- { "stripe": true, "airbnb": false, ... }
  source_type text DEFAULT 'generated' NOT NULL CHECK (source_type IN ('generated', 'manual')),
  is_paid boolean DEFAULT false,
  paid_at timestamptz
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
```

Politiques en vigueur (5) :

```sql
CREATE POLICY "Users can view their own invoices." ON invoices FOR SELECT TO PUBLIC
  USING (auth.uid() = user_id);

CREATE POLICY "Accountants can view their clients' invoices" ON invoices FOR SELECT TO PUBLIC
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'accountant'
     AND EXISTS (SELECT 1 FROM accountant_client_relations
                 WHERE accountant_id = auth.uid() AND client_id = invoices.user_id));

CREATE POLICY "Delegates can view owner's invoices" ON invoices FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM delegated_invoice_viewers d
                 WHERE d.owner_id = invoices.user_id AND d.viewer_id = auth.uid()
                   AND d.status = 'accepted'));

CREATE POLICY "Admins can manage all invoices" ON invoices FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
-- + un doublon strict : "Admins can manage all invoices with property id" (meme predicat)
```

Lecture : un propriétaire **ne peut ni insérer ni modifier** un relevé (aucune politique INSERT/UPDATE pour lui) ; seules les mises à jour admin passent. Les grants sont pourtant `ALL` pour `anon` et `authenticated` : la table est entièrement exposée à PostgREST et seule la RLS filtre.

### 8.2 `user_rooms` : 54 colonnes, double clé étrangère

```sql
CREATE TABLE public.user_rooms (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid NOT NULL,
  room_id text NOT NULL,            -- id_room KrossBooking (texte)
  room_name text NOT NULL,
  room_id_2 text,                   -- id_room secondaire (prix / restrictions)
  keybox_code text, wifi_code text, wifi_ssid text, wifi_box_location text,
  property_type text, arrival_instructions text, departure_instructions text,
  parking_info text, parking_address text, parking_spots integer, parking_type text,
  parking_badge_or_disk boolean DEFAULT false, parking_regulated_zone_instructions text,
  house_rules text, is_non_smoking boolean DEFAULT false, are_pets_allowed boolean DEFAULT false,
  noise_limit_time text, waste_sorting_instructions text, forbidden_areas text,
  appliances_list text, bedding_description text, outdoor_equipment text, specific_appliances text,
  has_baby_cot boolean, has_high_chair boolean, has_cleaning_equipment boolean,
  has_house_manual boolean, has_smoke_detector boolean, has_co_detector boolean,
  has_alarm_or_cctv boolean, has_keybox boolean DEFAULT false NOT NULL,
  technical_room_location text, utility_locations text, recent_works text, logement_specificities text,
  is_electricity_cut boolean DEFAULT false NOT NULL, is_water_cut boolean DEFAULT false NOT NULL,
  linen_single_bed_qty integer DEFAULT 0 NOT NULL, linen_double_bed_qty integer DEFAULT 0 NOT NULL,
  linen_bath_towel_qty integer DEFAULT 0 NOT NULL, linen_hand_towel_qty integer DEFAULT 0 NOT NULL,
  linen_bath_mat_qty integer DEFAULT 0 NOT NULL, linen_kitchen_towel_qty integer DEFAULT 0 NOT NULL,
  linen_guest_capacity integer DEFAULT 0 NOT NULL, linen_large_sheet_qty integer DEFAULT 0 NOT NULL,
  linen_large_duvet_cover_qty integer DEFAULT 0 NOT NULL, linen_small_sheet_qty integer DEFAULT 0 NOT NULL,
  linen_small_duvet_cover_qty integer DEFAULT 0 NOT NULL,
  ical_url text,
  UNIQUE (user_id, room_id)
);
ALTER TABLE user_rooms ADD CONSTRAINT fk_user_id            FOREIGN KEY (user_id) REFERENCES profiles(id)   ON DELETE CASCADE;
ALTER TABLE user_rooms ADD CONSTRAINT user_rooms_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

Deux FK sur la même colonne vers `profiles` et `auth.users` : l'insertion exige que le profil existe déjà (créé par le trigger `on_auth_user_created`). 7 politiques : lecture / mise à jour / suppression par le propriétaire (`auth.uid() = user_id`), tout pour `is_admin(auth.uid())`, insertion `auth.uid() = user_id OR is_admin(auth.uid())`. **Les codes de boîte à clés et Wi-Fi sont stockés en clair** et lisibles par le propriétaire et par tout admin.

### 8.3 `account_members` : acceptation d'invitation contrainte par RLS

```sql
CREATE POLICY "members_update_member_accept" ON account_members FOR UPDATE TO authenticated
  USING  ((SELECT email FROM profiles WHERE id = auth.uid()) = member_email AND status = 'pending')
  WITH CHECK (member_id = auth.uid() AND status = 'accepted' AND accepted_at IS NOT NULL);
```

Le membre invité ne peut passer la ligne **que** de `pending` à `accepted`, en s'inscrivant lui-même comme `member_id` et en horodatant `accepted_at`. Toute autre transition est rejetée par PostgREST avec une erreur RLS (`42501`). La fonction `is_member_of_master(_master_id)` (SQL, STABLE, SECURITY DEFINER, `search_path = ''`) est ensuite utilisée par les politiques d'autres tables pour l'espace partagé.

### 8.4 Hello Wallet : grand livre à écritures immuables

```sql
CREATE TABLE public.hello_wallet_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_cents bigint NOT NULL CHECK (amount_cents <> 0),   -- jamais d'ecriture nulle
  description text NOT NULL,
  event_key text NOT NULL UNIQUE,                            -- idempotence : 'referral:<id>:meeting', 'request:<id>', 'refund:<id>'
  referral_id uuid REFERENCES hello_wallet_referrals(id) ON DELETE SET NULL,
  request_id  uuid REFERENCES hello_wallet_requests(id)  ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);
GRANT SELECT ON hello_wallet_entries TO authenticated;      -- AUCUN INSERT/UPDATE/DELETE client
CREATE POLICY "wallet_entries_read" ON hello_wallet_entries FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR hello_wallet_is_admin());
```

Le solde n'est jamais stocké : il est **toujours** `sum(amount_cents)`. Les écritures ne sont produites que par des fonctions `SECURITY DEFINER` (section 9.2). C'est le sous-système le mieux verrouillé du projet et le modèle à reproduire.

### 8.5 `profiles` : les 64 colonnes réelles

```text
id uuid | first_name | last_name | role | google_sheet_id | google_sheet_tab | objective_amount numeric
cguv_accepted_at timestamptz | cguv_version | pennylane_customer_id | commission_rate numeric | phone_number
expenses_module_enabled | property_address | property_city | property_zip_code
iban_airbnb_booking | bic_airbnb_booking | sync_with_hellokeys | iban_abritel_hellokeys | bic_abritel_hellokeys
linen_type | agency | contract_start_date date
notify_new_booking_email | notify_cancellation_email | notify_new_booking_sms | notify_cancellation_sms
notify_booking_change_email | notify_booking_change_sms
is_banned | kyc_status | kyc_documents jsonb | can_manage_prices | email
onboarding_status onboarding_status_enum | estimation_details | estimated_revenue numeric
key_deposit_address | key_sets_needed integer | key_delivery_method | revyoos_holding_ids text[]
cguv_signed_document_url | last_seen_at timestamptz | referral_code | referral_credits integer
digital_booklet_enabled | krossbooking_property_id integer | stripe_account_id
is_payment_suspended | is_contract_terminated
conso_prm | conso_token | conso_price_per_kwh numeric | conso_service_enabled
thermobnb_enabled | consumables_enabled | lmnp_module_enabled
housing_registration_number | housing_registration_requested_at timestamptz
home_address | home_zip_code | home_city | property_address_confirmed_at timestamptz
```

`role` est un `text` libre (`user`, `admin`, `accountant`, `housekeeper`) sans contrainte CHECK ni enum : une faute de frappe crée un rôle fantôme sans aucun droit. **IBAN, BIC et jeton `conso_token` sont stockés en clair** dans cette table, lisible par le propriétaire via RLS et par tout admin.

```sql
CREATE TYPE public.onboarding_status_enum AS ENUM (
  'estimation_sent', 'estimation_validated', 'cguv_accepted',
  'keys_pending_reception', 'keys_retrieved', 'photoshoot_done', 'live');
```

---

## 9. Fonctions PL/pgSQL, triggers et automates

### 9.1 Fonctions d'autorisation

```sql
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE user_role text;
BEGIN
  -- Contourne RLS grâce à SECURITY DEFINER pour éviter la récursion
  SELECT role INTO user_role FROM public.profiles WHERE id = user_id;
  RETURN user_role = 'admin';
END; $$;
```

`is_admin` est référencée par des dizaines de politiques. Elle est `VOLATILE` (défaut) et **sans `SET search_path`**, contrairement aux fonctions plus récentes (`hello_wallet_*`, `get_user_auth_history`, `record_admin_page_visit`) qui fixent `search_path = ''`. Son coût est un `SELECT` par ligne évaluée par le planificateur (non marquée `STABLE`, donc non mise en cache dans la requête).

`hello_wallet_is_admin()` suit une logique différente : elle lit `hello_wallet_accounts.is_wallet_admin`, colonne synchronisée par le trigger `hello_wallet_admin_role_changed` sur `profiles`, **uniquement quand la modification est faite par `service_role`** :

```sql
IF NEW.role IS DISTINCT FROM 'admin' THEN
  UPDATE public.hello_wallet_accounts SET is_wallet_admin = false WHERE user_id = NEW.id;
ELSIF auth.role() = 'service_role' THEN
  INSERT INTO public.hello_wallet_accounts(user_id, is_wallet_admin) VALUES (NEW.id, true)
  ON CONFLICT (user_id) DO UPDATE SET is_wallet_admin = true;
END IF;
```

Un admin promu via PostgREST avec un JWT utilisateur (et non via une fonction Edge service_role) **n'obtient pas** les droits wallet. C'est voulu : cela empêche un admin de s'auto-promouvoir au wallet depuis le navigateur.

### 9.2 Transaction wallet : verrou pessimiste et idempotence

```sql
CREATE OR REPLACE FUNCTION public.hello_wallet_request(p_kind text, p_amount_cents bigint, p_details text, p_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE balance bigint;
BEGIN
  IF auth.uid() IS NULL OR EXISTS (SELECT 1 FROM public.profiles
       WHERE id = auth.uid() AND (is_banned OR is_contract_terminated)) THEN
    RAISE EXCEPTION 'Compte non autorisé';
  END IF;
  INSERT INTO public.hello_wallet_accounts(user_id) VALUES (auth.uid()) ON CONFLICT DO NOTHING;
  PERFORM 1 FROM public.hello_wallet_accounts WHERE user_id = auth.uid() FOR UPDATE;   -- serialise le compte
  IF EXISTS (SELECT 1 FROM public.hello_wallet_requests WHERE id = p_id AND user_id = auth.uid()) THEN
    RETURN p_id;                                                                        -- rejeu idempotent
  END IF;
  SELECT coalesce(sum(amount_cents), 0) INTO balance FROM public.hello_wallet_entries WHERE user_id = auth.uid();
  IF p_amount_cents IS NULL OR p_amount_cents <= 0 OR p_amount_cents > balance THEN
    RAISE EXCEPTION 'Montant invalide ou solde insuffisant';
  END IF;
  INSERT INTO public.hello_wallet_requests(id, user_id, kind, amount_cents, details)
    VALUES (p_id, auth.uid(), p_kind, p_amount_cents, btrim(p_details));
  INSERT INTO public.hello_wallet_entries(user_id, amount_cents, description, event_key, request_id)
    VALUES (auth.uid(), -p_amount_cents,
      CASE p_kind WHEN 'cleaning' THEN 'Montant réservé — ménage propriétaire' ELSE 'Montant réservé — prochaine facture' END,
      'request:' || p_id, p_id);
  RETURN p_id;
END $$;
```

Barème du parrainage (`hello_wallet_validate_referral`, admin wallet uniquement, étapes ordonnées `meeting` -> `mandate` -> `booking`) : **1 000 / 14 000 / 1 000 centimes**. Les anciens parrainages (`legacy_referral_id`) déjà crédités de 10 crédits dans `credit_transactions` ne sont pas re-crédités à l'étape `meeting`. `hello_wallet_review` impose une référence de 3 à 500 caractères et restitue automatiquement la part non imputée (`'refund:' || p_id`).

### 9.3 Trigger de notifications push via `pg_net`

```sql
CREATE OR REPLACE FUNCTION public.notify_push_on_notification() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE secret TEXT;
BEGIN
  SELECT value INTO secret FROM public.push_config WHERE key = 'trigger_secret';
  IF secret IS NULL THEN RETURN NEW; END IF;
  PERFORM net.http_post(
    url := 'https://dkjaejzwmmwwzhokpbgs.supabase.co/functions/v1/push-notifications',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', secret),
    body := jsonb_build_object('user_id', NEW.user_id, 'message', NEW.message, 'link', COALESCE(NEW.link, '/')));
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;      -- jamais bloquant pour l'INSERT
END $$;
CREATE TRIGGER on_notification_created_push AFTER INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION notify_push_on_notification();
```

Chaîne complète : `INSERT notifications` -> trigger -> `pg_net` (asynchrone, file `net.http_request_queue`) -> Edge `push-notifications` (vérifie `x-push-secret` contre `push_config`) -> Web Push vers `push_subscriptions` -> `public/push-sw.js` (`showNotification`, `notificationclick` -> `client.navigate(url)`).

### 9.4 Inventaire des 23 triggers

| Table | Trigger | Moment | Fonction |
|---|---|---|---|
| `auth.users` | `on_auth_user_created` | AFTER INSERT | `handle_new_user` (crée `profiles`, `referral_code = upper(substr(md5(random()), 0, 9))`, `onboarding_status = 'estimation_sent'`) |
| `notifications` | `on_notification_created_push` | AFTER INSERT | `notify_push_on_notification` |
| `housekeeping_notes` | `on_housekeeping_note_created` | AFTER INSERT | `notify_housekeeping_note_creation` (1 notification par propriétaire de la room) |
| `rehousing_notes` | `on_rehousing_note_created` | AFTER INSERT | `notify_rehousing_note_creation` (emails via `send-email`, **clé anon en littéral SQL**) |
| `messages` | `on_new_message_update_conversation_timestamp` | AFTER INSERT | `update_conversation_updated_at` |
| `profiles` | `hello_wallet_admin_role_changed` | AFTER INSERT/UPDATE | `hello_wallet_sync_admin` |
| `referrals` | `hello_wallet_referral_created` | AFTER INSERT | `hello_wallet_sync_referral` (pont ancien programme -> wallet) |
| `conso_caches` | `set_conso_cache_timestamp` | BEFORE UPDATE | `conso_cache_set_timestamp` |
| `hivernage_requests` | `set_hivernage_timestamp` | BEFORE UPDATE | `hivernage_set_timestamp` |
| 13 tables (`app_settings`, `consumable_billings`, `domain_requests`, `faqs`, `mini_sites`, `module_activation_requests`, `netatmo_thermostats`, `netatmo_tokens`, `newsletter_campaigns`, `review_replies`, `service_statuses`, `strategies`, `thermostat_scenarios`, `thermostat_schedules`) | `set_*_timestamp` | BEFORE UPDATE | `trigger_set_timestamp` (`NEW.updated_at = NOW()`) |

### 9.5 Fonctions d'audit et d'administration

`get_user_auth_history(p_user_id, p_page, p_filter)` lit **directement `auth.audit_log_entries`** (schéma interne de GoTrue) avec une CTE `MATERIALIZED`, exclut `token_refreshed` / `token_revoked`, pagine par 50, et refuse l'accès si l'appelant n'est pas à la fois `hello_wallet_is_admin()` **et** `profiles.role = 'admin'` non banni (`ERRCODE 42501`). Toute évolution du format JSON interne de GoTrue (`payload->'traits'->>'user_id'`, `payload->>'actor_id'`) casse cette fonction.

`record_admin_page_visit(page_path_input)` valide le chemin par expression régulière avant `UPSERT` dans `admin_page_usage` :

```sql
IF page_path_input IS NULL OR length(page_path_input) > 200
   OR page_path_input !~ '^/admin(/[a-zA-Z0-9_-]+)*([?]module=[a-zA-Z0-9_-]+)?$' THEN
  RAISE EXCEPTION 'Page admin invalide' USING ERRCODE = '22023';
END IF;
```

`get_public_service_reviews()` (SQL, SECURITY DEFINER, exposée sans authentification) normalise les notes KrossBooking (`rating * 2` si note sur 5, `NaN`/`Infinity` neutralisés via `rating::text`), ne retient que les avis de 8 à 10 et renvoie 12 extraits ; elle alimente la page publique de statut.

`update_invoice_source_status(p_invoice_id, p_source, p_status)` écrit dans `invoices.transfer_statuses` avec `jsonb_set(COALESCE(transfer_statuses, '{}'), ARRAY[p_source], to_jsonb(p_status), true)`. Elle n'est **pas** `SECURITY DEFINER` : la RLS de `invoices` s'applique (donc admin uniquement en pratique).

---

## 10. Fonctions Edge : conventions, inventaire, cas particuliers

### 10.1 Conventions observées (à respecter pour toute nouvelle fonction)

```ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // verify_jwt = false sur toutes les fonctions : l'identite DOIT etre verifiee ici.
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) return new Response(JSON.stringify({ error: "Unauthorized" }),
    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  // Client service_role : contourne la RLS, a n'utiliser qu'apres controle explicite du role.
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  console.log("[nom-de-la-fonction] message", { userId: user.id });   // prefixe obligatoire
  ...
});
```

Trois modes d'authentification coexistent : JWT utilisateur (`auth.getUser`), secret de cron (`cron_secret` dans le corps ou en-tête, comparé à `CRON_SECRETS[]`), secret applicatif dédié (`x-push-secret`, `ORDER_TICKET_API_TOKEN`, `PROPRIO_TICKETS_API_TOKEN`, `CRM_SUPPORT_API_TOKEN`) pour les intégrations entrantes.

### 10.2 Inventaire par domaine (79)

| Domaine | Fonctions |
|---|---|
| KrossBooking | `krossbooking-proxy`, `krossbooking-get-prices`, `krossbooking-ai-reply`, `scan-krossbooking-reviews`, `check-new-reservations`, `ical-proxy` |
| Emails entrants / sortants | `send-email`, `send-unauthenticated-email`, `send-auth-email`, `send-statement-email`, `send-bilan-2025-email`, `send-payment-reminder`, `resend-inbound-email`, `ingest-reservation-email-event`, `sync-resend-krossbooking-emails`, `freshdesk-reply-by-email` |
| Newsletter | `generate-newsletter`, `enqueue-newsletter`, `process-newsletter-queue`, `send-newsletter` |
| SMS / OTP | `send-sms-otp`, `verify-sms-otp`, `send-test-smsfactor-sms` |
| Stripe | `create-stripe-account`, `create-stripe-account-link`, `get-stripe-account`, `list-stripe-accounts`, `list-stripe-transfers`, `initiate-stripe-payout`, `reconcile-stripe-transfers`, `stripe-proxy` |
| Pennylane | `pennylane-proxy`, `client-payment-score`, `export-statements` |
| Comptes & admin | `create-user-proxy`, `update-user-proxy`, `update-user-email`, `update-user-password`, `delete-user-admin`, `get-all-users-admin`, `impersonate-user`, `recover-admin`, `crm-client-lookup`, `download-handover` |
| Espaces partagés / invitations | `get-invite-info`, `get-space-invite-info`, `join-shared-space`, `switch-to-master` |
| Énergie / IoT | `netatmo-auth`, `netatmo-config`, `netatmo-proxy`, `thermobnb-auto-planner`, `thermobnb-scheduler`, `temperature-alerts`, `conso-proxy`, `refresh-conso`, `ecowatt` |
| IA (OpenAI) | `analyze-error-log`, `comp-set-analyzer`, `correct-spelling`, `generate-announcement`, `generate-bilan-analysis`, `performance-summary`, `price-position-analyzer`, `review-analyzer`, `user-performance-analyzer`, `notify-price-recommendation` |
| Tickets / signalements | `proprio-ticket-create`, `proprio-ticket-detail`, `proprio-tickets-list`, `guest-logement-portal`, `report-problem-proxy`, `log-client-error`, `clear-error-logs` |
| Divers | `announcements-proxy`, `page-manager-proxy`, `push-notifications`, `pwa-unlock`, `revyoos-proxy`, `import-stats-from-sheet` |

### 10.3 `download-handover` : modèle d'autorisation « identité Auth, jamais le profil »

```ts
const { data: { user }, error } = await authClient.auth.getUser(match[1]);   // JWT extrait de "Bearer <token>"
if (error || !user) return errorResponse(401, "Session invalide ou expirée.");
if (user.id !== authorizedUserId
    || user.email?.toLowerCase() !== authorizedEmail
    || !user.email_confirmed_at) return errorResponse(403, "...");
// PDF genere a la demande par jsPDF (npm:jspdf@3.0.1) et mis en cache dans l'isolat
return new Response(cachedPdfs[kind]!.slice(0), { headers: {
  "Content-Type": "application/octet-stream",            // seul type converti en Blob par functions.invoke()
  "Content-Disposition": `attachment; filename="${definition.filename}"`,
  "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" } });
```

L'UUID et l'email autorisés sont codés en dur dans la fonction **et** dans le composant `HandoverPdfDownload.tsx` (qui ne fait que masquer le bouton ; la décision réelle est serveur). Le client vérifie la signature `%PDF-` des cinq premiers octets avant de déclencher le téléchargement.

### 10.4 `thermobnb-scheduler` : boucle d'exécution toutes les 30 secondes

```ts
const { data: schedules } = await admin.from("thermostat_schedules")
  .select("*").eq("status", "pending").lte("start_time", nowIso);
for (const sched of (schedules || [])) {
  const payload = sched.action === "heat"
    ? { endpoint: "setroomthermpoint", home_id, room_id, mode: "manual", temp, endtime: endSec }
    : { endpoint: "setroomthermpoint", home_id, room_id, mode: "home" };
  const upstream = await fetch(NETATMO_PROXY_URL, { method: "POST", body: JSON.stringify(payload), ... });
  if (!upstream.ok) {
    await admin.from("thermostat_schedules").update({ status: "failed",
      error: `Upstream ${upstream.status}: ${text.slice(0, 300)}` }).eq("id", sched.id);
    continue;
  }
  await admin.from("thermostat_schedules").update({ status: "applied", updated_at: nowIso }).eq("id", sched.id);
}
```

Aucun verrou `FOR UPDATE SKIP LOCKED` : deux exécutions concurrentes (cron à 30 s + appel manuel) peuvent appliquer deux fois la même consigne de chauffage.

### 10.5 `_shared/payment-score.ts` : règles d'exclusion du score de paiement

```ts
export function makeScoreRow(invoice: ScoreInvoice, paymentDate: string | null, today: string): ScoreRow | null {
  if (invoice.draft || ['draft','cancelled','credit_note','proforma','shipping_order','purchasing_order',
      'estimate_pending','estimate_accepted','estimate_invoiced','estimate_denied'].includes(invoice.status)
      || !Number.isFinite(Number(invoice.amount)) || Number(invoice.amount) <= 0) return null;
  if (!deadline) return { ...row, reason: 'Échéance absente ou invalide' };
  // Les anciens impayés restent visibles pour ne pas améliorer artificiellement le score.
  if (deadline > today || (invoice.paid && deadline < scorePeriodStart(today))) return null;
  ...
}
export function scorePeriodStart(today: string): string {   // fenetre glissante de 12 mois, calculee en UTC
  const [year, month, day] = today.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year - 1, month, 0)).getUTCDate();
  return `${year - 1}-${String(month).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
}
```

Le score (A à E) est ensuite persisté dans `client_payment_scores` par `client-payment-score`, à partir des factures Pennylane du client (`PENNYLANE_API_KEY*` selon l'agence : `_BERCK`, `_BAIE`).

---

## 11. Planification pg_cron et stockage

### 11.1 Jobs `cron.job`

| Job | Planification | Cible Edge | Actif |
|---|---|---|---|
| `ThermoBnB Scheduler` | `30 seconds` | `thermobnb-scheduler` | oui |
| `PLANNER` | `30 seconds` | `thermobnb-auto-planner` | oui |
| `process_newsletter_queue_every_minute` | `* * * * *` | `process-newsletter-queue` (timeout 30 s) | oui |
| `sync_resend_krossbooking_emails_every_minute` | `* * * * *` | `sync-resend-krossbooking-emails` (`limit: 20`) | oui |
| `scan-krossbooking-reviews-daily` | `0 3 * * *` | `scan-krossbooking-reviews` | oui |
| `LINNKY` | `0 0 * * *` | `refresh-conso` | oui |
| `check_new_reservations` | `*/5 * * * *` | `check-new-reservations` | **non** (désactivé ; les nouvelles réservations arrivent désormais par email entrant Resend -> `ingest-reservation-email-event`) |

Mécanique : `select net.http_post(url := '.../functions/v1/<fn>', headers := jsonb_build_object('Authorization', 'Bearer <clé>'), body := jsonb_build_object('cron_secret', '<secret>'), timeout_milliseconds := 1000)`. Le `timeout` de 1 000 ms concerne uniquement l'émission : la fonction continue de s'exécuter côté Edge. **Deux jobs à 30 secondes = 5 760 invocations Edge par jour** avant même tout trafic utilisateur. Les secrets de cron sont stockés **en clair dans `cron.job.command`** (lisible par tout rôle ayant accès au schéma `cron`).

### 11.2 Buckets Storage

| Bucket | Public | Limite | Types MIME | Usage |
|---|---|---|---|---|
| `statements` | **oui** | — | — | PDF des relevés mensuels (URL devinable = lisible) |
| `guest_report_media` | oui | 10 Mio | png, jpeg, jpg, webp, heic, heif | photos des signalements voyageurs |
| `mini-site-media` | oui | 5 Mio | jpeg, png, webp, svg+xml | médias des mini-sites (**SVG public = vecteur XSS potentiel**) |
| `kyc-documents` | non | — | — | pièces d'identité |
| `secure_documents` | non | — | — | coffre-fort client |
| `technical_reports_media` | non | — | — | photos des rapports techniques |

---

## 12. PWA, push, verrouillage d'appareil

### 12.1 Service worker

Le SW généré par Workbox (`registerType: 'prompt'`) importe `public/push-sw.js` :

```js
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (e) { data = { body: event.data ? event.data.text() : "" }; }
  event.waitUntil(self.registration.showNotification(data.title || "Hello Keys", {
    body: data.body || "", icon: "/icons/pwa-icon.png", badge: "/icons/pwa-icon.png",
    data: { url: data.url || "/" } }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
    for (const client of windowClients) if ("focus" in client) { client.navigate(url); return client.focus(); }
    return clients.openWindow(url);
  }));
});
```

La détection de nouvelle version repose sur `public/version.json` (incrémenté par le workflow GitHub) et le hook `src/hooks/use-version.ts`.

### 12.2 Verrouillage PIN : limitation de tentatives côté base

```sql
CREATE OR REPLACE FUNCTION public.reserve_pwa_unlock_attempt(device_id uuid, owner_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE device public.pwa_device_locks%ROWTYPE;
BEGIN
  SELECT * INTO device FROM public.pwa_device_locks WHERE id = device_id AND user_id = owner_id FOR UPDATE;
  IF NOT FOUND OR device.total_attempts >= 10 OR device.locked_until > now() THEN RETURN false; END IF;
  IF device.locked_until IS NOT NULL THEN device.attempts := 0; END IF;
  UPDATE public.pwa_device_locks
     SET attempts = device.attempts + 1, total_attempts = device.total_attempts + 1,
         locked_until = CASE WHEN device.attempts + 1 >= 5 THEN now() + interval '5 minutes' ELSE NULL END
   WHERE id = device_id AND user_id = owner_id;
  RETURN true;
END $$;
```

Politique : 5 échecs consécutifs = verrou de 5 minutes ; **10 échecs cumulés = appareil définitivement bloqué** (`total_attempts` n'est jamais remis à zéro par cette fonction). La vérification du PIN elle-même est faite par la fonction Edge `pwa-unlock`, qui appelle cette RPC **avant** de comparer le code, afin que l'attaquant paie la tentative même en cas d'erreur.

---

## 13. Moteur LMNP

`src/lib/lmnp-engine.ts` est un moteur pur (sans effet de bord) :

```ts
export function computeLmnpYear(
  year: number, statements: SavedInvoice[], expenses: Expense[],
  assets: LmnpFixedAsset[], settings: LmnpSettings | null,
): LmnpComputation

export interface LmnpComputation {
  year: number;
  grossRevenue: number; hkFees: number; revenueDetails: RevenueDetail[];
  expenseGroups: { label: string; amount: number }[]; totalExpenses: number;
  amortizationRows: AmortizationRow[]; totalTheoreticalAmortization: number;
  deductibleAmortization: number; deferredUsed: number; newDeferredCarry: number;
  resultBeforeAmortization: number; taxResult: number; deficitsUsed: number;
  finalTaxResult: number; remainingDeficits: number;
  warnings: string[]; forms: LiasseForm[];
}
```

Dérivation des recettes à partir des relevés (couplage direct avec le `jsonb totals` de `invoices`) :

```ts
const hkFees = Number(totals.totalFacture ?? 0) || 0;
let gross = Number(totals.totalRevenuGenere ?? 0) || 0;
if (!gross) gross = (Number(totals.totalMontantVerse ?? 0) || 0) + hkFees;   // releves anciens
```

Les clés `totalFacture`, `totalRevenuGenere`, `totalMontantVerse` ne sont définies nulle part par un type partagé : elles sont produites par le contexte de génération et consommées ici par convention de nommage. Les arrondis utilisent `round2 = Math.round(n * 100) / 100` (arrondi bancaire non géré, erreurs de flottant possibles sur les grands totaux).

---

## 14. Matrice de sécurité et surface d'attaque

| Couche | Mécanisme | Constat |
|---|---|---|
| Transport | HTTPS Vercel / Supabase | OK |
| Authentification | GoTrue (email + mot de passe, lien magique, OTP SMS via Twilio Verify / SMSFactor) | OK ; mot de passe minimum 6 caractères |
| Autorisation données | RLS, 242 politiques, `is_admin()` SECURITY DEFINER | Grants `ALL` à `anon` sur de nombreuses tables ; plusieurs politiques `TO PUBLIC` au lieu de `TO authenticated` |
| Autorisation Edge | `auth.getUser()` manuel, `verify_jwt = false` | À vérifier fonction par fonction : toute fonction oubliant le contrôle est ouverte au monde |
| Secrets | 45 secrets Edge ; clé anon en dur côté client (normal) | Clé anon aussi en littéral dans une fonction PL/pgSQL ; secrets cron en clair dans `cron.job` ; trois noms de secrets contiennent des sauts de ligne (`APP_BASE_URL\n\n`, `PENNYLANE_API_KEY\n\n`, `PENNYLANE_API_KEYV1\n\n`) : `Deno.env.get("APP_BASE_URL")` peut renvoyer `undefined` (à confirmer) |
| Données sensibles | IBAN/BIC, codes boîte à clés, Wi-Fi, `conso_token` en clair | Aucune colonne chiffrée ; lisibles par tout admin via PostgREST |
| Stockage | 3 buckets publics dont `statements` | Un PDF de relevé est accessible à quiconque connaît son chemin |
| Front | `strict: false`, 0 test, 45 erreurs TS | Aucune barrière de non-régression automatisée |
| Supply chain | 95 dépendances, `xlsx@0.18.5` (parsing de fichiers fournis par un admin) | Vulnérabilités connues sur `xlsx` < 0.20 (prototype pollution, ReDoS) : à auditer |

---

## 15. Invariants à ne jamais casser

1. `profiles.id = auth.users.id` : le profil est créé par `handle_new_user` ; ne jamais insérer un profil manuellement sans utilisateur Auth.
2. `commission_rate` est une **fraction** (0.20), jamais un pourcentage (20). Le libellé « Forfait (%) » de l'interface convertit.
3. `invoices.totals` doit contenir `totalFacture`, `totalRevenuGenere`, `totalMontantVerse` : le moteur LMNP, les statistiques admin et le classement des logements en dépendent.
4. `KrossbookingReservation.amount` est une chaîne `"<nombre>€"` ; le moteur de relevés la re-parse.
5. Les séjours propriétaire (`PROPRI`, `PROP0`) sont inclus dans le relevé **sans** commission ; une réservation `CANC` n'apparaît jamais.
6. La taxe de séjour est forcée à 0 pour Airbnb et Booking (collectée par la plateforme).
7. `hello_wallet_entries` n'est écrite **que** par des fonctions SECURITY DEFINER ; `event_key` est unique ; le solde est une somme, jamais une colonne.
8. `krossbooking_token_cache` ne contient qu'une ligne (`id = 1`) ; la supprimer force une ré-authentification propre.
9. `CURRENT_CGUV_VERSION` (`src/lib/constants.ts`) : l'incrémenter redemande l'acceptation à **tous** les utilisateurs à leur prochaine connexion.
10. Toute fonction Edge appelée par `supabase.functions.invoke()` qui renvoie un binaire doit répondre `application/octet-stream`, sinon le client reçoit une chaîne corrompue.
11. `account_members` : seule la transition `pending -> accepted` par l'invité est autorisée par RLS ; ne pas « corriger » la politique sans comprendre l'espace partagé.
12. `SessionContextProvider` doit rester **sous** `BrowserRouter` et **au-dessus** de `Routes`.

---

## 16. Dette technique et points de rupture classés

| Rang | Point | Impact | Effort |
|---|---|---|---|
| 1 | Absence totale de tests ; `strict: false` ; 45 erreurs TS tolérées | Toute refonte est à l'aveugle | Élevé |
| 2 | Aucun type généré depuis le schéma ; 326 `.from()` non typés | Renommer une colonne casse l'app sans erreur de compilation | Moyen (`supabase gen types` + migration progressive) |
| 3 | `admin-api.ts` 1 818 lignes / 55 exports ; pages de 1 000 à 1 600 lignes | Couplage, conflits de merge, régressions | Moyen |
| 4 | 160 routes importées statiquement, 0 `React.lazy` | Bundle initial > 2 Mio, démarrage lent sur mobile | Faible (code splitting par route) |
| 5 | Indices de colonnes Excel codés en dur (`row[38]`, `row[39]`) | Un export KrossBooking modifié fausse les relevés | Faible (détection par en-tête) |
| 6 | Pas d'unicité `(user_id, period)` sur `invoices` | Doublons de relevés / factures | Faible (index unique + nettoyage) |
| 7 | Grants `ALL` à `anon`, politiques `TO PUBLIC`, bucket `statements` public | Surface d'exposition inutile | Faible à moyen |
| 8 | Clé anon et secrets dans du SQL (`notify_rehousing_note_creation`, `cron.job`) | Rotation des clés impossible sans migration | Faible |
| 9 | 2 jobs cron à 30 s sans verrou `SKIP LOCKED` | Double application de consignes de chauffage, coût d'invocation | Faible |
| 10 | Jeton KrossBooking partagé par isolat sans verrou | Tempête de ré-authentification sous charge | Faible |
| 11 | Orchestration relevé -> PDF -> Pennylane -> email côté client, sans transaction | États incohérents en cas d'échec partiel | Élevé (déplacer dans une fonction Edge idempotente) |
| 12 | `capacitor.config.ts` avec `appId` générique | Publication store impossible en l'état | Trivial |
| 13 | `heartbeat` 60 s par onglet ouvert | 1 440 écritures / jour / utilisateur | Trivial (passer à 5 min ou `visibilitychange`) |

---

## 17. Runbook d'intervention au niveau code

### 17.1 Ajouter une table exposée au client (gabarit conforme au projet)

```sql
CREATE TABLE public.ma_table (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ma_table_user_id_idx ON public.ma_table (user_id);
CREATE TRIGGER set_ma_table_timestamp BEFORE UPDATE ON public.ma_table
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ma_table TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ma_table TO service_role;
-- PAS de grant a anon sauf besoin public explicite

ALTER TABLE public.ma_table ENABLE ROW LEVEL SECURITY;
CREATE POLICY ma_table_select ON public.ma_table FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY ma_table_insert ON public.ma_table FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY ma_table_update ON public.ma_table FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY ma_table_delete ON public.ma_table FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
```

Puis : interface TypeScript dans `src/lib/<domaine>-api.ts`, fonctions `get*/upsert*/delete*` renvoyant des erreurs françaises (`throw new Error("Erreur lors de ...")`), consommation via TanStack Query ou `useEffect` selon la page.

### 17.2 Ajouter une route

1. Créer `src/pages/MaPage.tsx` (export default).
2. Importer dans `src/App.tsx` et déclarer `<Route path="/ma-page" element={<MaPage />} />` dans le bloc `<Routes>` situé sous `GlobalAppErrorBoundary`.
3. Si la page est publique, ajouter son préfixe à `publicPaths` dans `SessionContextProvider.tsx`, sinon l'utilisateur non connecté sera redirigé vers `/login`.
4. Ajouter l'entrée de menu (`Sidebar`, `AdminLayout` ou barre V4) ; pour l'admin, le chemin doit satisfaire la regex de `record_admin_page_visit`.

### 17.3 Déboguer KrossBooking

```sql
-- 1. Forcer un nouveau jeton (le prochain appel re-authentifie)
DELETE FROM public.krossbooking_token_cache WHERE id = 1;
-- 2. Verifier l'identifiant d'etablissement du client
SELECT id, email, krossbooking_property_id, agency FROM public.profiles WHERE email = '<email>';
-- 3. Verifier les rooms rattachees
SELECT room_id, room_name, room_id_2 FROM public.user_rooms WHERE user_id = '<uuid>';
```

Journaux : filtrer les logs Edge sur `[krossbooking-proxy]`. Un message `IP ... not allowed` signifie que l'egress ne passe plus par `KROSSBOOKING_UPSTREAM_PROXY_URL` (secret manquant ou proxy en panne).

### 17.4 Régénérer ou modifier les PDF de passation

Les quatre documents sont embarqués dans `supabase/functions/download-handover/{document,guide,reference,finance}.ts` sous forme de tableaux `{ title, markdown }`. Le rendu (`buildPdf`) interprète : titres `#`/`##` (14 pt) et `###` (11 pt), tableaux (8 pt, pipes externes retirés), blocs ``` (Courier 8 pt) ; les caractères hors Latin-1 sont supprimés (`→`, `—`, `…`, `€` sont convertis au préalable). Le PDF est mis en cache **dans l'isolat** (`cachedPdfs`) : un redéploiement de la fonction suffit à invalider le cache.

### 17.5 Rotation d'un secret

1. Supabase -> Edge Functions -> Secrets : remplacer la valeur (les fonctions voient la nouvelle valeur au prochain démarrage d'isolat).
2. Pour les secrets de cron : mettre à jour **aussi** `cron.job.command` (`SELECT cron.alter_job(jobid, command := ...)`) et la liste `CRON_SECRETS` des fonctions concernées.
3. Pour la clé anon : la régénération impose de republier le front **et** de réécrire `notify_rehousing_note_creation` (littéral SQL).

---

## 18. Index des identifiants techniques

| Identifiant | Localisation | Rôle |
|---|---|---|
| `dkjaejzwmmwwzhokpbgs` | URLs Supabase | référence du projet |
| `SUPABASE_PUBLISHABLE_KEY` | `src/integrations/supabase/client.ts` | clé anon (publique) |
| `CURRENT_CGUV_VERSION` | `src/lib/constants.ts` | version des CGUV exigée |
| `KROSSBOOKING_PROXY_URL` | `src/lib/krossbooking.ts` | URL codée en dur du proxy |
| `RESERVATION_CACHE_DURATION` / `HOUSEKEEPING_CACHE_DURATION` / `ROOM_TYPE_CACHE_DURATION` | `src/lib/krossbooking.ts` | 2 min / 5 min / 30 min |
| `FRENCH_MONTHS`, `parseFrenchPeriodToRange` | `InvoiceGenerationContext.tsx` | interprétation de la période |
| `ProcessedReservation` | `InvoiceGenerationContext.tsx` | ligne de relevé |
| `inMemoryAuthToken`, `krossbooking_token_cache` | `krossbooking-proxy/index.ts` | jeton partagé |
| `CRON_SECRETS` | fonctions Edge planifiées | secrets acceptés |
| `is_admin(uuid)`, `is_housekeeper(uuid)`, `is_member_of_master(uuid)`, `hello_wallet_is_admin()` | PostgreSQL | prédicats RLS |
| `onboarding_status_enum` | PostgreSQL | 7 états d'onboarding |
| `push_config.trigger_secret` | PostgreSQL | secret du trigger push |
| `pwa_device_locks` | PostgreSQL | tentatives PIN |
| `cachedPdfs` | `download-handover/index.ts` | cache PDF par isolat |
| `extractPwaIconFromFavicon` | `vite.config.ts` | icône PWA dérivée du favicon |
| `version.json` + `use-version.ts` | `public/`, `src/hooks/` | détection de mise à jour |

> Fin du document. Toute modification du code doit être reportée ici lorsqu'elle touche une formule, une politique RLS, une fonction SECURITY DEFINER, un job cron ou un invariant de la section 15.
