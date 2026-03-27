select id, event_type, room_name, room_name_normalized, reservation_reference, matched_user_ids, matched_user_room_ids, processing_status, error_message, created_at
from public.reservation_email_events
where room_name ilike '%Argousiers%'
order by created_at desc
limit 20;