# Webhook des réservations Cadence

## Endpoint

`POST https://dkjaejzwmmwwzhokpbgs.supabase.co/functions/v1/cadence-reservation-webhook`

Authentification serveur par HMAC, sans session utilisateur ni JWT Supabase. Ne pas envoyer une clé service-role depuis Cadence. Le déploiement des Edge Functions est géré automatiquement par l’application (vérification JWT de plateforme désactivée ; HMAC vérifié par le handler).

## Configuration préalable

Configurer `CADENCE_WEBHOOK_SIGNING_SECRET` dans Supabase → Edge Functions → Manage Secrets et configurer la même valeur dans le système émetteur Cadence, via un canal sécurisé. Utiliser un secret aléatoire dédié d’au moins 32 octets. La valeur est utilisée comme texte UTF-8, sans décodage hexadécimal/base64 ni suppression des espaces. Ne jamais stocker cette valeur dans le navigateur, le dépôt ou les logs.

Sans ce secret, le serveur refuse les POST avec `503 webhook_not_configured` et n’enregistre rien.

## Headers et signature

- `Content-Type: application/json` (UTF-8).
- `X-Cadence-Timestamp: <timestamp Unix UTC en secondes, 10 chiffres>`.
- `X-Cadence-Signature: sha256=<64 caractères hexadécimaux minuscules>`.

Calcul :

```text
signed_bytes = UTF8(timestamp + ".") || raw_body_bytes
signature = "sha256=" + HEX_LOWER(HMAC_SHA256(UTF8(signing_secret), signed_bytes))
```

Signer les octets exacts transmis, pas une reconstruction du JSON. La tolérance est de 300 secondes, dans le passé ou le futur, vérifiée avant et après lecture du corps. Utiliser une horloge synchronisée. La vérification du MAC utilise Web Crypto. Taille maximale du corps : 65 536 octets.

## Corps JSON

Exemple illustratif, à remplacer par les identifiants exacts de l’attribution :

```json
{
  "event_id": "37c935e4-dc75-4b4e-8314-117469e4b4d4",
  "event_type": "reservation.created",
  "property_id": "01e1e43f-2860-427c-9bfb-8b3c8e5d55bb",
  "agency_id": "identifiant-agence-exact",
  "environment": "environnement-exact",
  "reservation_id": "CAD-12345"
}
```

Les six champs sont obligatoires :

| Champ | Format |
| --- | --- |
| `event_id` | UUID globalement unique et stable pour cet événement |
| `event_type` | `reservation.created`, `reservation.modified` ou `reservation.cancelled` |
| `property_id` | UUID du logement source |
| `agency_id` | Chaîne non vide, 200 caractères maximum |
| `environment` | Chaîne non vide, 100 caractères maximum |
| `reservation_id` | Référence de réservation, chaîne non vide, 200 caractères maximum |

Aucun espace de début/fin ni caractère de contrôle dans les trois chaînes. Aucun rapprochement par nom. Les champs supplémentaires sont ignorés fonctionnellement mais restent couverts par la signature et l’empreinte du corps. Le registre conserve l’empreinte SHA-256 du corps, les identifiants et les destinataires, pas le corps complet.

## Transaction et destinataires

Une unique transaction PostgreSQL :

1. Insère l’UUID dans `cadence_webhook_events` (clé primaire globale).
2. Sélectionne les profils actuellement présents dans `channel_property_assignments` pour le triplet exact `property_id`, `agency_id`, `environment`. Les UUID sont comparés comme UUID ; les chaînes sont comparées exactement et de façon sensible à la casse, sans normalisation. Les attributions sélectionnées sont verrouillées en lecture jusqu’au commit.
3. Insère une notification dans `notifications` par profil distinct, avec un lien vers `/bookings`.
4. Enregistre les UUID des destinataires et le nombre de notifications dans le registre.

Tout échec annule l’événement et toutes ses notifications. Le serveur n’acquitte qu’après le commit. La fonction SQL est `SECURITY INVOKER`, exécutable uniquement par `service_role`. Le registre a RLS activé et aucun accès client.

Sans attribution exacte, l’événement est néanmoins enregistré durablement avec `outcome: "no_assignments"` et zéro notification. Aucun fallback, y compris par nom ou par `property_id` seul. Une attribution ultérieure ne provoque pas de notification rétroactive lors d’un retry.

Le webhook ne modifie pas les réservations ni leur cache et n’implémente pas d’envoi email/SMS. L’éventuel push déclenché par le mécanisme existant de `notifications` n’est pas une garantie de livraison externe du webhook.

## Réponses et retries

Enregistrement durable : `200`

```json
{
  "success": true,
  "status": "recorded",
  "event_id": "37c935e4-dc75-4b4e-8314-117469e4b4d4",
  "outcome": "notified",
  "notification_count": 2
}
```

Un retry au corps strictement identique reçoit `200`, `status: "duplicate"`, et le résultat enregistré initialement. Il ne crée aucune notification supplémentaire, même en cas d’appels concurrents.

| HTTP | Signification |
| --- | --- |
| `400` | JSON, UTF-8 ou champs invalides ; corriger le contrat |
| `401` | Signature/headers invalides ou timestamp hors fenêtre |
| `405` | Méthode autre que POST (OPTIONS est réservé au préflight) |
| `409` | UUID déjà enregistré avec un corps différent ; ne pas changer le corps d’un événement existant |
| `413` | Corps supérieur à 65 536 octets |
| `415` | Content-Type autre que application/json |
| `503` | Configuration manquante ou échec technique/d’enregistrement ; aucun acquittement |

Réessayer les erreurs techniques/timeouts avec backoff exponentiel. Conserver le même UUID ET les mêmes octets de corps, mais générer un nouveau timestamp et recalculer sa signature pour chaque tentative. Un commit dont la réponse a été perdue sera reconnu comme doublon. Toute nouvelle modification/annulation est un nouvel événement et doit avoir un nouvel UUID. La fenêtre temporelle rejette les anciennes requêtes ; la déduplication durable bloque les répétitions même avec un nouveau timestamp valide. Ne pas purger le registre sans définir explicitement une nouvelle politique de déduplication.
