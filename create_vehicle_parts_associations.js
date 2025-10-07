import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function createVehiclePartsAssociations() {
    console.log('🔗 Creando asociaciones entre vehículos y piezas...');
    
    try {
        // Verificar estado actual
        const vehicleCount = await sql`SELECT COUNT(*) as count FROM vehicles WHERE activo = true`;
        const partCount = await sql`SELECT COUNT(*) as count FROM parts WHERE activo = true`;
        const associationCount = await sql`SELECT COUNT(*) as count FROM vehicle_parts`;
        
        console.log(`📊 Estado actual:`);
        console.log(`   Vehículos: ${vehicleCount[0].count}`);
        console.log(`   Piezas: ${partCount[0].count}`);
        console.log(`   Asociaciones: ${associationCount[0].count}`);
        
        // Crear asociaciones basadas en id_vehiculo -> id_local
        console.log('\n🔄 Creando asociaciones vehículo-pieza...');
        
        const result = await sql`
            INSERT INTO vehicle_parts (vehicle_id, part_id, id_vehiculo_original, fecha_creacion)
            SELECT DISTINCT 
                v.id as vehicle_id,
                p.id as part_id,
                p.id_vehiculo as id_vehiculo_original,
                NOW() as fecha_creacion
            FROM parts p
            INNER JOIN vehicles v ON p.id_vehiculo = v.id_local
            WHERE p.activo = true 
            AND v.activo = true
            AND p.id_vehiculo IS NOT NULL
        `;
        
        console.log(`✅ Creadas ${result.length} asociaciones vehículo-pieza`);
        
        // Actualizar contadores de piezas en vehículos
        console.log('\n📈 Actualizando contadores de piezas en vehículos...');
        
        const updateResult = await sql`
            UPDATE vehicles 
            SET 
                active_parts_count = subquery.active_count,
                total_parts_count = subquery.total_count
            FROM (
                SELECT 
                    v.id,
                    COUNT(CASE WHEN p.activo = true THEN 1 END) as active_count,
                    COUNT(p.id) as total_count
                FROM vehicles v
                LEFT JOIN vehicle_parts vp ON v.id = vp.vehicle_id
                LEFT JOIN parts p ON vp.part_id = p.id
                WHERE v.activo = true
                GROUP BY v.id
            ) as subquery
            WHERE vehicles.id = subquery.id
        `;
        
        console.log(`✅ Actualizados contadores para ${updateResult.length} vehículos`);
        
        // Verificar resultado final
        const finalAssociationCount = await sql`SELECT COUNT(*) as count FROM vehicle_parts`;
        const vehiclesWithParts = await sql`
            SELECT COUNT(*) as count 
            FROM vehicles 
            WHERE active_parts_count > 0 AND activo = true
        `;
        
        console.log('\n📊 Resultado final:');
        console.log(`   Asociaciones creadas: ${finalAssociationCount[0].count}`);
        console.log(`   Vehículos con piezas: ${vehiclesWithParts[0].count}`);
        
        console.log('\n✅ Proceso completado exitosamente');
        
    } catch (error) {
        console.error('❌ Error creando asociaciones:', error);
    }
}

createVehiclePartsAssociations();