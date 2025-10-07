import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Configurar conexión a la base de datos
const sql = neon(process.env.DATABASE_URL);

console.log('🔧 Iniciando restauración de datos de vehículo para piezas procesadas...');

async function main() {
  try {
    // 1. Primero, obtener una muestra de piezas con datos incorrectos
    console.log('📊 Analizando piezas con categorías incorrectas como marca...');
    
    const wrongParts = await sql`
      SELECT 
        ref_local,
        vehicle_marca,
        vehicle_modelo,
        descripcion_articulo,
        descripcion_familia
      FROM parts 
      WHERE id_vehiculo < 0 
        AND vehicle_marca IN ('ELECTRICIDAD', 'CARROCERÍA TRASERA', 'INTERIOR', 'SUSPENSIÓN / FRENOS')
      LIMIT 10
    `;
    
    console.log('❌ Piezas con datos incorrectos:', wrongParts.length);
    if (wrongParts.length > 0) {
      console.log('Ejemplo:', wrongParts[0]);
    }
    
    // 2. Obtener una muestra de piezas con datos correctos para comparar
    console.log('\n📊 Analizando piezas con datos correctos...');
    
    const correctParts = await sql`
      SELECT 
        ref_local,
        id_vehiculo,
        vehicle_marca,
        vehicle_modelo,
        descripcion_articulo,
        fecha_creacion
      FROM parts 
      WHERE id_vehiculo < 0 
        AND vehicle_marca IS NOT NULL 
        AND vehicle_marca != ''
        AND vehicle_marca NOT IN ('ELECTRICIDAD', 'CARROCERÍA TRASERA', 'CARROCERÍA LATERALES', 'SUSPENSIÓN / FRENOS', 'INTERIOR', 'DIRECCIÓN / TRANSMISIÓN', 'MOTOR')
      ORDER BY fecha_creacion ASC
      LIMIT 10
    `;
    
    console.log('✅ Piezas con datos correctos:', correctParts.length);
    if (correctParts.length > 0) {
      console.log('Ejemplo:', correctParts[0]);
    }
    
    // 3. Estadísticas generales
    console.log('\n📈 Estadísticas de piezas procesadas:');
    
    const stats = await sql`
      SELECT 
        COUNT(*) as total_processed,
        COUNT(CASE WHEN vehicle_marca IS NOT NULL AND vehicle_marca != '' 
                     AND vehicle_marca NOT IN ('ELECTRICIDAD', 'CARROCERÍA TRASERA', 'CARROCERÍA LATERALES', 'SUSPENSIÓN / FRENOS', 'INTERIOR', 'DIRECCIÓN / TRANSMISIÓN', 'MOTOR') 
                   THEN 1 END) as with_correct_data,
        COUNT(CASE WHEN vehicle_marca IN ('ELECTRICIDAD', 'CARROCERÍA TRASERA', 'CARROCERÍA LATERALES', 'SUSPENSIÓN / FRENOS', 'INTERIOR', 'DIRECCIÓN / TRANSMISIÓN', 'MOTOR') 
                   THEN 1 END) as with_wrong_data
      FROM parts 
      WHERE id_vehiculo < 0
    `;
    
    console.log('Total piezas procesadas:', stats[0].total_processed);
    console.log('Con datos correctos:', stats[0].with_correct_data);
    console.log('Con datos incorrectos:', stats[0].with_wrong_data);
    
    // 4. Verificar si hay piezas que se pueden restaurar mediante lookup de vehículos existentes
    console.log('\n🔍 Verificando posibles restauraciones...');
    
    const possibleRestorations = await sql`
      SELECT 
        p.ref_local,
        p.id_vehiculo,
        p.vehicle_marca as current_marca,
        v.marca as vehicle_marca,
        v.modelo as vehicle_modelo,
        v.version as vehicle_version,
        v.anyo as vehicle_anyo
      FROM parts p
      LEFT JOIN vehicles v ON v.id_local = p.id_vehiculo
      WHERE p.id_vehiculo < 0 
        AND p.vehicle_marca IN ('ELECTRICIDAD', 'CARROCERÍA TRASERA', 'INTERIOR')
        AND v.id IS NOT NULL
      LIMIT 10
    `;
    
    console.log('Piezas que podrían restaurarse desde vehículos existentes:', possibleRestorations.length);
    if (possibleRestorations.length > 0) {
      console.log('Ejemplo de restauración posible:', possibleRestorations[0]);
    }
    
    console.log('\n✅ Análisis completado. Use la información para implementar la corrección en el servicio de importación.');
    
  } catch (error) {
    console.error('❌ Error durante el análisis:', error);
  }
}

main().catch(console.error);