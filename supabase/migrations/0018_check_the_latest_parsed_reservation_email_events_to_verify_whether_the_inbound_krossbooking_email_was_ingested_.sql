SELECT id, event_type, reservation_reference, reservation_id, room_name, guest_name, guest_email, arrival_date, departure_date, total_amount, reservation_status, processing_status, matched_user_ids, created_at
FROM public.reservation_email_events
ORDER BY created_at DESC
LIMIT 10;