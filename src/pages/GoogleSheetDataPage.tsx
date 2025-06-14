import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, FileSpreadsheet } from 'lucide-react';
import { callGSheetProxy } from '@/lib/gsheets';
import { toast } from 'sonner';

const GoogleSheetDataPage: React.FC = () => {
  const [sheetData, setSheetData] = useState<string[][] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSheetData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Request data from column A to DF, for all rows that contain data
        const data = await callGSheetProxy({ action: 'read_sheet', range: 'A:DF' }); 
        console.log("DEBUG (Frontend): Données reçues du proxy Google Sheet:", data);
        setSheetData(data);
        toast.success("Données du Google Sheet chargées !");
      } catch (err: any) {
        setError(`Erreur lors du chargement des données du Google Sheet : ${err.message}`);
        toast.error(`Erreur: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchSheetData();
  }, []);

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Mes Données Google Sheet</h1>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center">
              <FileSpreadsheet className="h-5 w-5 mr-2" />
              Données de votre feuille "COUNTER"
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-gray-500">Chargement des données de votre Google Sheet...</p>
            ) : sheetData && sheetData.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {/* Use the first row of data as headers */}
                      {sheetData[0].map((header, index) => (
                        <TableHead key={index}>{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Render all rows, starting from the second one (index 1) */}
                    {sheetData.slice(1).map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <TableCell key={cellIndex}>{cell}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-gray-500">Aucune donnée trouvée dans votre Google Sheet ou l'onglet spécifié.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default GoogleSheetDataPage;