"use client";

import React from 'react';

type MonthlyPoint = {
  month: string;
  totalCA: number;
  occupation: number;
};

function formatCurrencyEUR(value: number) {
  return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

const PerformanceSummaryPrintLayout = ({
  clientName,
  year,
  yearlyTotals,
  monthly,
  summaryText,
}: {
  clientName: string;
  year: number;
  yearlyTotals: {
    totalCA: number;
    totalMontantVerse: number;
    totalFacture: number;
    net: number;
    adr: number;
    revpar: number;
    yearlyOccupation: number;
    totalNuits: number;
    totalReservations: number;
    totalVoyageurs: number;
  };
  monthly: MonthlyPoint[];
  summaryText: string;
}) => {
  return (
    <div id="performance-summary-to-print" className="w-[900px] bg-white text-black">
      <div className="px-8 py-6 border-b">
        <h1 className="text-2xl font-bold">Synthèse de Performance — {clientName}</h1>
        <div className="text-sm text-gray-600">Année {year}</div>
      </div>

      <div className="px-8 py-6 grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="text-sm text-gray-600">Chiffres clés</div>
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex justify-between"><span>CA Total</span><span className="font-semibold">{formatCurrencyEUR(yearlyTotals.totalCA)}</span></div>
            <div className="flex justify-between"><span>Total Versé</span><span className="font-semibold">{formatCurrencyEUR(yearlyTotals.totalMontantVerse)}</span></div>
            <div className="flex justify-between"><span>Frais Hello Keys</span><span className="font-semibold">{formatCurrencyEUR(yearlyTotals.totalFacture)}</span></div>
            <div className="flex justify-between"><span>Bénéfice Net</span><span className="font-semibold">{formatCurrencyEUR(yearlyTotals.net)}</span></div>
            <div className="flex justify-between"><span>ADR</span><span className="font-semibold">{formatCurrencyEUR(yearlyTotals.adr)}</span></div>
            <div className="flex justify-between"><span>RevPAR</span><span className="font-semibold">{formatCurrencyEUR(yearlyTotals.revpar)}</span></div>
            <div className="flex justify-between"><span>Occupation</span><span className="font-semibold">{yearlyTotals.yearlyOccupation.toFixed(1)}%</span></div>
          </div>
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex justify-between"><span>Nuits vendues</span><span className="font-semibold">{yearlyTotals.totalNuits.toLocaleString('fr-FR')}</span></div>
            <div className="flex justify-between"><span>Réservations</span><span className="font-semibold">{yearlyTotals.totalReservations.toLocaleString('fr-FR')}</span></div>
            <div className="flex justify-between"><span>Voyageurs</span><span className="font-semibold">{yearlyTotals.totalVoyageurs.toLocaleString('fr-FR')}</span></div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm text-gray-600">Synthèse OpenAI</div>
          <div className="rounded-lg border p-4 text-sm leading-relaxed whitespace-pre-wrap">
            {summaryText}
          </div>
        </div>
      </div>

      <div className="px-8 pb-8">
        <div className="text-sm text-gray-600 mb-2">Tendance mensuelle (CA & occupation)</div>
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Mois</th>
              <th className="p-2 border">CA</th>
              <th className="p-2 border">Occupation</th>
            </tr>
          </thead>
          <tbody>
            {monthly.map((m, idx) => (
              <tr key={`${m.month}-${idx}`}>
                <td className="p-2 border">{m.month}</td>
                <td className="p-2 border">{formatCurrencyEUR(m.totalCA)}</td>
                <td className="p-2 border">{m.occupation.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PerformanceSummaryPrintLayout;