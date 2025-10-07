import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface ImportStatsProps {
  history: ImportHistory[];
  isLoading: boolean;
}

const ImportStats: React.FC<ImportStatsProps> = ({ history, isLoading }) => {
  // Obtener las estadísticas de las importaciones
  const getStats = () => {
    if (history.length === 0) {
      return {
        vehicles: { total: 0, lastImport: null },
        parts: { total: 0, lastImport: null },
        totalImports: 0,
      };
    }

    let vehicleCount = 0;
    let partsCount = 0;
    let lastVehicleImport: Date | null = null;
    let lastPartImport: Date | null = null;

    history.forEach((item) => {
      const itemDate = new Date(item.endTime || item.startTime);

      if (item.type === "vehicles" || item.type === "all") {
        // Contar vehículos
        if (item.details && item.details.vehicles) {
          vehicleCount += item.details.vehicles.totalItems || 0;
        } else if (item.type === "vehicles") {
          vehicleCount += item.totalItems;
        } else if (item.type === "all" && item.details && item.details.vehicles) {
          vehicleCount += item.details.vehicles.totalItems || 0;
        }

        // Actualizar última importación de vehículos
        if (!lastVehicleImport || itemDate > lastVehicleImport) {
          lastVehicleImport = itemDate;
        }
      }

      if (item.type === "parts" || item.type === "all") {
        // Contar piezas
        if (item.details && item.details.parts) {
          partsCount += item.details.parts.totalItems || 0;
        } else if (item.type === "parts") {
          partsCount += item.totalItems;
        } else if (item.type === "all" && item.details && item.details.parts) {
          partsCount += item.details.parts.totalItems || 0;
        }

        // Actualizar última importación de piezas
        if (!lastPartImport || itemDate > lastPartImport) {
          lastPartImport = itemDate;
        }
      }
    });

    return {
      vehicles: { total: vehicleCount, lastImport: lastVehicleImport },
      parts: { total: partsCount, lastImport: lastPartImport },
      totalImports: history.length,
    };
  };

  const stats = getStats();

  return (
    <>
      <Card className="bg-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-montserrat font-medium">Vehículos</h4>
            {stats.vehicles.lastImport && (
              <span className="text-xs bg-primary text-white py-1 px-2 rounded">
                Última: {formatDateTime(stats.vehicles.lastImport)}
              </span>
            )}
          </div>
          <div className="flex items-center">
            <Car className="h-8 w-8 text-primary mr-3" />
            <div>
              <div className="text-3xl font-bold text-primary">
                {isLoading ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  stats.vehicles.total
                )}
              </div>
              <p className="text-sm text-gray-600">Total de vehículos importados</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-montserrat font-medium">Piezas</h4>
            {stats.parts.lastImport && (
              <span className="text-xs bg-primary text-white py-1 px-2 rounded">
                Última: {formatDateTime(stats.parts.lastImport)}
              </span>
            )}
          </div>
          <div className="flex items-center">
            <Package className="h-8 w-8 text-primary mr-3" />
            <div>
              <div className="text-3xl font-bold text-primary">
                {isLoading ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  stats.parts.total
                )}
              </div>
              <p className="text-sm text-gray-600">Total de piezas importadas</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-montserrat font-medium">Importaciones</h4>
            {history.length > 0 && history[0].endTime && (
              <span className="text-xs bg-primary text-white py-1 px-2 rounded">
                Última: {formatDateTime(history[0].endTime)}
              </span>
            )}
          </div>
          <div className="flex items-center">
            <BarChart3 className="h-8 w-8 text-primary mr-3" />
            <div>
              <div className="text-3xl font-bold text-primary">
                {isLoading ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  stats.totalImports
                )}
              </div>
              <p className="text-sm text-gray-600">Total de importaciones realizadas</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default ImportStats;