-- Migración para añadir datos de vehículo a piezas
-- Primero, añadimos las columnas si no existen
DO $$ 
BEGIN
    -- Verificar y añadir columnas para datos de vehículo
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parts' AND column_name = 'vehicle_marca') THEN
        ALTER TABLE parts ADD COLUMN vehicle_marca TEXT NOT NULL DEFAULT '';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parts' AND column_name = 'vehicle_modelo') THEN
        ALTER TABLE parts ADD COLUMN vehicle_modelo TEXT NOT NULL DEFAULT '';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parts' AND column_name = 'vehicle_version') THEN
        ALTER TABLE parts ADD COLUMN vehicle_version TEXT NOT NULL DEFAULT '';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parts' AND column_name = 'vehicle_anyo') THEN
        ALTER TABLE parts ADD COLUMN vehicle_anyo INTEGER NOT NULL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parts' AND column_name = 'related_vehicles_count') THEN
        ALTER TABLE parts ADD COLUMN related_vehicles_count INTEGER NOT NULL DEFAULT 0;
    END IF;
    
    -- Crear la tabla vehicle_parts si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vehicle_parts') THEN
        CREATE TABLE vehicle_parts (
            id SERIAL PRIMARY KEY,
            vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
            part_id INTEGER NOT NULL REFERENCES parts(id),
            id_vehiculo_original INTEGER NOT NULL,
            fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX idx_vehicle_parts_vehicle_id ON vehicle_parts(vehicle_id);
        CREATE INDEX idx_vehicle_parts_part_id ON vehicle_parts(part_id);
        CREATE UNIQUE INDEX idx_vehicle_parts_unique ON vehicle_parts(vehicle_id, part_id);
    END IF;
END $$;

-- Actualizar los datos de vehículo en las piezas existentes
-- Esta operación puede ser lenta, si la tabla es muy grande se recomienda hacerlo por lotes
UPDATE parts p
SET 
    vehicle_marca = v.marca,
    vehicle_modelo = v.modelo,
    vehicle_version = v.version,
    vehicle_anyo = v.anyo
FROM vehicles v
WHERE p.id_vehiculo = v.id_local;

-- Actualizar el contador de vehículos relacionados
-- Primero creamos la tabla de relaciones si está vacía
INSERT INTO vehicle_parts (vehicle_id, part_id, id_vehiculo_original)
SELECT 
    v.id,
    p.id,
    v.id_local
FROM 
    parts p
JOIN 
    vehicles v ON p.id_vehiculo = v.id_local
WHERE 
    NOT EXISTS (
        SELECT 1 
        FROM vehicle_parts vp 
        WHERE vp.vehicle_id = v.id AND vp.part_id = p.id
    );

-- Actualizar el contador de vehículos relacionados en cada pieza
UPDATE parts p
SET related_vehicles_count = (
    SELECT COUNT(*) 
    FROM vehicle_parts vp 
    WHERE vp.part_id = p.id
);

-- Crear índices para optimizar consultas de filtrado
CREATE INDEX IF NOT EXISTS idx_parts_vehicle_marca ON parts(vehicle_marca);
CREATE INDEX IF NOT EXISTS idx_parts_vehicle_modelo ON parts(vehicle_modelo);
CREATE INDEX IF NOT EXISTS idx_parts_vehicle_version ON parts(vehicle_version);
CREATE INDEX IF NOT EXISTS idx_parts_vehicle_anyo ON parts(vehicle_anyo);
CREATE INDEX IF NOT EXISTS idx_parts_related_vehicles_count ON parts(related_vehicles_count);