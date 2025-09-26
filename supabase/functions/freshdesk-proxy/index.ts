import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ticket-id',
}

serve(async (req) => {
  console.log('Freshdesk proxy: Début du traitement de la requête', req.method, req.url);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header manquant' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Freshdesk proxy: Erreur auth:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    const FRESHDESK_DOMAIN = Deno.env.get('FRESHDESK_DOMAIN');
    const FRESHDESK_API_KEY = Deno.env.get('FRESHDESK_API_KEY');
    if (!FRESHDESK_DOMAIN || !FRESHDESK_API_KEY) {
      return new Response(JSON.stringify({ error: 'Les identifiants Freshdesk ne sont pas configurés.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    const userEmail = user.email;
    const userName = user.user_metadata?.first_name || user.user_metadata?.last_name ? 
      `${user.user_metadata.first_name || ''} ${user.user_metadata.last_name || ''}`.trim() : 
      userEmail;

    if (!userEmail) {
      return new Response(JSON.stringify({ error: 'Email utilisateur non trouvé.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const freshdeskAuthHeader = `Basic ${btoa(FRESHDESK_API_KEY + ':X')}`;

    if (req.method === 'POST') {
      console.log('Freshdesk proxy: Traitement d\'une requête POST');
      
      let body;
      try {
        const rawBody = await req.text();
        body = JSON.parse(rawBody);
      } catch (e) {
        return new Response(JSON.stringify({ error: 'JSON invalide dans le corps de la requête.', details: e.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Reply to a ticket (as the support agent, but with user attribution)
      if (body.ticketId && body.body) {
        console.log(`Freshdesk proxy: Traitement d'une réponse au ticket ${body.ticketId} de la part de l'utilisateur.`);
        const { ticketId, body: replyBody } = body;

        // 1. Get ticket details to check status
        const checkUrl = `https://${FRESHDESK_DOMAIN}/api/v2/tickets/${ticketId}`;
        const checkResponse = await fetch(checkUrl, {
          headers: { 'Authorization': freshdeskAuthHeader, 'Content-Type': 'application/json' },
        });

        if (!checkResponse.ok) {
          const errorBody = await checkResponse.text();
          return new Response(JSON.stringify({ error: 'Ticket non trouvé ou inaccessible.', details: errorBody }), { status: checkResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const ticketData = await checkResponse.json();
        if (ticketData.status !== 2 && ticketData.status !== 3) { // Status 2: Open, Status 3: Pending
          return new Response(JSON.stringify({ error: 'Impossible de répondre à ce ticket car il est fermé ou résolu.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // 2. Use the /reply endpoint to add a reply from the support agent
        const freshdeskUrl = `https://${FRESHDESK_DOMAIN}/api/v2/tickets/${ticketId}/reply`;
        const formattedReplyBody = `**Réponse de l'utilisateur ${userName} (${userEmail}) via le portail client :**\n\n${replyBody}`;
        const requestBody = JSON.stringify({
          body: formattedReplyBody,
        });

        const freshdeskResponse = await fetch(freshdeskUrl, {
          method: 'POST',
          headers: { 'Authorization': freshdeskAuthHeader, 'Content-Type': 'application/json' },
          body: requestBody,
        });

        if (!freshdeskResponse.ok) {
          const errorData = await freshdeskResponse.json().catch(() => freshdeskResponse.text());
          console.error('Freshdesk proxy: Erreur API Freshdesk (reply):', freshdeskResponse.status, errorData);
          return new Response(JSON.stringify({ error: 'Impossible d\'envoyer la réponse.', details: errorData }), { status: freshdeskResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        
        const responseData = await freshdeskResponse.json();
        return new Response(JSON.stringify(responseData), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Create a new ticket
      if (body.subject && body.description) {
        console.log('Freshdesk proxy: Traitement d\'une création de ticket');
        const { subject, description, priority } = body;
        const freshdeskUrl = `https://${FRESHDESK_DOMAIN}/api/v2/tickets`;
        const freshdeskResponse = await fetch(freshdeskUrl, {
          method: 'POST',
          headers: { 'Authorization': freshdeskAuthHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail, subject, description, priority: priority || 1, status: 2, source: 2 }),
        });

        if (!freshdeskResponse.ok) {
          const errorData = await freshdeskResponse.json().catch(() => freshdeskResponse.text());
          return new Response(JSON.stringify({ error: 'Impossible de créer le ticket.', details: errorData }), { status: freshdeskResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const responseData = await freshdeskResponse.json();
        return new Response(JSON.stringify(responseData), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ error: 'Requête POST invalide: paramètres manquants (ticketId/body ou subject/description).' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Handle GET requests (List tickets or get details)
    if (req.method === 'GET') {
      const ticketId = req.headers.get('x-ticket-id');

      if (ticketId) {
        // Get ticket details
        const freshdeskUrl = `https://${FRESHDESK_DOMAIN}/api/v2/tickets/${ticketId}?include=conversations`;
        const freshdeskResponse = await fetch(freshdeskUrl, {
          headers: { 'Authorization': freshdeskAuthHeader, 'Content-Type': 'application/json' },
        });
        
        if (!freshdeskResponse.ok) {
          const errorBody = await freshdeskResponse.text();
          return new Response(JSON.stringify({ error: 'Impossible de récupérer les détails du ticket<think>Initial files ranking:

supabase/functions/freshdesk-proxy/index.ts: 0.99

src/lib/tickets-api.ts: 0.97

src/components/TicketReplyForm.tsx: 0.95

src/integrations/supabase/client.ts: 0.86

src/lib/admin-api.ts: 0.85

src/lib/krossbooking.ts: 0.83

src/pages/AdminStatementsPage.tsx: 0.81

src/pages/TicketsPage.tsx: 0.80

src/pages/TicketDetailPage.tsx: 0.72

src/utils/toast.ts: 0.56

src/components/CreateTicketDialog.tsx: 0.53

src/components/ui/use-toast.ts: 0.52

src/pages/OnboardingStatusPage.tsx: 0.51

src/lib/profile-api.ts: 0.51

src/components/ui/sonner.tsx: 0.50

src/hooks/use-toast.ts: 0.45

src/components/ui/toast.tsx: 0.42

src/lib/constants.ts: 0.40

src/components/ReportProblemDialog.tsx: 0.39

src/components/SessionContextProvider.tsx: 0.39

src/lib/technical-reports-api.ts: 0.38

vite.config.ts: 0.38

src/pages/NewVersionPage.tsx: 0.38

src/lib/auth-api.ts: 0.37

src/components/ui/select.tsx: 0.35

src/App.tsx: 0.31

src/pages/CompSetPage.tsx: 0.29

supabase/functions/check-new-reservations/index.ts: 0.29

src/pages/Login.tsx: 0.26

src/pages/AdminStrategiesPage.tsx: 0.26

supabase/functions/send-statement-email/index.ts: 0.26

src/components/ui/command.tsx: 0.25

src/pages/PromotionPage.tsx: 0.25

src/components/StrategyTab.tsx: 0.24

src/pages/TechnicalReportDetailPage.tsx: 0.24

src/components/ui/table.tsx: 0.24

supabase/functions/auth-send-sms/index.ts: 0.23

src/components/MainLayout.tsx: 0.22

src/components/BookingPlanningGrid.tsx: 0.21

package.json: 0.21

src/main.tsx: 0.20

src/components/ui/breadcrumb.tsx: 0.19

src/pages/AdminSettingsPage.tsx: 0.18

src/lib/utils.ts: 0.17

src/components/ui/toaster.tsx: 0.17

src/pages/AdminUsersPage.tsx: 0.17

src/pages/HelpPage.tsx: 0.17

vercel.json: 0.17

src/contexts/InvoiceGenerationContext.tsx: 0.15

src/components/RehousingNoteContent.tsx: 0.15

src/components/ui/form.tsx: 0.15

src/components/MessagesDialog.tsx: 0.15

src/components/NotificationBell.tsx: 0.15

src/components/StatusBadge.tsx: 0.15

src/pages/AdminHelloKeysStatsPage.tsx: 0.15

src/lib/unauthenticated-email-api.ts: 0.14

src/components/DigitalBookletForm.tsx: 0.14

src/pages/DashboardPage.tsx: 0.14

src/components/AdminLayout.tsx: 0.13

src/lib/page-api.ts: 0.13

src/components/ui/dropdown-menu.tsx: 0.12

supabase/functions/update-user-proxy/index.ts: 0.12

src/pages/AdminUserRoomsPage.tsx: 0.12

src/components/CalendarGridMobile.tsx: 0.12

src/components/ManageRooms.tsx: 0.12

.gitignore: 0.12

AI_RULES.md: 0.11

src/pages/AdminTechnicalReportsPage.tsx: 0.11

src/App.css: 0.11

src/components/DownloadRoomSummaryButton.tsx: 0.11

src/components/IdeaSubmissionForm.tsx: 0.11

src/lib/strategy-api.ts: 0.11

tsconfig.json: 0.11

components.json: 0.10

README.md: 0.10

src/lib/notifications-api.ts: 0.10

src/components/RoomGeneralInfoForm.tsx: 0.10

src/lib/statements-api.ts: 0.10

supabase/functions/update-user-password/index.ts: 0.10

supabase/functions/page-manager-proxy/index.ts: 0.10</think><think>Re-ranking the files. Please wait a moment...

</think><dyad-codebase-context files="supabase/functions/freshdesk-proxy/index.ts,src/lib/tickets-api.ts,src/components/TicketReplyForm.tsx,src/pages/TicketDetailPage.tsx,src/pages/TicketsPage.tsx,src/integrations/supabase/client.ts,src/lib/profile-api.ts"></dyad-codebase-context><think>dyad-token-savings?original-tokens=408752.25&smart-context-tokens=9641.5</think>.', details: errorBody }), { status: freshdeskResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        
        const ticketData = await freshdeskResponse.json();
        return new Response(JSON.stringify(ticketData), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      } else {
        // List all tickets
        const encodedEmail = encodeURIComponent(userEmail);
        const freshdeskUrl = `https://${FRESHDESK_DOMAIN}/api/v2/tickets?email=${encodedEmail}&order_by=updated_at&order_type=desc`;
        const freshdeskResponse = await fetch(freshdeskUrl, {
          headers: { 'Authorization': freshdeskAuthHeader, 'Content-Type': 'application/json' },
        });

        if (!freshdeskResponse.ok) {
          const errorBody = await freshdeskResponse.text();
          return new Response(JSON.stringify({ error: 'Impossible de récupérer les tickets.', details: errorBody }), { status: freshdeskResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const tickets = await freshdeskResponse.json();
        return new Response(JSON.stringify(tickets), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Freshdesk proxy: Erreur inattendue:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})