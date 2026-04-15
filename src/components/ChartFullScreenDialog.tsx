import React, { useRef, useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Download } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import useWindowSize from 'react-use/lib/useWindowSize';
import Confetti from 'react-confetti';

interface ChartFullScreenDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  chartData: any[];
  chartType: 'line' | 'bar';
  title: string;
  description?: string;
  dataKeys: { key: string; name: string; color: string; }[];
  yAxisUnit?: string;
}

const ChartFullScreenDialog: React.FC<ChartFullScreenDialogProps> = ({
  isOpen,
  onOpenChange,
  chartData,
  chartType,
  title,
  description,
  dataKeys,
  yAxisUnit,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [hiddenKeys, setHiddenKeys] = useState<string[]>([]);
  const { width, height } = useWindowSize();

  useEffect(() => {
    if (showConfetti) {
      const timer = setTimeout(() => {
        setShowConfetti(false);
        onOpenChange(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showConfetti, onOpenChange]);

  useEffect(() => {
    if (isOpen) {
      setHiddenKeys([]);
    }
  }, [isOpen, title, dataKeys]);

  const toggleLegendKey = (key: string) => {
    setHiddenKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  const renderInteractiveLegend = ({ payload }: any) => {
    if (!payload?.length) return null;

    return (
      <div className="mb-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
        {payload.map((entry: any) => {
          const key = entry.dataKey;
          const isHidden = hiddenKeys.includes(key);

          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleLegendKey(key)}
              className={`inline-flex items-center gap-2 rounded-md px-2 py-1 transition-opacity ${isHidden ? 'opacity-40' : 'opacity-100'}`}
              title={isHidden ? 'Afficher la série' : 'Masquer la série'}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span>{entry.value}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const handleExportPdf = async () => {
    if (!chartContainerRef.current) {
      toast.error("Impossible de capturer le graphique. Élément non trouvé.");
      return;
    }

    setIsExporting(true);
    toast.loading("Génération du PDF...", { id: 'pdf-export' });

    try {
      const canvas = await html2canvas(chartContainerRef.current, {
        scale: 2,
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${title.replace(/\s/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`);
      toast.success("PDF généré avec succès !", { id: 'pdf-export' });
      setShowConfetti(true);
    } catch (error: any) {
      console.error("Error generating PDF:", error);
      toast.error(`Erreur lors de la génération du PDF : ${error.message}`, { id: 'pdf-export' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      {isOpen && showConfetti && (
        <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={200}
          gravity={0.15}
          initialVelocityX={{ min: -15, max: 15 }}
          initialVelocityY={{ min: -40, max: -80 }}
          tweenDuration={3000}
          confettiSource={{
            x: width / 2,
            y: height / 2,
            w: 0,
            h: 0,
          }}
          style={{ position: 'fixed', top: 0, left: 0, pointerEvents: 'none', zIndex: 9999 }}
        />
      )}
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[90vw] md:max-w-[900px] h-[70vh] flex flex-col p-6 rounded-md shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <div ref={chartContainerRef} className="flex-grow w-full h-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' ? (
                (() => {
                  const hasSecondary = dataKeys.some(k => k.key === 'prixParNuit');
                  return (
                    <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                      <XAxis dataKey="name" className="text-sm text-gray-600 dark:text-gray-400" />
                      <YAxis yAxisId="left" unit={yAxisUnit} className="text-sm text-gray-600 dark:text-gray-400" />
                      {hasSecondary && (
                        <YAxis yAxisId="right" orientation="right" unit={yAxisUnit} className="text-sm text-gray-600 dark:text-gray-400" />
                      )}
                      <Tooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                        formatter={(value: number) => `${value.toFixed(2)}${yAxisUnit || ''}`}
                      />
                      <Legend content={renderInteractiveLegend} />
                      {dataKeys.map((item) => {
                        const axisId = item.key === 'prixParNuit' ? 'right' : 'left';
                        return (
                          <Line
                            key={item.key}
                            type="monotone"
                            dataKey={item.key}
                            stroke={item.color}
                            name={item.name}
                            strokeWidth={3}
                            dot={{ r: 4 }}
                            animationDuration={1500}
                            animationEasing="ease-in-out"
                            yAxisId={hasSecondary ? axisId : 'left'}
                            strokeDasharray={item.key === 'prixParNuit' ? '3 3' : undefined}
                            hide={hiddenKeys.includes(item.key)}
                          />
                        );
                      })}
                    </LineChart>
                  );
                })()
              ) : (
                (() => {
                  const hasSecondary = dataKeys.some(k => k.key === 'prixParNuit');
                  return (
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                      <XAxis dataKey="name" className="text-sm text-gray-600 dark:text-gray-400" />
                      <YAxis yAxisId="left" unit={yAxisUnit} className="text-sm text-gray-600 dark:text-gray-400" />
                      {hasSecondary && (
                        <YAxis yAxisId="right" orientation="right" unit={yAxisUnit} className="text-sm text-gray-600 dark:text-gray-400" />
                      )}
                      <Tooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                        formatter={(value: number) => `${value.toFixed(2)}${yAxisUnit || ''}`}
                      />
                      <Legend content={renderInteractiveLegend} />
                      {dataKeys.map((item) => {
                        const axisId = item.key === 'prixParNuit' ? 'right' : 'left';
                        return (
                          <Bar
                            key={item.key}
                            dataKey={item.key}
                            fill={item.color}
                            name={item.name}
                            animationDuration={1500}
                            animationEasing="ease-in-out"
                            yAxisId={hasSecondary ? axisId : 'left'}
                            hide={hiddenKeys.includes(item.key)}
                          />
                        );
                      })}
                    </BarChart>
                  );
                })()
              )}
            </ResponsiveContainer>
          </div>
          <DialogFooter className="mt-4">
            <Button onClick={handleExportPdf} disabled={isExporting}>
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exportation...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Exporter en PDF
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ChartFullScreenDialog;