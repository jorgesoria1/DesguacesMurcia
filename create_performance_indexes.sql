-- Performance optimization indexes for faster part and vehicle detail page loading
-- These indexes will dramatically improve query performance

-- Parts table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_parts_activo ON parts(activo);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_parts_id_activo ON parts(id, activo);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_parts_precio ON parts(precio) WHERE precio IS NOT NULL AND precio != '' AND precio != '0';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_parts_vehicle_marca_modelo ON parts(vehicle_marca, vehicle_modelo) WHERE vehicle_marca IS NOT NULL AND vehicle_modelo IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_parts_descripcion_familia ON parts(descripcion_familia);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_parts_fecha_actualizacion ON parts(fecha_actualizacion DESC);

-- Vehicles table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_activo ON vehicles(activo);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_id_activo ON vehicles(id, activo);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_marca_modelo ON vehicles(marca, modelo);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_fecha_actualizacion ON vehicles(fecha_actualizacion DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_anyo ON vehicles(anyo);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_combustible ON vehicles(combustible) WHERE combustible IS NOT NULL AND combustible != '';

-- Vehicle_parts relationship indexes (critical for performance)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicle_parts_vehicle_id ON vehicle_parts(vehicle_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicle_parts_part_id ON vehicle_parts(part_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicle_parts_composite ON vehicle_parts(vehicle_id, part_id);

-- Additional performance indexes for search operations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_parts_descripcion_gin ON parts USING gin(to_tsvector('spanish', descripcion_articulo));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_descripcion_gin ON vehicles USING gin(to_tsvector('spanish', descripcion));

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_parts_activo_familia ON parts(activo, descripcion_familia) WHERE activo = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_activo_marca ON vehicles(activo, marca) WHERE activo = true;

-- Statistics update for better query planning
ANALYZE parts;
ANALYZE vehicles;
ANALYZE vehicle_parts;

-- Display index creation completion
SELECT 'Performance indexes created successfully' as status;