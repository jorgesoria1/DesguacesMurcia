-- Eliminamos los campos antiguos duplicados
ALTER TABLE parts
DROP COLUMN vehicle_marca,
DROP COLUMN vehicle_modelo,
DROP COLUMN vehicle_version,
DROP COLUMN vehicle_anyo;

-- Añadimos un comentario para documentar el cambio
COMMENT ON TABLE parts IS 'Tabla de piezas con información unificada de vehículos';