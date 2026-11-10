# Annexe — inventaire technique du dépôt

Cet inventaire est extrait du code inspecté pour la passation. Il ne prouve pas que chaque fonction est déployée ou utilisée en production. Les noms de variables sont fournis, jamais leurs valeurs. Les accès détectés par expressions régulières ne constituent pas une analyse exhaustive des accès dynamiques.

## Routes déclarées dans src/App.tsx

Les routes ne sont pas des garanties d’autorisation : consulter le fournisseur de session, les layouts et les contrôles serveur.

| Chemin | Composant |
|---|---|
| `/embed/avis` | `ReviewsEmbedPage` |
| `/preview/digicode` | `PinPreview` |
| `/halloween` | `Index` |
| `/login` | `Login` |
| `/login-v2` | `LoginV2` |
| `/v4/login` | `LoginV4` |
| `/onboarding-status` | `OnboardingStatusPage` |
| `/estimation` | `EstimationPage` |
| `/wallet` | `WalletPage` |
| `/admin` | `AdminDashboardPage` |
| `/admin/wallet` | `AdminWalletPage` |
| `/admin/pages` | `PageCreator` |
| `/admin/announcements` | `AdminAnnouncementsPage` |
| `/admin/invoice-generation` | `AdminInvoiceGenerationPage` |
| `/admin/commission-explained` | `AdminCommissionExplanationPage` |
| `/admin/create-pennylane-invoice` | `AdminCreatePennylaneInvoicePage` |
| `/admin/statements` | `AdminStatementsPage` |
| `/admin/leaderboard` | `AdminLeaderboardPage` |
| `/admin/agency-comparison` | `AdminAgencyComparisonPage` |
| `/admin/transfer-summary` | `AdminTransferSummaryPage` |
| `/admin/users` | `AdminUsersPage` |
| `/admin/housing-registrations` | `AdminHousingRegistrationsPage` |
| `/admin/delegated-access` | `AdminDelegatedAccessPage` |
| `/admin/settings` | `AdminSettingsPage` |
| `/admin/strategies` | `AdminStrategiesPage` |
| `/admin/module-requests` | `AdminModuleRequestsPage` |
| `/admin/season-requests` | `AdminSeasonRequestsPage` |
| `/admin/technical-reports` | `AdminTechnicalReportsPage` |
| `/admin/technical-reports/new` | `AdminTechnicalReportFormPage` |
| `/admin/technical-reports/:id/edit` | `AdminTechnicalReportFormPage` |
| `/admin/technical-reports/:id` | `TechnicalReportDetailPage` |
| `/admin/reservation-reports/:id` | `ReservationReportDetailPage` |
| `/admin/user-rooms` | `AdminUserRoomsPage` |
| `/admin/ical-config` | `AdminIcalConfigPage` |
| `/admin/laundry` | `LaundryOrdersPage` |
| `/admin/faq` | `AdminFaqPage` |
| `/admin/notifications` | `AdminNotificationsPage` |
| `/admin/changelog` | `AdminChangelogPage` |
| `/admin/ideas` | `AdminIdeasPage` |
| `/admin/documents` | `AdminDocumentsPage` |
| `/admin/newsletter` | `AdminNewsletterPage` |
| `/prospect-signup` | `ProspectSignupPage` |
| `/admin/marketplace` | `AdminMarketplacePage` |
| `/admin/stripe-transactions` | `AdminStripeTransactionsPage` |
| `/admin/stripe-match` | `AdminStripeMatchPage` |
| `/admin/hello-keys-stats` | `AdminHelloKeysStatsPage` |
| `/admin/kross-stats` | `AdminKrossStatsPage` |
| `/admin/stripe-transfers` | `AdminStripeTransfersPage` |
| `/admin/stripe-duplicates` | `AdminStripeDuplicatesPage` |
| `/admin/rehousing-note` | `AdminRehousingNotePage` |
| `/admin/manual-stats` | `AdminManualStatsPage` |
| `/admin/billing-status` | `AdminBillingStatusPage` |
| `/admin/consumables` | `AdminConsumablesPage` |
| `/admin/key-board` | `AdminKeyBoardPage` |
| `/admin/client-performance` | `AdminClientPerformancePage` |
| `/admin/utility-cuts` | `AdminUtilityCutsPage` |
| `/admin/revyoos-missing` | `AdminRevyoosMissingPage` |
| `/admin/pennylane-missing` | `AdminPennylaneMissingPage` |
| `/admin/crm` | `AdminCRMPage` |
| `/admin/temperature` | `AdminTemperaturePage` |
| `/admin/error-logs` | `AdminErrorLogsPage` |
| `/admin/smart-replies` | `SmartRepliesPage` |
| `/admin/hivernage-requests` | `AdminHivernageRequestsPage` |
| `/admin/hivernage-email` | `AdminHivernageEmailPage` |
| `/admin/status` | `AdminStatusPage` |
| `/admin/mini-sites` | `AdminMiniSitesPage` |
| `/admin/domain-requests` | `AdminDomainRequestsPage` |
| `/status` | `StatusPage` |
| `/housekeeping-reports` | `HousekeepingReportsPage` |
| `/housekeeping` | `HousekeepingTasksPage` |
| `/pages/:slug` | `ContentPage` |
| `/sites/:slug` | `MiniSitePublicPage` |
| `/logement/:roomId/signaler` | `GuestReportPage` |
| `/signalement/:reportId` | `GuestReportStatusPage` |
| `/suivi` | `GuestTrackLookupPage` |
| `/installer` | `InstallAppPage` |
| `/profile` | `ProfilePage` |
| `/announcements` | `AnnouncementsPage` |
| `/announcements/:id` | `AnnouncementDetailPage` |
| `/actualites/tarification-meteo` | `WeatherPricingNewsPage` |
| `/new-owner-site` | `NewOwnerSitePage` |
| `/promotion` | `PromotionPage` |
| `/new-version` | `NewVersionPage` |
| `/redeem-invite` | `RedeemInvitePage` |
| `/rejoindre-espace` | `JoinSharedSpacePage` |
| `/espaces` | `SpaceSelectionPage` |
| `/season-2026` | `Season2026Page` |
| `/season-2026/prices` | `MySeasonPricesPage` |
| `/hivernage-2026` | `Hivernage2026Page` |
| `/hivernage-2027` | `Hivernage2026Page` |
| `/powersense` | `PowerSenseLandingFull` |
| `/marvel-2026` | `Marvel2026Landing` |
| `/thermo-sync` | `ThermoSyncPage` |
| `/go-baie-de-somme` | `GoBaieDeSommePage` |
| `/thermobnb` | `ThermoBnBLandingPage` |
| `/thermobnb-access` | `ThermoBnBAccessPage` |
| `/admin/recovery` | `AdminRecoveryPage` |
| `/integrations/netatmo` | `NetatmoConnectPage` |
| `/integrations/netatmo/callback` | `NetatmoCallbackPage` |
| `/integrations/netatmo/dashboard` | `NetatmoDashboardPage` |
| `/integrations/netatmo/stations` | `NetatmoStationsPage` |
| `/integrations/netatmo/override` | `NetatmoTokenOverridePage` |
| `/maintenance/connectivite` | `ConnectivityMaintenancePage` |
| `/` | `DashboardPageV3` |
| `/home-classic` | `DashboardPage` |
| `/home-v2` | `DashboardPageV2` |
| `/home-v3` | `DashboardPageV3` |
| `/v4` | `HomeV4` |
| `/v4/calendrier` | `CalendarV4` |
| `/v4/reservations` | `BookingsV4` |
| `/v4/reservations/:id` | `BookingDetailV4` |
| `/v4/finances` | `FinancesV4` |
| `/v4/finances/mois/:period` | `FinanceMonthV4` |
| `/v4/plus` | `MoreV4` |
| `/v4/plus/parrainage` | `ReferralV4` |
| `/v4/avis` | `ReviewsV4` |
| `/v4/contact` | `ContactV4` |
| `/v4/notifications` | `NotificationsV4` |
| `/v4/messages` | `MessagesV4` |
| `/v4/messages/:id` | `MessageDetailV4` |
| `/v4/aide` | `HelpV4` |
| `/v4/logements` | `RoomsV4` |
| `/v4/parametres` | `SettingsV4` |
| `/v4/menages` | `MenageV4` |
| `/v4/idees` | `IdeasV4` |
| `/v4/chat` | `ChatV4` |
| `/calendar` | `CalendarPage` |
| `/planning-v3` | `PlanningV3Page` |
| `/planning-v2` | `PlanningV2Page` |
| `/calendar-mobile` | `CalendarPageMobile` |
| `/bookings` | `BookingsPage` |
| `/prevision-ca` | `RevenueForecastPage` |
| `/performance` | `PerformancePage` |
| `/reviews` | `ReviewsPage` |
| `/finances` | `FinancePage` |
| `/lmnp` | `LmnpPage` |
| `/tourist-tax` | `TouristTaxPage` |
| `/numero-enregistrement` | `HousingRegistrationPage` |
| `/reports` | `TechnicalReportsPage` |
| `/reports/:id` | `TechnicalReportDetailPage` |
| `/help` | `HelpPage` |
| `/modules` | `ModulesPage` |
| `/roadmap` | `RoadmapPage` |
| `/my-rooms` | `MyRoomsPage` |
| `/faq` | `FaqPage` |
| `/mini-site` | `MiniSitePage` |
| `/comp-set` | `CompSetPage` |
| `/tickets` | `TicketsPage` |
| `/tickets/:id` | `TicketDetailPage` |
| `/marketplace` | `MarketplacePage` |
| `/admin-v2` | `AdminV2Dashboard` |
| `/admin-v2/users` | `AdminV2Users` |
| `/messages` | `MessagesPage` |
| `/smart-replies` | `SmartRepliesPage` |
| `/smart-pricing` | `SmartPricingPage` |
| `/electricity-start` | `ElectricityServiceLanding` |
| `/electricity` | `ElectricityConsumptionPage` |
| `/notifications` | `NotificationsPage` |
| `/admin/missing-2025-stats` | `AdminMissing2025StatsPage` |
| `*` | `NotFound` |

## Fonctions Edge présentes dans le dépôt

Chaque nom correspond à `supabase/functions/<nom>/index.ts`.

| Fonction | Variables d’environnement référencées | Tables / buckets référencés littéralement par .from() |
|---|---|---|
| `analyze-error-log` | `OPENAI_API_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `profiles` |
| `announcements-proxy` | `SUPABASE_ANON_KEY`, `SUPABASE_URL` | `announcement_likes`, `announcement_reads`, `announcements`, `profiles` |
| `check-new-reservations` | `CRONSECRETNOTIFYNEWRESA`, `CRON_SECRET`, `CRON_SECRET_2`, `CRON_SECRET_NOTIFY_NEW_RESA`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `notifications`, `processed_reservations`, `profiles` |
| `clear-error-logs` | `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `error_logs`, `profiles` |
| `client-payment-score` | `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `client_payment_scores`, `profiles` |
| `comp-set-analyzer` | `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `profiles`, `user_rooms` |
| `conso-proxy` | Aucune référence littérale détectée | Aucune référence littérale détectée |
| `correct-spelling` | `OPENAI_API_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_URL` | Aucune référence littérale détectée |
| `create-stripe-account-link` | `STRIPE_SECRET_KEY` | Aucune référence littérale détectée |
| `create-stripe-account` | `STRIPE_SECRET_KEY` | Aucune référence littérale détectée |
| `create-user-proxy` | `APP_BASE_URL`, `RESEND_API_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `profiles`, `referrals` |
| `crm-client-lookup` | `CRM_SUPPORT_API_TOKEN`, `PENNYLANE_API_KEYV1`, `PENNYLANE_API_KEYV1_BERCK`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `invoices`, `profiles` |
| `delete-user-admin` | `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `profiles`, `statements` |
| `ecowatt` | `RTE_CLIENT_ID`, `RTE_CLIENT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `app_settings` |
| `enqueue-newsletter` | `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `newsletter_campaigns`, `newsletter_deliveries`, `newsletter_queue`, `profiles` |
| `export-statements` | `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `accountant_client_relations`, `delegated_invoice_viewers`, `invoices`, `profiles` |
| `freshdesk-reply-by-email` | `FRESHDESK_SUPPORT_EMAIL`, `RESEND_API_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_URL` | Aucune référence littérale détectée |
| `generate-announcement` | `OPENAI_API_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_URL` | `profiles` |
| `generate-bilan-analysis` | `OPENAI_API_KEY` | Aucune référence littérale détectée |
| `generate-newsletter` | `OPENAI_API_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_URL` | `profiles` |
| `get-all-users-admin` | `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `profiles` |
| `get-invite-info` | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `delegated_invoice_viewers` |
| `get-space-invite-info` | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `account_members`, `profiles` |
| `get-stripe-account` | `STRIPE_SECRET_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_URL` | `profiles` |
| `guest-logement-portal` | `PROPRIO_TICKETS_API_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `notifications`, `profiles`, `technical_report_updates`, `technical_reports`, `user_rooms` |
| `ical-proxy` | `SUPABASE_ANON_KEY`, `SUPABASE_URL` | `user_rooms` |
| `impersonate-user` | `APP_BASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `profiles` |
| `import-stats-from-sheet` | `GOOGLE_PRIVATE_KEY`, `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Aucune référence littérale détectée |
| `ingest-reservation-email-event` | `APP_BASE_URL`, `CRON_SECRET`, `CRON_SECRET_NOTIFY_NEW_RESA`, `RESEND_API_KEY`, `RESERVATION_EMAIL_INGEST_SECRET`, `SMSFACTOR_API_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `notifications`, `profiles`, `reservation_email_events`, `user_rooms` |
| `initiate-stripe-payout` | `STRIPE_SECRET_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `invoices`, `notifications`, `profiles` |
| `join-shared-space` | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `account_members`, `profiles` |
| `krossbooking-ai-reply` | `OPENAI_API_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_URL` | Aucune référence littérale détectée |
| `krossbooking-proxy` | `CRONSECRETNOTIFYNEWRESA`, `CRON_SECRET`, `CRON_SECRET_2`, `CRON_SECRET_NOTIFY_NEW_RESA`, `KROSSBOOKING_API_KEY`, `KROSSBOOKING_HOTEL_ID`, `KROSSBOOKING_PASSWORD`, `KROSSBOOKING_UPSTREAM_PROXY_URL`, `KROSSBOOKING_USERNAME`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `krossbooking_token_cache`, `profiles`, `user_rooms` |
| `list-stripe-accounts` | `STRIPE_SECRET_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_URL` | `profiles` |
| `list-stripe-transfers` | `STRIPE_SECRET_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_URL` | `profiles` |
| `log-client-error` | `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `error_logs` |
| `netatmo-auth` | `NETATMO_CLIENT_ID`, `NETATMO_CLIENT_SECRET`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `netatmo_tokens` |
| `netatmo-config` | `NETATMO_CLIENT_ID`, `SUPABASE_ANON_KEY`, `SUPABASE_URL` | Aucune référence littérale détectée |
| `netatmo-proxy` | `CRON_SECRET`, `NETATMO_CLIENT_ID`, `NETATMO_CLIENT_SECRET`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `netatmo_logs`, `netatmo_tokens` |
| `notify-price-recommendation` | `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `notifications` |
| `page-manager-proxy` | `SUPABASE_ANON_KEY`, `SUPABASE_URL` | `pages`, `profiles` |
| `pennylane-proxy` | `PENNYLANE_API_KEYV1`, `PENNYLANE_API_KEYV1_BERCK`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `profiles` |
| `performance-summary` | `OPENAI_API_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_URL` | Aucune référence littérale détectée |
| `price-position-analyzer` | `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `price_overrides`, `user_rooms` |
| `process-newsletter-queue` | `CRON_SECRET`, `CRON_SECRET_2`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `newsletter_campaigns`, `newsletter_deliveries`, `newsletter_queue` |
| `proprio-ticket-create` | `PROPRIO_TICKETS_API_TOKEN` | Aucune référence littérale détectée |
| `proprio-ticket-detail` | `PROPRIO_TICKETS_API_TOKEN`, `SUPABASE_ANON_KEY`, `SUPABASE_URL` | Aucune référence littérale détectée |
| `proprio-tickets-list` | `PROPRIO_TICKETS_API_TOKEN`, `SUPABASE_ANON_KEY`, `SUPABASE_URL` | Aucune référence littérale détectée |
| `push-notifications` | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `profiles`, `push_config`, `push_subscriptions` |
| `pwa-unlock` | `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `profiles`, `pwa_device_locks` |
| `reconcile-stripe-transfers` | `STRIPE_SECRET_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `invoices`, `profiles` |
| `recover-admin` | `CRON_SECRET`, `CRON_SECRET_2`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `profiles` |
| `refresh-conso` | `CRON_SECRET`, `CRON_SECRET_2`, `CRON_SECRET_V2`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `conso_caches`, `profiles` |
| `report-problem-proxy` | `SUPABASE_ANON_KEY`, `SUPABASE_URL` | `reports` |
| `resend-inbound-email` | `CRON_SECRET`, `CRON_SECRET_NOTIFY_NEW_RESA`, `RESEND_API_KEY`, `RESEND_INBOUND_WEBHOOK_SECRET`, `RESERVATION_EMAIL_INGEST_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `app_settings`, `conversations`, `messages`, `profiles` |
| `review-analyzer` | `OPENAI_API_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `cached_improvement_points` |
| `revyoos-proxy` | `REVOOYS_EMAIL`, `REVOOYS_PASSWORD`, `SUPABASE_ANON_KEY`, `SUPABASE_URL` | Aucune référence littérale détectée |
| `scan-krossbooking-reviews` | `CRONSECRETNOTIFYNEWRESA`, `CRON_SECRET`, `CRON_SECRET_2`, `CRON_SECRET_NOTIFY_NEW_RESA`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `krossbooking_reviews`, `user_rooms` |
| `send-auth-email` | `APP_BASE_URL`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | Aucune référence littérale détectée |
| `send-bilan-2025-email` | `APP_BASE_URL`, `RESEND_API_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `notifications`, `profiles`, `statements` |
| `send-email` | `RESEND_API_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `app_settings`, `conversations`, `messages`, `profiles` |
| `send-newsletter` | `RESEND_API_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_URL` | `newsletter_deliveries`, `profiles` |
| `send-payment-reminder` | `APP_BASE_URL`, `PENNYLANE_API_KEY`, `RESEND_API_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `invoices`, `notifications`, `profiles`, `statements` |
| `send-sms-otp` | `SUPABASE_URL`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` | Aucune référence littérale détectée |
| `send-statement-email` | `APP_BASE_URL`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `app_settings`, `invoices`, `notifications`, `statements` |
| `send-test-smsfactor-sms` | `SMSFACTOR_API_TOKEN`, `SUPABASE_ANON_KEY`, `SUPABASE_URL` | `profiles` |
| `send-unauthenticated-email` | `RESEND_API_KEY` | Aucune référence littérale détectée |
| `stripe-proxy` | `STRIPE_SECRET_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_URL` | `profiles` |
| `switch-to-master` | `APP_BASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `account_members` |
| `sync-resend-krossbooking-emails` | `CRON_SECRET`, `CRON_SECRET_2`, `CRON_SECRET_NOTIFY_NEW_RESA`, `RESEND_API_KEY`, `RESEND_API_KEY_RECEIV`, `RESERVATION_EMAIL_INGEST_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `reservation_email_sync_runs` |
| `temperature-alerts` | `CRON_SECRET`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `netatmo_thermostats`, `temperature_alert_settings`, `user_rooms` |
| `thermobnb-auto-planner` | `CRON_SECRET`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `netatmo_thermostats`, `thermostat_scenarios`, `thermostat_schedules`, `user_rooms` |
| `thermobnb-scheduler` | `CRON_SECRET`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `thermostat_schedules` |
| `update-user-email` | `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `profiles` |
| `update-user-password` | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | Aucune référence littérale détectée |
| `update-user-proxy` | `APP_BASE_URL`, `RESEND_API_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | `notifications`, `profiles` |
| `user-performance-analyzer` | `SUPABASE_ANON_KEY`, `SUPABASE_URL` | `user_rooms` |
| `verify-sms-otp` | `APP_BASE_URL`, `APP_BASE_URL\n`, `APP_BASE_URL\n\n`, `APP_BASE_URL\r\n`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` | `profiles` |

## Couches API frontend

| Module | Tables / buckets référencés littéralement |
|---|---|
| `src/lib/accountant-api.ts` | `accountant_requests` |
| `src/lib/admin-api.ts` | `accountant_client_relations`, `accountant_requests`, `app_settings`, `ideas`, `invoices`, `profiles`, `prospects`, `room_utility_events`, `strategies`, `transfer_verification_statuses`, `user_rooms` |
| `src/lib/announcements-api.ts` | Voir les appels Edge / traitements du module |
| `src/lib/app-rating-api.ts` | `app_ratings` |
| `src/lib/auth-api.ts` | Voir les appels Edge / traitements du module |
| `src/lib/booklet-api.ts` | `digital_booklets` |
| `src/lib/changelog-api.ts` | `changelog` |
| `src/lib/comp-set-api.ts` | Voir les appels Edge / traitements du module |
| `src/lib/consumables-api.ts` | `consumable_billings` |
| `src/lib/documents-api.ts` | `documents`, `secure_documents` |
| `src/lib/domain-request-api.ts` | `domain_requests`, `mini_sites`, `profiles` |
| `src/lib/error-logging-api.ts` | Voir les appels Edge / traitements du module |
| `src/lib/expenses-api.ts` | `expenses`, `recurring_expenses` |
| `src/lib/faq-api.ts` | `faqs` |
| `src/lib/furniture-api.ts` | `room_furniture` |
| `src/lib/hello-wallet.ts` | `hello_wallet_entries`, `hello_wallet_referrals`, `hello_wallet_requests` |
| `src/lib/hivernage-api.ts` | `hivernage_requests` |
| `src/lib/housekeeping-api.ts` | Voir les appels Edge / traitements du module |
| `src/lib/housekeeping-notes-api.ts` | `housekeeping_notes` |
| `src/lib/ideas-api.ts` | `idea_votes`, `ideas` |
| `src/lib/key-board-api.ts` | `key_board_slots`, `user_rooms` |
| `src/lib/krossbooking.ts` | Voir les appels Edge / traitements du module |
| `src/lib/lmnp-api.ts` | `lmnp_fixed_assets`, `lmnp_settings` |
| `src/lib/marketplace-api.ts` | `service_providers` |
| `src/lib/mini-site-api.ts` | `mini_sites`, `profiles` |
| `src/lib/module-activation-api.ts` | `module_activation_requests` |
| `src/lib/newsletter-api.ts` | `newsletter_campaigns`, `newsletter_deliveries`, `newsletter_queue` |
| `src/lib/notifications-api.ts` | `notifications` |
| `src/lib/order-ticket-api.ts` | Voir les appels Edge / traitements du module |
| `src/lib/page-api.ts` | Voir les appels Edge / traitements du module |
| `src/lib/payment-score-api.ts` | `client_payment_scores` |
| `src/lib/pennylane-api.ts` | `delegated_invoice_viewers` |
| `src/lib/performance-api.ts` | Voir les appels Edge / traitements du module |
| `src/lib/price-override-api.ts` | `price_overrides` |
| `src/lib/price-position-api.ts` | Voir les appels Edge / traitements du module |
| `src/lib/profile-api.ts` | `profiles` |
| `src/lib/public-reviews-api.ts` | Voir les appels Edge / traitements du module |
| `src/lib/push-api.ts` | `push_subscriptions` |
| `src/lib/pwa-api.ts` | `pwa_installs` |
| `src/lib/pwa-lock-api.ts` | Voir les appels Edge / traitements du module |
| `src/lib/rehousing-notes-api.ts` | `profiles`, `rehousing_notes` |
| `src/lib/reports-api.ts` | `reports` |
| `src/lib/reviews-api.ts` | `krossbooking_reviews` |
| `src/lib/season-pricing-api.ts` | `profiles`, `season_price_requests` |
| `src/lib/statements-api.ts` | `invoices` |
| `src/lib/statements-export-api.ts` | Voir les appels Edge / traitements du module |
| `src/lib/status-api.ts` | `service_statuses` |
| `src/lib/storage-api.ts` | `statements` |
| `src/lib/strategy-api.ts` | `strategies` |
| `src/lib/stripe-api.ts` | Voir les appels Edge / traitements du module |
| `src/lib/technical-reports-api.ts` | `profiles`, `technical_report_updates`, `technical_reports` |
| `src/lib/tickets-api.ts` | Voir les appels Edge / traitements du module |
| `src/lib/unauthenticated-email-api.ts` | Voir les appels Edge / traitements du module |
| `src/lib/user-room-api.ts` | `monthly_featured_rooms`, `user_rooms` |
