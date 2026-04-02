select p.id, u.email, p.first_name, p.last_name, p.role, p.is_payment_suspended, p.is_banned, p.is_contract_terminated, p.thermobnb_enabled, p.conso_service_enabled
from public.profiles p
join auth.users u on u.id = p.id
where lower(u.email) = lower('contact@hellowash.fr');