import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import CalendarPage from "./pages/CalendarPage";
import BookingsPage from "./pages/BookingsPage";
import PerformancePage from "./pages/PerformancePage";
import ReviewsPage from "./pages/ReviewsPage";
import HelpPage from "./pages/HelpPage";
import ModulesPage from "./pages/ModulesPage";
import RoadmapPage from "./pages/RoadmapPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import PageCreator from "./components/PageCreator";
import ContentPage from "./pages/ContentPage";
import ProfilePage from "./pages/ProfilePage";
import BlogPage from "./pages/BlogPage";
import NewOwnerSitePage from "./pages/NewOwnerSitePage";
import PromotionPage from "./pages/PromotionPage";
import AdminInvoiceGenerationPage from "./pages/AdminInvoiceGenerationPage";
import AdminCreatePennylaneInvoicePage from "./pages/AdminCreatePennylaneInvoicePage";
import AdminStatementsPage from "./pages/AdminStatementsPage";
import AdminTransferSummaryPage from "./pages/AdminTransferSummaryPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import FinancePage from "./pages/FinancePage";
import AdminTechnicalReportsPage from "./pages/AdminTechnicalReportsPage";
import TechnicalReportsPage from "./pages/TechnicalReportsPage";
import TechnicalReportDetailPage from "./pages/TechnicalReportDetailPage";
import ReservationReportDetailPage from "./pages/ReservationReportDetailPage";
import TouristTaxPage from "./pages/TouristTaxPage";
import MyRoomsPage from "./pages/MyRoomsPage";
import { SessionContextProvider } from "./components/SessionContextProvider";
import { ThemeProvider } from "next-themes";
import { InvoiceGenerationProvider } from "./contexts/InvoiceGenerationContext";
import BlogManager from "./components/BlogManager";
import BlogPostPage from "./pages/BlogPostPage";
import AdminStrategiesPage from "./pages/AdminStrategiesPage";
import AdminUserRoomsPage from "./pages/AdminUserRoomsPage";
import AdminSettingsPage from "./pages/AdminSettingsPage";
import AdminModuleRequestsPage from "./pages/AdminModuleRequestsPage";
import OnboardingStatusPage from "./pages/OnboardingStatusPage";
import FaqPage from "./pages/FaqPage";
import AdminFaqPage from "./pages/AdminFaqPage";
import AdminChangelogPage from "./pages/AdminChangelogPage";
import AdminIdeasPage from "./pages/AdminIdeasPage";
import NewVersionPage from "./pages/NewVersionPage";
import AdminDocumentsPage from "./pages/AdminDocumentsPage";
import CompSetPage from "./pages/CompSetPage";
import AdminStripeTransactionsPage from "./pages/AdminStripeTransactionsPage";
import AdminHelloKeysStatsPage from "./pages/AdminHelloKeysStatsPage"; // New import
import AdminStripeMatchPage from "./pages/AdminStripeMatchPage"; // New import
import AdminStripeTransfersPage from "./pages/AdminStripeTransfersPage"; // New import
import AdminRehousingNotePage from "./pages/AdminRehousingNotePage"; // New import
import TicketsPage from "./pages/TicketsPage";
import TicketDetailPage from "./pages/TicketDetailPage";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <InvoiceGenerationProvider>
              <SessionContextProvider>
                {/* The SessionContextProvider handles its own loading state and redirects */}
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/onboarding-status" element={<OnboardingStatusPage />} />
                  <Route path="/admin" element={<AdminDashboardPage />} />
                  <Route path="/admin/pages" element={<PageCreator />} />
                  <Route path="/admin/blog" element={<BlogManager />} />
                  <Route path="/admin/invoice-generation" element={<AdminInvoiceGenerationPage />} />
                  <Route path="/admin/create-pennylane-invoice" element={<AdminCreatePennylaneInvoicePage />} />
                  <Route path="/admin/statements" element={<AdminStatementsPage />} />
                  <Route path="/admin/transfer-summary" element={<AdminTransferSummaryPage />} />
                  <Route path="/admin/users" element={<AdminUsersPage />} />
                  <Route path="/admin/settings" element={<AdminSettingsPage />} />
                  <Route path="/admin/strategies" element={<AdminStrategiesPage />} />
                  <Route path="/admin/module-requests" element={<AdminModuleRequestsPage />} />
                  <Route path="/admin/technical-reports" element={<AdminTechnicalReportsPage />} />
                  <Route path="/admin/technical-reports/:id" element={<TechnicalReportDetailPage isAdmin />} />
                  <Route path="/admin/reservation-reports/:id" element={<ReservationReportDetailPage />} />
                  <Route path="/admin/user-rooms" element={<AdminUserRoomsPage />} />
                  <Route path="/admin/faq" element={<AdminFaqPage />} />
                  <Route path="/admin/changelog" element={<AdminChangelogPage />} />
                  <Route path="/admin/ideas" element={<AdminIdeasPage />} />
                  <Route path="/admin/documents" element={<AdminDocumentsPage />} />
                  <Route path="/admin/stripe-transactions" element={<AdminStripeTransactionsPage />} />
                  <Route path="/admin/stripe-match" element={<AdminStripeMatchPage />} /> {/* New route */}
                  <Route path="/admin/hello-keys-stats" element={<AdminHelloKeysStatsPage />} /> {/* New route */}
                  <Route path="/admin/stripe-transfers" element={<AdminStripeTransfersPage />} /> {/* New route */}
                  <Route path="/admin/rehousing-note" element={<AdminRehousingNotePage />} /> {/* New route */}
                  <Route path="/pages/:slug" element={<ContentPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/blog" element={<BlogPage />} />
                  <Route path="/blog/:slug" element={<BlogPostPage />} />
                  <Route path="/new-owner-site" element={<NewOwnerSitePage />} />
                  <Route path="/promotion" element={<PromotionPage />} />
                  <Route path="/new-version" element={<NewVersionPage />} />
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/bookings" element={<BookingsPage />} />
                  <Route path="/performance" element={<PerformancePage />} />
                  <Route path="/reviews" element={<ReviewsPage />} />
                  <Route path="/finances" element={<FinancePage />} />
                  <Route path="/tourist-tax" element={<TouristTaxPage />} />
                  <Route path="/reports" element={<TechnicalReportsPage />} />
                  <Route path="/reports/:id" element={<TechnicalReportDetailPage />} />
                  <Route path="/help" element={<HelpPage />} />
                  <Route path="/modules" element={<ModulesPage />} />
                  <Route path="/roadmap" element={<RoadmapPage />} />
                  <Route path="/my-rooms" element={<MyRoomsPage />} />
                  <Route path="/faq" element={<FaqPage />} />
                  <Route path="/comp-set" element={<CompSetPage />} />
                  <Route path="/tickets" element={<TicketsPage />} />
                  <Route path="/tickets/:id" element={<TicketDetailPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </SessionContextProvider>
            </InvoiceGenerationProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;