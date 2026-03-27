update public.reservation_email_events
set room_name = 'Cabane du pêcheur',
    room_name_normalized = 'cabane du pecheur',
    matched_user_ids = array['2f48dcd3-b3e5-4236-801c-d919313d54d6']::uuid[],
    matched_user_room_ids = array['1401032b-4783-44f7-8d03-903d5162e082']::uuid[],
    processing_status = 'matched',
    error_message = null,
    processed_at = now()
where id = 'eccd6332-5dec-4eb3-b9aa-516c71e2eee1';