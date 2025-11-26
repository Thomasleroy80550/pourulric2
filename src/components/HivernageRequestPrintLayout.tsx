"use client";

import React from 'react';
import { HivernageRequest } from '@/lib/hivernage-api';

const HivernageRequestPrintLayout: React.FC<{ request: HivernageRequest }> = ({ request }) => {
  const ownerName = `${request.profiles?.first_name ?? ''} ${request.profiles?.last_name ?? ''}`.trim() || 'Propriétaire';
  const roomName = request.user_rooms?.room_name ?? 'Logement';
  const createdAt = new Date(request.created_at).toLocaleString('fr-FR');

  const instr = request.instructions || {};

  return (
    <div id="hivernage-request-to-print" style={{ padding: '24px', fontFamily: 'Inter, system-ui, Arial' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '8px' }}>Demande d’hivernage</h1>
      <p style={{ margin: '0 0 16px 0', color: '#6b7280' }}>Créée le {createdAt}</p>

      <section style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '6px' }}>Propriétaire</h2>
        <p><strong>{ownerName}</strong> — {request.profiles?.email ?? 'email inconnu'}</p>
      </section>

      <section style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '6px' }}>Logement</h2>
        <p><strong>{roomName}</strong></p>
      </section>

      <section style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '6px' }}>Consignes</h2>
        <ul style={{ listStyle: 'disc', paddingLeft: '20px' }}>
          {instr.cut_water && <li>Couper l’eau</li>}
          {instr.cut_water_heater && <li>Couper le chauffe-eau</li>}
          {instr.heating_frost_mode && <li>Laisser le chauffage en hors-gel</li>}
          {instr.empty_fridge && <li>Vider le réfrigérateur</li>}
          {instr.remove_linen && <li>Enlever le linge</li>}
          {instr.put_linen && <li>Mettre le linge</li>}
          {instr.close_shutters && <li>Fermer les volets</li>}
          {instr.no_change && <li>Ne rien modifier</li>}
          {!Object.values(instr).some(Boolean) && <li>Aucune consigne spécifique</li>}
        </ul>
      </section>

      {request.comments && (
        <section>
          <h2 style={{ fontSize: '18px', marginBottom: '6px' }}>Commentaires</h2>
          <p style={{ whiteSpace: 'pre-wrap' }}>{request.comments}</p>
        </section>
      )}
    </div>
  );
};

export default HivernageRequestPrintLayout;