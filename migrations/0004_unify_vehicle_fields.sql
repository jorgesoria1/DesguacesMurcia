-- Migración para unificar campos de vehículos en la tabla parts
-- Primero añadimos los campos nuevos que faltan

ALTER TABLE parts 
  ADD COLUMN IF NOT EXISTS cod_marca TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS nombre_marca TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cod_modelo TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS nombre_modelo TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS nombre_version TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tipo_version TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS anyo_vehiculo INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS combustible TEXT NOT NULL DEFAULT '';

-- Actualizamos los nuevos campos con la información existente
UPDATE parts
SET 
  cod_marca = cod_familia,
  nombre_marca = CASE 
    WHEN vehicle_marca != '' THEN vehicle_marca
    ELSE descripcion_familia
  END,
  cod_modelo = cod_articulo,
  nombre_modelo = CASE
    WHEN vehicle_modelo != '' THEN vehicle_modelo
    ELSE descripcion_articulo
  END,
  nombre_version = CASE
    WHEN vehicle_version != '' THEN vehicle_version
    ELSE cod_version
  END;

-- No eliminamos los campos antiguos todavía para mantener la compatibilidad
-- hasta que todo el código se actualice