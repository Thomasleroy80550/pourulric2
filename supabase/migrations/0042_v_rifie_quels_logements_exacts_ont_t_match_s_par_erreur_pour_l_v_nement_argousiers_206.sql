select ur.id, ur.room_name, ur.room_id, p.email
from public.user_rooms ur
left join public.profiles p on p.id = ur.user_id
where ur.id in ('84f4b153-b6c9-45ec-849f-1ec1e3f819a5','426f1815-a66b-426f-8ccb-fbb456103ec2','616f258b-6bbf-4bf4-ba38-8b63e948459f');