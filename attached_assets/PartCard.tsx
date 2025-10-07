import React from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wrench } from "lucide-react";
import { Part } from "@/lib/api";
import { cn, formatPrice, truncateText } from "@/lib/utils";

interface PartCardProps {
  part: Part;
  className?: string;
  hideVehicleLinks?: boolean; // Nueva propiedad para ocultar enlaces a vehículos
  vehicleContextId?: number; // ID del vehículo actual para evitar auto-referencias
}

const PartCard: React.FC<PartCardProps> = ({ part, className, hideVehicleLinks = false, vehicleContextId }) => {
  // Verificar si hay imágenes disponibles
  const hasImages = part.imagenes && part.imagenes.length > 0;

  // Estado de disponibilidad de la pieza
  const isReserved = part.reserva === 1;
  const showBadge = isReserved; // Solo mostrar badge si está reservada
  const stockStatus = "Reservada";
  const badgeClass = "bg-yellow-500";

  return (
    <Card 
      className={cn(
        "overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg", 
        className
      )}
    >
      <div className="relative h-40 overflow-hidden bg-gray-100">
        {hasImages ? (
          <img
            src={part.imagenes[0]}
            alt={part.descripcionArticulo}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-100">
            <Wrench className="h-16 w-16 text-gray-300" />
            <span className="sr-only">Imagen no disponible</span>
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <div className="mb-2">
          <h3 className="text-xl font-montserrat font-bold w-full break-words">
            {part.descripcionArticulo}
          </h3>
          {showBadge && (
            <div className="mt-1">
              <Badge className={cn("text-white px-2 py-1", badgeClass)}>{stockStatus}</Badge>
            </div>
          )}
        </div>
        <div className="mb-3">
          <p className="text-sm text-gray-600 mb-2">
            {part.descripcionFamilia || "Pieza de recambio"}
          </p>
          <p className="text-sm text-gray-700 mb-1">
            <span className="font-medium">Marca:</span> {part.vehicleMarca || part.vehicleInfo?.marca}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-medium">Modelo:</span> {part.vehicleModelo || part.vehicleInfo?.modelo}
          </p>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-primary text-lg font-bold">
            {formatPrice(part.precio || part.precioVenta || 0)}
          </span>
          <Link href={`/piezas/${part.id}`}>
            <Button 
              variant="default" 
              className="bg-secondary hover:bg-secondary/90 text-white"
              size="sm"
            >
              Ver detalle
            </Button>
          </Link>
        </div>
        <div className="mt-3 text-xs text-gray-500">
          <p>Ref: {part.refPrincipal || "N/A"} | Código: {part.codArticulo || "N/A"}</p>
          
          {/* Siempre mostramos información del vehículo compatible, pero sin enlaces si hideVehicleLinks está activo */}
          {part.vehicleInfo ? (
            <div className="mt-1 bg-gray-50 rounded p-1 border border-gray-100">
              <p className="font-medium">Vehículo compatible:</p>
              {hideVehicleLinks || (vehicleContextId && vehicleContextId === part.vehicleInfo.id) ? (
                <span className="text-gray-700 mt-1 block">
                  {`${part.vehicleInfo.marca} ${part.vehicleInfo.modelo}${part.vehicleInfo.version ? ` ${part.vehicleInfo.version}` : ''}`}
                </span>
              ) : (
                <Link href={`/vehiculos/${part.vehicleInfo.id}#top`} className="text-primary hover:underline mt-1 block">
                  {`${part.vehicleInfo.marca} ${part.vehicleInfo.modelo}${part.vehicleInfo.version ? ` ${part.vehicleInfo.version}` : ''}`}
                </Link>
              )}
            </div>
          ) : (part.vehicleMarca || part.vehicleModelo) ? (
            <div className="mt-1 bg-gray-50 rounded p-1 border border-gray-100">
              <p className="font-medium">Vehículo compatible:</p>
              {/* Primero intentamos usar vehicles si está disponible */}
              {part.vehicles && part.vehicles.length > 0 ? (
                hideVehicleLinks || (vehicleContextId && vehicleContextId === part.vehicles[0].id) ? (
                  <span className="text-gray-700 mt-1 block">
                    {`${part.vehicleMarca || part.vehicles[0].marca} ${part.vehicleModelo || part.vehicles[0].modelo}${part.vehicleVersion || (part.vehicles[0].version ? ` ${part.vehicles[0].version}` : '')}`}
                  </span>
                ) : (
                  <Link href={`/vehiculos/${part.vehicles[0].id}#top`} className="text-primary hover:underline mt-1 block">
                    {`${part.vehicleMarca || part.vehicles[0].marca} ${part.vehicleModelo || part.vehicles[0].modelo}${part.vehicleVersion || (part.vehicles[0].version ? ` ${part.vehicles[0].version}` : '')}`}
                  </Link>
                )
              ) : part.vehicleId ? (
                hideVehicleLinks || (vehicleContextId && vehicleContextId === part.vehicleId) ? (
                  <span className="text-gray-700 mt-1 block">
                    {`${part.vehicleMarca} ${part.vehicleModelo}${part.vehicleVersion ? ` ${part.vehicleVersion}` : ''}`}
                  </span>
                ) : (
                  <Link 
                    href={`/vehiculos/${part.vehicleId}#top`} 
                    className="text-primary hover:underline mt-1 block"
                  >
                    {`${part.vehicleMarca} ${part.vehicleModelo}${part.vehicleVersion ? ` ${part.vehicleVersion}` : ''}`}
                  </Link>
                )
              ) : hideVehicleLinks ? (
                <span className="text-gray-700 mt-1 block">
                  {`${part.vehicleMarca} ${part.vehicleModelo}${part.vehicleVersion ? ` ${part.vehicleVersion}` : ''}`}
                </span>
              ) : (
                <Link 
                  href={`/vehiculos?marca=${encodeURIComponent(part.vehicleMarca || '')}&modelo=${encodeURIComponent(part.vehicleModelo || '')}#top`} 
                  className="text-primary hover:underline mt-1 block"
                >
                  {`${part.vehicleMarca} ${part.vehicleModelo}${part.vehicleVersion ? ` ${part.vehicleVersion}` : ''}`}
                </Link>
              )}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};

export default PartCard;