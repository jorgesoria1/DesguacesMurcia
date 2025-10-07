
-- Eliminar tabla vehicleParts
DROP TABLE IF EXISTS "vehicle_parts";

-- Añadir columna vehicleLocalId a parts
ALTER TABLE "parts" ADD COLUMN "vehicle_local_id" integer NOT NULL;

-- Crear índice para búsquedas rápidas
CREATE INDEX "idx_parts_vehicle_local_id" ON "parts"("vehicle_local_id");

-- Añadir foreign key
ALTER TABLE "parts" ADD CONSTRAINT "parts_vehicle_local_id_vehicles_id_local_fk" 
  FOREIGN KEY ("vehicle_local_id") REFERENCES "vehicles"("id_local") ON DELETE NO ACTION ON UPDATE NO ACTION;
