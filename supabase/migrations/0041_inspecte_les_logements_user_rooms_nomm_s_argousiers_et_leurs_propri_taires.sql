select ur.id, ur.user_id, ur.room_id, ur.room_name, p.email, p.first_name, p.last_name
from public.user_rooms ur
left join public.profiles p on p.id = ur.user_id
where ur.room_name ilike '%Argousiers%'
order by ur.room_name, p.email;