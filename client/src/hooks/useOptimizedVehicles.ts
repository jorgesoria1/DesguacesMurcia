import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface UseVehiclesParams {
  limit?: number;
  offset?: number;
  marca?: string;
  modelo?: string;
  anyo?: number;
  withPartCounts?: boolean;
}

export function useOptimizedVehicles({
  limit = 20,
  offset = 0,
  marca,
  modelo,
  anyo,
  withPartCounts = false,
}: UseVehiclesParams = {}) {
  // Construir query parameters
  const params = new URLSearchParams();
  params.append("limit", limit.toString());
  params.append("offset", offset.toString());
  
  if (marca) params.append("marca", marca);
  if (modelo) params.append("modelo", modelo);
  if (anyo) params.append("anyo", anyo.toString());
  if (withPartCounts) params.append("withPartCounts", 'true');
  
  return useQuery({
    queryKey: ['/api/optimized/vehicles', limit, offset, marca, modelo, anyo, withPartCounts],
    queryFn: async () => {
      const response = await apiRequest(
        "GET", 
        `/api/optimized/vehicles?${params.toString()}`
      );
      return response.json();
    },
    staleTime: 30000, // Cache 30 segundos para mejorar rendimiento
  });
}

interface UseVehiclePartsParams {
  vehicleId: number;
  limit?: number;
  offset?: number;
  soloActivas?: boolean;
}

export function useOptimizedVehicleParts({
  vehicleId,
  limit = 100,
  offset = 0,
  soloActivas = true,
}: UseVehiclePartsParams) {
  // Construir query parameters
  const params = new URLSearchParams();
  params.append("limit", limit.toString());
  params.append("offset", offset.toString());
  
  if (soloActivas) params.append("activo", 'true');
  
  return useQuery({
    queryKey: ['/api/optimized/vehicles/parts', vehicleId, limit, offset, soloActivas],
    queryFn: async () => {
      const response = await apiRequest(
        "GET", 
        `/api/optimized/vehicles/${vehicleId}/parts?${params.toString()}`
      );
      return response.json();
    },
    enabled: Boolean(vehicleId),
    staleTime: 30000, // Cache 30 segundos para mejorar rendimiento
  });
}

interface UseOptimizedPartsParams {
  limit?: number;
  offset?: number;
  vehicleId?: number;
  marca?: string;
  modelo?: string;
  familia?: string;
  activo?: boolean;
}

export function useOptimizedParts({
  limit = 20,
  offset = 0,
  vehicleId,
  marca,
  modelo,
  familia,
  activo,
}: UseOptimizedPartsParams = {}) {
  // Construir query parameters
  const params = new URLSearchParams();
  params.append("limit", limit.toString());
  params.append("offset", offset.toString());
  
  if (vehicleId) params.append("vehicleId", vehicleId.toString());
  if (marca) params.append("marca", marca);
  if (modelo) params.append("modelo", modelo);
  if (familia) params.append("familia", familia);
  if (activo !== undefined) params.append("activo", activo.toString());
  
  return useQuery({
    queryKey: ['/api/optimized/parts', limit, offset, vehicleId, marca, modelo, familia, activo],
    queryFn: async () => {
      const response = await apiRequest(
        "GET", 
        `/api/optimized/parts?${params.toString()}`
      );
      return response.json();
    },
    staleTime: 60000, // Cache 1 minuto
    cacheTime: 3600000, // Cache en memoria 1 hora
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    suspense: true
  });
}