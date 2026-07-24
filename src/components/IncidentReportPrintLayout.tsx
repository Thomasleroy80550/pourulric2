"use client";

import React from 'react';
import { TechnicalReport, TechnicalReportUpdate } from '@/lib/technical-reports-api';

const priorityLabels: Record<string, string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
  urgent: 'Urgente',
};

const IncidentReportPrintLayout: React.FC<{ report: TechnicalReport; updates?: TechnicalReportUpdate[] }> = ({ report, updates = [] }) => {
  const ownerName = `${report.profiles?.first_name ?? ''} ${report.profiles?.last_name ?? ''}`.trim() || 'Propriétaire';
  const createdAt = new Date(report.created_at).toLocaleString('fr-FR');
  const reference = `#${report.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  const images = (report.media_urls || []).filter((url) =>
    /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(url)
  );

  return (
    <div
      id="incident-report-to-print"
      style={{ padding: '32px', fontFamily: 'Inter, system-ui, Arial', color: '#1f2937', background: '#ffffff' }}
    >
      {/* En-tête */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '2px solid #255f85',
          paddingBottom: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <img src="/logo.png" alt="Hello Keys" style={{ height: '48px', width: 'auto', objectFit: 'contain' }} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <h1 style={{ fontSize: '22px', margin: 0, color: '#255f85' }}>Rapport d'incident</h1>
          <p style={{ margin: '4px 0 0 0', fontFamily: 'monospace', color: '#6b7280' }}>{reference}</p>
          <p style={{ margin: '2px 0 0 0', color: '#6b7280', fontSize: '13px' }}>Émis le {createdAt}</p>
        </div>
      </div>

      {/* Destinataire */}
      <section style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '15px', marginBottom: '6px', color: '#255f85' }}>Destinataire</h2>
        <p style={{ margin: 0 }}>
          <strong>{ownerName}</strong>
          {report.profiles ? '' : ''}
        </p>
        <p style={{ margin: '2px 0 0 0', color: '#374151' }}>Propriété : <strong>{report.property_name}</strong></p>
      </section>

      {/* Détails de l'incident */}
      <section style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '15px', marginBottom: '8px', color: '#255f85' }}>Détails de l'incident</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <tbody>
            <tr>
              <td style={{ padding: '8px 10px', background: '#f3f4f6', fontWeight: 600, width: '160px', border: '1px solid #e5e7eb' }}>
                Titre
              </td>
              <td style={{ padding: '8px 10px', border: '1px solid #e5e7eb' }}>{report.title}</td>
            </tr>
            <tr>
              <td style={{ padding: '8px 10px', background: '#f3f4f6', fontWeight: 600, border: '1px solid #e5e7eb' }}>
                Catégorie
              </td>
              <td style={{ padding: '8px 10px', border: '1px solid #e5e7eb' }}>{report.category || 'Non précisée'}</td>
            </tr>
            <tr>
              <td style={{ padding: '8px 10px', background: '#f3f4f6', fontWeight: 600, border: '1px solid #e5e7eb' }}>
                Priorité
              </td>
              <td style={{ padding: '8px 10px', border: '1px solid #e5e7eb' }}>
                {priorityLabels[report.priority] || report.priority}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Description */}
      <section style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '15px', marginBottom: '6px', color: '#255f85' }}>Description</h2>
        <p style={{ whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.6 }}>
          {report.description || 'Aucune description fournie.'}
        </p>
      </section>

      {/* Photos */}
      {images.length > 0 && (
        <section style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '15px', marginBottom: '8px', color: '#255f85' }}>Photos jointes</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {images.map((url, index) => (
              <img
                key={index}
                src={url}
                crossOrigin="anonymous"
                alt={`Photo ${index + 1}`}
                style={{
                  width: '150px',
                  height: '150px',
                  objectFit: 'cover',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Historique des messages */}
      {updates.length > 0 && (
        <section style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '15px', marginBottom: '8px', color: '#255f85' }}>Historique des échanges</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {updates.map((update) => {
              const authorName =
                `${update.profiles?.first_name ?? ''} ${update.profiles?.last_name ?? ''}`.trim() || 'Utilisateur';
              const isAdmin = update.profiles?.role === 'admin';
              const date = new Date(update.created_at).toLocaleString('fr-FR');
              return (
                <div
                  key={update.id}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderLeft: `4px solid ${isAdmin ? '#255f85' : '#9ca3af'}`,
                    borderRadius: '6px',
                    padding: '10px 12px',
                    background: '#f9fafb',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: isAdmin ? '#255f85' : '#374151' }}>
                      {authorName}
                      {isAdmin ? ' (Hello Keys)' : ''}
                    </span>
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>{date}</span>
                  </div>
                  {update.content && (
                    <p style={{ margin: 0, fontSize: '13px', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                      {update.content}
                    </p>
                  )}
                  {update.media_urls && update.media_urls.length > 0 && (
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>
                      {update.media_urls.length} pièce(s) jointe(s)
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Signature */}
      <section
        style={{
          marginTop: '48px',
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#6b7280' }}>L'équipe Hello Keys</p>
          <img
            src="/assets/signature-hellokeys.png"
            alt="Signature Hello Keys"
            style={{ height: '70px', width: 'auto', objectFit: 'contain' }}
          />
          <div style={{ borderTop: '1px solid #9ca3af', width: '220px', marginTop: '4px', paddingTop: '4px' }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>Signature & cachet</p>
          </div>
        </div>
      </section>

      <p style={{ marginTop: '32px', fontSize: '11px', color: '#9ca3af', textAlign: 'center' }}>
        Document généré automatiquement par Hello Keys — {reference}
      </p>
    </div>
  );
};

export default IncidentReportPrintLayout;
