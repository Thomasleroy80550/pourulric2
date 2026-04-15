import React from 'react';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import PerformanceSummaryPrintLayout from '@/components/PerformanceSummaryPrintLayout';
import type { AdminBilan2025PreviewData } from '@/components/admin/AdminBilan2025PreviewDialog';

export async function generateBilan2025PdfFile(payload: AdminBilan2025PreviewData): Promise<File> {
  return new Promise((resolve, reject) => {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '1024px';
    document.body.appendChild(container);

    const root = createRoot(container);

    const cleanup = () => {
      root.unmount();
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    };

    const captureAndResolve = async () => {
      try {
        const element = container.querySelector('#performance-summary-to-print');
        if (!element) {
          throw new Error("Impossible de trouver l'aperçu du bilan à imprimer.");
        }

        const canvas = await html2canvas(element as HTMLElement, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          width: (element as HTMLElement).scrollWidth,
          height: (element as HTMLElement).scrollHeight,
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'p',
          unit: 'mm',
          format: 'a4',
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
          heightLeft -= pdfHeight;
        }

        const safeClient = payload.clientName
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '') || 'Client';

        const pdfBlob = pdf.output('blob');
        resolve(new File([pdfBlob], `Bilan_${payload.year}_${safeClient}.pdf`, { type: 'application/pdf' }));
      } catch (error) {
        reject(error);
      } finally {
        cleanup();
      }
    };

    root.render(
      <React.StrictMode>
        <PerformanceSummaryPrintLayout
          clientName={payload.clientName}
          year={payload.year}
          yearlyTotals={payload.yearlyTotals}
          monthly={payload.monthly}
          summaryText={payload.summaryText}
        />
      </React.StrictMode>
    );

    setTimeout(captureAndResolve, 600);
  });
}
