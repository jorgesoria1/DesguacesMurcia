import React from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Eye, Car, Wrench } from "lucide-react";
import { useLocation } from "wouter";
import { useCart } from "@/components/cart/CartContext";
import { getVehicleInfoFromPart, getVehicleLinkProps } from "@/lib/vehicleUtils";
import { formatPrice } from "@/lib/utils";
import { createPartUrl, createVehicleUrl } from "@shared/utils";
import { scrollToTop } from "@/hooks/useScrollToTop";
import OptimizedImage from "@/components/OptimizedImage";

interface Part {
  id: number;
  refLocal: string;
  refPrincipal: string;
  descripcionArticulo: string;
  descripcionFamilia?: string;
  precio: string | number;
  imagenes?: string[];
  activo: boolean;
  stock?: number;
  vehicleMarca?: string;
  vehicleModelo?: string;
  vehicleVersion?: string;
  vehicleAnyo?: string | number;
  vehicleCombustible?: string;
  vehicles?: Array<{
    id: number;
    marca: string;
    modelo: string;
    version?: string;
    anyo?: string | number;
    combustible?: string;
  }>;
  vehicleId?: number;
  idVehiculo?: number; // ID del vehículo desde la API de Metasync
}

interface PartCardProps {
  part: Part;
  hideVehicleLinks?: boolean;
  vehicleContextId?: number;
  className?: string;
  gridIndex?: number; // Índice para priorización automática
}

const PartCard: React.FC<PartCardProps> = ({ part, hideVehicleLinks, vehicleContextId, className, gridIndex }) => {
  const [, setLocation] = useLocation();
  const { addToCart } = useCart();

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await addToCart(part.id, 1, part);
  };

  const handleViewDetails = () => {
    const partUrl = createPartUrl({
      id: part.id,
      descripcionArticulo: part.descripcionArticulo,
      vehicleMarca: part.vehicleMarca || '',
      vehicleModelo: part.vehicleModelo || ''
    });
    setLocation(partUrl);
    // Usar función global de scroll
    scrollToTop(true);
  };

  const formatPriceDisplay = (price: string | number) => {
    const priceStr = typeof price === 'number' ? price.toString() : price;
    const numericPrice = parseFloat(priceStr.replace(',', '.'));
    return isNaN(numericPrice) ? 'Consultar precio' : formatPrice(numericPrice);
  };

  const mainImage = part.imagenes && part.imagenes.length > 0 ? part.imagenes[0] : null;

  return (
    <Card 
      className={`h-full flex flex-col cursor-pointer hover:shadow-lg transition-shadow duration-200 overflow-hidden group ${className || ''}`}
      onClick={(e) => {
        // Only handle card click if it's not from a link or button
        if (e.target instanceof HTMLElement && !e.target.closest('a, button')) {
          handleViewDetails();
        }
      }}
    >
      <div className="relative h-48 overflow-hidden bg-gray-100">
        {mainImage ? (
          <OptimizedImage
            src={mainImage}
            alt={part.descripcionArticulo}
            className="w-full h-full group-hover:scale-110 transition-transform duration-300"
            gridIndex={gridIndex} // Priorización automática por posición
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-100">
            <Wrench className="h-24 w-24 text-gray-300" />
            <span className="sr-only">Imagen no disponible</span>
          </div>
        )}
      </div>

      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-base sm:text-lg font-semibold line-clamp-2 min-h-[2rem] leading-tight text-primary">
          {part.descripcionArticulo}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-between p-3 pt-0">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs truncate max-w-[70%]">
              {part.descripcionFamilia}
            </Badge>
            <p className="text-xs text-gray-500">
              Ref: {part.refLocal}
            </p>
          </div>
        </div>

        {/* Información de marca, modelo, año y combustible compacta */}
        <div className="mt-2 space-y-1.5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs">
            <div className="bg-blue-50 px-2 py-1 rounded-md text-xs truncate">
              <span className="font-medium text-blue-800">Marca:</span> 
              <span className="text-blue-700 ml-1">{part.vehicleMarca || 'N/A'}</span>
            </div>
            <div className="bg-green-50 px-2 py-1 rounded-md text-xs truncate">
              <span className="font-medium text-green-800">Modelo:</span> 
              <span className="text-green-700 ml-1">{part.vehicleModelo || 'N/A'}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs">
            <div className="bg-orange-50 px-2 py-1 rounded-md text-xs truncate">
              <span className="font-medium text-orange-800">Año:</span> 
              <span className="text-orange-700 ml-1">
                {part.vehicleAnyo || (part.vehicles && part.vehicles[0]?.anyo) || 'N/A'}
              </span>
            </div>
            <div className="bg-purple-50 px-2 py-1 rounded-md text-xs truncate">
              <span className="font-medium text-purple-800">Combustible:</span> 
              <span className="text-purple-700 ml-1">
                {part.vehicleCombustible || (part.vehicles && part.vehicles[0]?.combustible) || 'Sin información'}
              </span>
            </div>
          </div>
        </div>

        {/* Información del vehículo compatible */}
        {(() => {
          // Intentar obtener ID del vehículo de múltiples fuentes
          let vehicleId = null;
          let vehicleText = "";
          let isProcessedVehicle = false;
          
          // Verificar si es un vehículo procesado (ID negativo)
          if (part.idVehiculo && part.idVehiculo < 0) {
            isProcessedVehicle = true;
          }
          
          // Prioridad 1: vehicles array
          if (part.vehicles && part.vehicles.length > 0) {
            const vehicle = part.vehicles[0];
            vehicleId = vehicle.id;
            vehicleText = `${vehicle.marca} ${vehicle.modelo}${vehicle.version ? ` ${vehicle.version}` : ''}${vehicle.anyo ? ` (${vehicle.anyo})` : ''}`;
          }
          // Prioridad 2: vehicleId directo (solo si no es procesado)
          else if (part.vehicleId && !isProcessedVehicle && (part.vehicleMarca || part.vehicleModelo)) {
            vehicleId = part.vehicleId;
            vehicleText = `${part.vehicleMarca || ''} ${part.vehicleModelo || ''}${part.vehicleVersion ? ` ${part.vehicleVersion}` : ''}${part.vehicleAnyo ? ` (${part.vehicleAnyo})` : ''}`.trim();
          }
          // Prioridad 3: idVehiculo desde MetaSync API (solo si no es procesado)
          else if (part.idVehiculo && !isProcessedVehicle && (part.vehicleMarca || part.vehicleModelo)) {
            vehicleId = part.idVehiculo;
            vehicleText = `${part.vehicleMarca || ''} ${part.vehicleModelo || ''}${part.vehicleVersion ? ` ${part.vehicleVersion}` : ''}${part.vehicleAnyo ? ` (${part.vehicleAnyo})` : ''}`.trim();
          }
          // Prioridad 4: campos individuales de vehículo sin ID (vehículos procesados)
          else if (part.vehicleMarca || part.vehicleModelo) {
            vehicleText = `${part.vehicleMarca || ''} ${part.vehicleModelo || ''}${part.vehicleVersion ? ` ${part.vehicleVersion}` : ''}${part.vehicleAnyo ? ` (${part.vehicleAnyo})` : ''}`.trim();
          }

          return vehicleText ? (
            <div className="mt-1 bg-gray-50 rounded p-1.5 border border-gray-200">
              <p className="font-medium text-xs mb-1 text-gray-600">
                {isProcessedVehicle ? '🔧 Compatible con:' : <span className="flex items-center gap-1"><Car className="w-3 h-3 text-blue-900" />Vehículo compatible:</span>}
              </p>
              {vehicleId && !isProcessedVehicle ? (
                <Link 
                  to={createVehicleUrl({
                    id: vehicleId,
                    marca: part.vehicleMarca || '',
                    modelo: part.vehicleModelo || '',
                    anyo: part.vehicleAnyo ? Number(part.vehicleAnyo) : undefined
                  })}
                  className="text-primary hover:underline text-sm block font-medium text-left"
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log(`🔗 Navegando al vehículo ID: ${vehicleId}, URL generada:`, createVehicleUrl({
                      id: vehicleId,
                      marca: part.vehicleMarca || '',
                      modelo: part.vehicleModelo || '',
                      anyo: part.vehicleAnyo ? Number(part.vehicleAnyo) : undefined
                    }));
                    // Always scroll to top when clicking vehicle links for visual feedback
                    setTimeout(() => {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }, 100);
                  }}
                >
                  {vehicleText}
                </Link>
              ) : (
                <span className="text-gray-800 text-sm font-medium block">
                  {vehicleText}
                  {isProcessedVehicle && (
                    <span className="text-xs text-gray-500 block mt-0.5">
                      (Vehículo procesado)
                    </span>
                  )}
                </span>
              )}
            </div>
          ) : null;
        })()}

        <div className="mt-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-red-800">
              {formatPriceDisplay(part.precio)}
            </span>
            {part.stock !== undefined && (
              <Badge variant={part.stock > 0 ? "default" : "destructive"} className="text-xs">
                {part.stock > 0 ? `Stock: ${part.stock}` : 'Sin stock'}
              </Badge>
            )}
          </div>

          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 hover:bg-blue-900 hover:text-white hover:border-blue-900"
              onClick={handleViewDetails}
            >
              <Eye className="h-4 w-4 mr-1" />
              Ver
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-secondary hover:bg-blue-900 hover:text-white text-white"
              onClick={handleAddToCart}
              disabled={part.stock === 0}
            >
              <ShoppingCart className="h-4 w-4 mr-1" />
              Añadir
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PartCard;