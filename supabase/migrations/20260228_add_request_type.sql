-- ============================================================
-- RedZone — Add Request Type to Squad Join Requests
-- ============================================================

-- Add request_type column to track who initiated the request
ALTER TABLE public.squad_join_requests 
ADD COLUMN request_type TEXT NOT NULL DEFAULT 'player_request' 
CHECK (request_type IN ('player_request', 'squad_request'));

-- player_request: User clicked "Join" on a squad
-- squad_request: Squad creator sent a request to a user to join

-- ============================================================
-- Done! New column: request_type
-- Existing rows default to 'player_request'
-- ============================================================
