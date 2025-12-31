import React from 'react';
import { SavedInvoice } from '@/lib/admin-api';
import StatementPrintLayout from '@/components/StatementPrintLayout';
import PerformanceSummaryPrintLayout from '@/components/PerformanceSummaryPrintLayout';
import HivernageRequestPrintLayout from '@/components/HivernageRequestPrintLayout';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import CguvPrintLayout from '@/components/CguvPrintLayout';
import CGUV_HTML_CONTENT from '@/assets/cguv.html?raw';

export const generateStatementPdf = (statement: SavedInvoice): Promise<File> => {
  return new Promise((resolve, reject) => {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '1024px'; // Largeur nécessaire pour le calcul de la mise en page
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
        const statementElement = container.querySelector('#statement-to-print');
        if (!statementElement) {
          throw new Error("Impossible de trouver l'élément du relevé à imprimer.");
        }

        const canvas = await html2canvas(statementElement as HTMLElement, {
          scale: 1.4, // réduit par rapport à 2 pour baisser la taille
          useCORS: true,
          width: (statementElement as HTMLElement).scrollWidth,
          height: (statementElement as HTMLElement).scrollHeight,
        });

        // Utiliser JPEG avec qualité pour diminuer drastiquement le poids
        const imgData = canvas.toDataURL('image/jpeg', 0.82);
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

        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
          heightLeft -= pdfHeight;
        }
        
        const clientName = statement.profiles ? `${statement.profiles.first_name}_${statement.profiles.last_name}` : 'Client';
        const fileName = `Releve_${clientName}_${statement.period.replace(/\s/g, '_')}.pdf`;

        const pdfBlob = pdf.output('blob');
        const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
        
        resolve(pdfFile);
      } catch (error) {
        reject(error);
      } finally {
        cleanup();
      }
    };

    root.render(
      <React.StrictMode>
        <StatementPrintLayout statement={statement} />
      </React.StrictMode>
    );
    
    setTimeout(captureAndResolve, 500);
  });
};

export const generateCguvPdf = (): Promise<void> => {
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
        const cguvElement = container.querySelector('#cguv-to-print');
        if (!cguvElement) {
          throw new Error("Impossible de trouver l'élément des CGUV à imprimer.");
        }

        const canvas = await html2canvas(cguvElement as HTMLElement, {
          scale: 2,
          useCORS: true,
          backgroundColor: null, // Ajout de cette ligne
        });

        const pdf = new jsPDF({
          orientation: 'p',
          unit: 'mm',
          format: 'a4',
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const imgHeight = (canvas.height * pdfWidth) / canvas.width; // Calculer la hauteur de l'image dans les unités du PDF
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(canvas, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(canvas, 'PNG', 0, position, pdfWidth, imgHeight);
          heightLeft -= pdfHeight;
        }

        const versionMatch = CGUV_HTML_CONTENT.match(/Version ([\d\.]+)/i);
        const version = versionMatch ? versionMatch[1] : 'latest';
        const fileName = `CGUV_HelloKeys_v${version}.pdf`;

        pdf.save(fileName);
        resolve();
      } catch (error) {
        reject(error);
      } finally {
        cleanup();
      }
    };

    root.render(
      <React.StrictMode>
        <CguvPrintLayout />
      </React.StrictMode>
    );

    setTimeout(captureAndResolve, 1000);
  });
};

export const generatePerformanceSummaryPdf = (params: {
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
  monthly: Array<{ month: string; totalCA: number; occupation: number }>;
  summaryText: string;
}): Promise<void> => {
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
          throw new Error("Impossible de trouver l'élément du récap à imprimer.");
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

        const safeClient = params.clientName.replace(/\s+/g, '_');
        const fileName = `Synthese_${safeClient}_${params.year}.pdf`;
        pdf.save(fileName);
        resolve();
      } catch (error) {
        reject(error);
      } finally {
        cleanup();
      }
    };

    root.render(
      <React.StrictMode>
        <PerformanceSummaryPrintLayout
          clientName={params.clientName}
          year={params.year}
          yearlyTotals={params.yearlyTotals}
          monthly={params.monthly}
          summaryText={params.summaryText}
        />
      </React.StrictMode>
    );

    setTimeout(captureAndResolve, 600);
  });
};

export const generateHivernageRequestPdf = (request: import('@/lib/hivernage-api').HivernageRequest): Promise<void> => {
  return new Promise((resolve, reject) => {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '1024px'; // largeur plus grande pour un rendu net
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
        const element = container.querySelector('#hivernage-request-to-print');
        if (!element) {
          throw new Error("Impossible de trouver l'élément de la demande d'hivernage à imprimer.");
        }

        const canvas = await html2canvas(element as HTMLElement, {
          scale: 2, // meilleure netteté du texte
          useCORS: true,
          backgroundColor: '#ffffff',
          width: (element as HTMLElement).scrollWidth,
          height: (element as HTMLElement).scrollHeight,
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const margin = 10; // marges pour éviter le contenu collé aux bords
        const targetWidth = pdfWidth - margin * 2;
        const imgHeight = (canvas.height * targetWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        // Première page
        pdf.addImage(imgData, 'PNG', margin, margin + position, targetWidth, imgHeight);
        heightLeft -= (pdfHeight - margin * 2);

        // Pages suivantes si nécessaire
        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', margin, margin + position, targetWidth, imgHeight);
          heightLeft -= (pdfHeight - margin * 2);
        }

        const filename = `Hivernage_${(request.profiles?.first_name ?? 'Client')}_${(request.profiles?.last_name ?? '')}_${new Date(request.created_at).toISOString().slice(0,10)}.pdf`;
        pdf.save(filename);
        resolve();
      } catch (error) {
        reject(error);
      } finally {
        cleanup();
      }
    };

    root.render(
      <React.StrictMode>
        <HivernageRequestPrintLayout request={request} />
      </React.StrictMode>
    );

    setTimeout(captureAndResolve, 600);
  });
};

export const openHivernageRequestPdfInNewWindow = (request: import('@/lib/hivernage-api').HivernageRequest): Promise<void> => {
  return new Promise((resolve, reject) => {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '1024px'; // cohérent avec la génération de PDF
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
        const el = container.querySelector('#hivernage-request-to-print') as HTMLElement | null;
        if (!el) {
          throw new Error("Élément d'impression non trouvé.");
        }

        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          width: el.scrollWidth,
          height: el.scrollHeight,
        });

        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;
        const targetWidth = pdfWidth - margin * 2;
        const imgHeight = (canvas.height * targetWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin + position, targetWidth, imgHeight);
        heightLeft -= (pdfHeight - margin * 2);

        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin + position, targetWidth, imgHeight);
          heightLeft -= (pdfHeight - margin * 2);
        }

        const blob = pdf.output('blob');
        const url = URL.createObjectURL(blob);
        const win = window.open(url, '_blank');
        if (!win) {
          throw new Error("Impossible d'ouvrir la fenêtre de prévisualisation PDF.");
        }
        resolve();
      } catch (error) {
        reject(error);
      } finally {
        cleanup();
      }
    };

    root.render(
      <React.StrictMode>
        <HivernageRequestPrintLayout request={request} />
      </React.StrictMode>
    );

    setTimeout(captureAndResolve, 600);
  });
};

export const generateAllHivernageRequestsPdf = async (requests: import('@/lib/hivernage-api').HivernageRequest[]): Promise<void> => {
  if (!Array.isArray(requests) || requests.length === 0) {
    throw new Error("Aucune demande d'hivernage à imprimer.");
  }

  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const targetWidth = pdfWidth - margin * 2;

  for (let idx = 0; idx < requests.length; idx++) {
    const request = requests[idx];

    await new Promise<void>((resolve, reject) => {
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

      const capture = async () => {
        try {
          const el = container.querySelector('#hivernage-request-to-print') as HTMLElement | null;
          if (!el) {
            throw new Error("Élément d'impression non trouvé pour une demande.");
          }

          const canvas = await html2canvas(el, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            width: el.scrollWidth,
            height: el.scrollHeight,
          });

          const imgData = canvas.toDataURL('image/png');
          const imgHeight = (canvas.height * targetWidth) / canvas.width;
          let heightLeft = imgHeight;
          let position = 0;

          // Nouvelle page pour chaque nouvelle demande sauf la première
          if (idx > 0) {
            pdf.addPage();
          }

          // Première page
          pdf.addImage(imgData, 'PNG', margin, margin + position, targetWidth, imgHeight);
          heightLeft -= (pdfHeight - margin * 2);

          // Pages suivantes si nécessaire
          while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', margin, margin + position, targetWidth, imgHeight);
            heightLeft -= (pdfHeight - margin * 2);
          }

          resolve();
        } catch (e) {
          reject(e);
        } finally {
          cleanup();
        }
      };

      root.render(
        <React.StrictMode>
          <HivernageRequestPrintLayout request={request} />
        </React.StrictMode>
      );

      setTimeout(capture, 600);
    });
  }

  const filename = `Hivernage_Toutes_Demandes_${new Date().toISOString().slice(0, 10)}.pdf`;
  pdf.save(filename);
};