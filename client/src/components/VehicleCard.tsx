import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Car, Eye } from "lucide-react";
import { Vehicle, partsApi } from "@/lib/api";
import { cn, getFuelType } from "@/lib/utils";
import { createVehicleUrl } from "@shared/utils";
import { scrollToTop } from "@/hooks/useScrollToTop";
import OptimizedImage from "@/components/OptimizedImage";

interface VehicleCardProps {
  vehicle: Vehicle;
  className?: string;
  partCount?: number; // Opcional para permitir usar el componente sin contar piezas
  gridIndex?: number; // Índice para priorización automática
}

const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle, className, partCount: propsPartCount, gridIndex }) => {
  const [, setLocation] = useLocation();
  
  // Verificar que el vehículo existe
  if (!vehicle) {
    return null;
  }

  // Usar el conteo que viene en el vehículo, probando diferentes campos posibles
  const partCount = vehicle.activeParts || vehicle.active_parts_count || propsPartCount || 0;

  // Obtener la primera imagen o mostrar un fallback visual
  const hasImages = vehicle && vehicle.imagenes && Array.isArray(vehicle.imagenes) && vehicle.imagenes.length > 0;
  const firstImage = hasImages ? vehicle.imagenes[0] : null;

  // Generar un título para el vehículo basado en los datos disponibles
  const getVehicleTitle = () => {
    // Verificar que el vehículo existe y tiene las propiedades básicas
    if (!vehicle) return 'Vehículo';

    // Si hay descripción y no es solo un número, usarla
    if (vehicle.descripcion && 
        vehicle.descripcion.trim() !== '' && 
        isNaN(Number(vehicle.descripcion.trim()))) {
      return vehicle.descripcion;
    }

    const parts = [];
    if (vehicle.marca && vehicle.marca !== 'N/A' && vehicle.marca.trim() !== '') {
      parts.push(vehicle.marca);
    }
    if (vehicle.modelo && vehicle.modelo !== 'N/A' && vehicle.modelo.trim() !== '') {
      parts.push(vehicle.modelo);
    }
    if (vehicle.version && vehicle.version !== 'N/A' && vehicle.version.trim() !== '') {
      parts.push(vehicle.version);
    }
    if (vehicle.anyo && vehicle.anyo > 0) {
      parts.push(vehicle.anyo.toString());
    }

    return parts.length > 0 ? parts.join(' ') : `Vehículo ${vehicle.id || 'Sin ID'}`;
  };

  const handleViewDetails = () => {
    const vehicleUrl = createVehicleUrl({
      id: vehicle.id,
      marca: vehicle.marca,
      modelo: vehicle.modelo,
      anyo: vehicle.anyo
    });
    setLocation(vehicleUrl);
    // Usar función global de scroll
    scrollToTop(true);
  };

  return (
    <Card 
      className={cn("h-full flex flex-col cursor-pointer hover:shadow-lg transition-shadow duration-200 overflow-hidden group", className)}
      onClick={(e) => {
        // Only handle card click if it's not from a link or button
        if (e.target instanceof HTMLElement && !e.target.closest('a, button')) {
          handleViewDetails();
        }
      }}
    >
      <div className="relative h-48 overflow-hidden bg-gray-100">
        {firstImage ? (
          <OptimizedImage
            src={firstImage}
            alt={getVehicleTitle()}
            className="h-full group-hover:scale-110 transition-transform duration-300"
            fallbackIcon={<Car className="h-24 w-24 text-gray-300" />}
            gridIndex={gridIndex} // Priorización automática por posición
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-100">
            <Car className="h-24 w-24 text-gray-300" />
            <span className="sr-only">Imagen no disponible</span>
          </div>
        )}
      </div>

      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-base sm:text-lg font-bold line-clamp-2 min-h-[2rem] leading-tight text-primary">
          {getVehicleTitle()}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-between p-3 pt-0">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            {vehicle.combustible && (
              <Badge variant="outline" className="text-xs truncate max-w-[70%]">
                {getFuelType(vehicle.combustible || '')}
              </Badge>
            )}
            <p className="text-xs text-gray-500">
              ID: {vehicle.id}
            </p>
          </div>
        </div>

        {/* Información compacta del vehículo */}
        <div className="mt-2 space-y-1.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
            <div className="bg-blue-50 px-2 py-1 rounded-md text-xs truncate">
              <span className="font-medium text-blue-800">Marca:</span> 
              <span className="text-blue-700 ml-1">{vehicle.marca || 'N/A'}</span>
            </div>
            <div className="bg-green-50 px-2 py-1 rounded-md text-xs truncate">
              <span className="font-medium text-green-800">Modelo:</span> 
              <span className="text-green-700 ml-1">{vehicle.modelo || 'N/A'}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
            <div className="bg-yellow-50 px-2 py-1 rounded-md text-xs truncate">
              <span className="font-medium text-yellow-800">Año:</span> 
              <span className="text-yellow-700 ml-1">{vehicle.anyo > 0 ? vehicle.anyo : 'N/A'}</span>
            </div>
            {vehicle.potencia > 0 && (
              <div className="bg-purple-50 px-2 py-1 rounded-md text-xs truncate">
                <span className="font-medium text-purple-800">Potencia:</span> 
                <span className="text-purple-700 ml-1">{vehicle.potencia} CV</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="text-center">
            <span className="text-sm font-medium text-gray-700">
              {partCount} {partCount === 1 ? 'pieza disponible' : 'piezas disponibles'}
            </span>
          </div>
          
          <Link href={createVehicleUrl({
            id: vehicle.id,
            marca: vehicle.marca,
            modelo: vehicle.modelo,
            anyo: vehicle.anyo
          })} onClick={(e) => e.stopPropagation()}>
            <Button
              variant="default"
              className="w-full bg-primary hover:bg-secondary text-white font-medium"
              size="sm"
            >
              <Eye className="mr-2 h-4 w-4" />
              Ver piezas
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default VehicleCard;