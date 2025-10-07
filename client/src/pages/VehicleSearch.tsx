import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import VehicleCard from "@/components/VehicleCard";
import { vehiclesApi } from "@/lib/api";

const VehicleSearch: React.FC = () => {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const idLocal = searchParams.get("idLocal");

  // Consulta para buscar un vehículo específico por idLocal
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['/api/vehicles/search', idLocal],
    queryFn: async () => {
      if (!idLocal) return { data: [] };
      return vehiclesApi.getVehicles({ idLocal: parseInt(idLocal) });
    },
    enabled: !!idLocal,
  });

  // Si solo hay un resultado, redirigir a la página de detalle de ese vehículo
  useEffect(() => {
    if (data?.data && data.data.length === 1) {
      setLocation(`/vehiculos/${data.data[0].id}`);
    }
  }, [data, setLocation]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-montserrat font-bold mb-2">Búsqueda de Vehículos</h1>
        <p className="text-muted-foreground">
          {idLocal 
            ? `Buscando vehículo compatible con ID: ${idLocal}` 
            : "Ingrese un ID de vehículo para buscar"}
        </p>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Buscando vehículo...</span>
        </div>
      )}

      {isError && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <p className="text-red-600">Error al buscar el vehículo: {(error as Error).message}</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && data?.data && (
        <div>
          {data.data.length === 0 ? (
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="pt-6">
                <p className="text-yellow-600">No se encontraron vehículos con ID: {idLocal}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.data.map((vehicle) => (
                <VehicleCard key={vehicle.id} vehicle={vehicle} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VehicleSearch;