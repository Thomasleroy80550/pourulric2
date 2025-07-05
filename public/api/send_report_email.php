<?php
header("Access-Control-Allow-Origin: *"); // Allow requests from any origin (for development)
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        echo json_encode(['error' => 'Invalid JSON input.']);
        http_response_code(400);
        exit();
    }

    $reservation_id = $data['reservation_id'] ?? 'N/A';
    $problem_type = $data['problem_type'] ?? 'Problème inconnu';
    $description = $data['description'] ?? 'Aucune description fournie.';
    $contact_email = $data['contact_email'] ?? 'Non fourni';
    $contact_phone = $data['contact_phone'] ?? 'Non fourni';
    $guest_name = $data['guest_name'] ?? 'N/A';
    $property_name = $data['property_name'] ?? 'N/A';

    $to = 'contact@hellokeys.fr';
    $subject = "[${problem_type}] - Problème Réservation N° ${reservation_id}";
    $message = "
        Un nouveau problème a été signalé pour la réservation N° ${reservation_id}.

        Détails de la réservation :
        - Client : ${guest_name}
        - Propriété : ${property_name}

        Type de problème : ${problem_type}
        Description :
        ${description}

        Informations de contact de l'utilisateur :
        - Email : ${contact_email}
        - Téléphone : ${contact_phone}
    ";

    // Headers pour l'e-mail
    $headers = 'From: no-reply@hellokeys.fr' . "\r\n" .
               'Reply-To: ' . $contact_email . "\r\n" .
               'Content-Type: text/plain; charset=UTF-8' . "\r\n" .
               'X-Mailer: PHP/' . phpversion();

    // Envoi de l'e-mail
    if (mail($to, $subject, $message, $headers)) {
        echo json_encode(['message' => 'Email sent successfully.']);
        http_response_code(200);
    } else {
        echo json_encode(['error' => 'Failed to send email.']);
        http_response_code(500);
    }
} else {
    echo json_encode(['error' => 'Invalid request method.']);
    http_response_code(405);
}
?>