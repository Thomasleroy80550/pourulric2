-- Table pour inviter des délégués à consulter les relevés/factures
CREATE TABLE public.delegated_invoice_viewers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | accepted | revoked
  viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ
);

ALTER TABLE public.delegated_invoice_viewers ENABLE ROW LEVEL SECURITY;

-- Le propriétaire peut créer des invitations
CREATE POLICY "delegates_insert_owner" ON public.delegated_invoice_viewers
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = owner_id);

-- Le propriétaire peut voir et gérer ses invitations
CREATE POLICY "delegates_select_owner" ON public.delegated_invoice_viewers
FOR SELECT TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "delegates_update_owner" ON public.delegated_invoice_viewers
FOR UPDATE TO authenticated
USING (auth.uid() = owner_id);

-- Le destinataire (par email) peut voir les invitations qui lui sont adressées (ou déjà acceptées)
CREATE POLICY "delegates_select_invitee" ON public.delegated_invoice_viewers
FOR SELECT TO authenticated
USING (
  (SELECT email FROM public.profiles WHERE id = auth.uid()) = invitee_email
  OR viewer_id = auth.uid()
);

-- Le destinataire peut accepter son invitation (convertit en 'accepted' et lie viewer_id = auth.uid())
CREATE POLICY "delegates_update_invitee_accept" ON public.delegated_invoice_viewers
FOR UPDATE TO authenticated
USING (
  (SELECT email FROM public.profiles WHERE id = auth.uid()) = invitee_email
  AND status = 'pending'
)
WITH CHECK (
  viewer_id = auth.uid()
  AND status = 'accepted'
  AND accepted_at IS NOT NULL
);

-- Autoriser les délégués acceptés à consulter les factures du propriétaire
CREATE POLICY "Delegates can view owner's invoices" ON public.invoices
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.delegated_invoice_viewers d
    WHERE d.owner_id = invoices.user_id
      AND d.viewer_id = auth.uid()
      AND d.status = 'accepted'
  )
);