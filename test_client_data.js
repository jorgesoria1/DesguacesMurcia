#!/usr/bin/env node

/**
 * Script para probar datos de clientes y diagnosticar problemas en el modal
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function testClientData() {
  try {
    console.log('🔍 Probando datos de clientes...\n');

    // Ejecutar la misma consulta que usa el endpoint
    const result = await sql`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.first_name as "firstName",
        u.last_name as "lastName",
        u.address,
        u.city,
        u.postal_code as "postalCode",
        u.phone,
        u.province,
        u.shipping_address as "shippingAddress",
        u.shipping_city as "shippingCity",
        u.shipping_postal_code as "shippingPostalCode",
        u.shipping_province as "shippingProvince",
        u.billing_address as "billingAddress",
        u.billing_city as "billingCity",
        u.billing_postal_code as "billingPostalCode",
        u.billing_province as "billingProvince",
        u.role,
        u.created_at as "createdAt",
        u.updated_at as "updatedAt",
        COALESCE(o.order_count, 0) as "totalOrders",
        COALESCE(o.total_spent, 0) as "totalSpent",
        o.last_order_date as "lastOrderDate"
      FROM users u
      LEFT JOIN (
        SELECT 
          user_id,
          COUNT(*) as order_count,
          MAX(created_at) as last_order_date,
          SUM(total) as total_spent
        FROM orders
        WHERE is_deleted = false
        GROUP BY user_id
      ) o ON u.id = o.user_id
      WHERE u.role = 'customer'
      ORDER BY u.created_at DESC
      LIMIT 1
    `;

    if (result.length === 0) {
      console.log('❌ No se encontraron clientes');
      return;
    }

    const client = result[0];
    console.log('✅ Cliente encontrado:');
    console.log('📋 Datos completos:', JSON.stringify(client, null, 2));
    
    console.log('\n🔍 Análisis de campos específicos:');
    console.log(`- ID: ${client.id}`);
    console.log(`- Username: ${client.username}`);
    console.log(`- Email: ${client.email}`);
    console.log(`- Nombre completo: ${client.firstName} ${client.lastName}`);
    console.log(`- Total pedidos: ${client.totalOrders} (tipo: ${typeof client.totalOrders})`);
    console.log(`- Total gastado: ${client.totalSpent} (tipo: ${typeof client.totalSpent})`);
    console.log(`- Última compra: ${client.lastOrderDate}`);
    console.log(`- Fecha creación: ${client.createdAt} (tipo: ${typeof client.createdAt})`);
    console.log(`- Fecha actualización: ${client.updatedAt} (tipo: ${typeof client.updatedAt})`);
    
    console.log('\n📍 Direcciones:');
    console.log(`- Dirección principal: ${client.address || 'No especificada'}`);
    console.log(`- Ciudad principal: ${client.city || 'No especificada'}`);
    console.log(`- Dirección envío: ${client.shippingAddress || 'No especificada'}`);
    console.log(`- Ciudad envío: ${client.shippingCity || 'No especificada'}`);
    console.log(`- Dirección facturación: ${client.billingAddress || 'No especificada'}`);
    console.log(`- Ciudad facturación: ${client.billingCity || 'No especificada'}`);

    // Probar conversión de fechas
    console.log('\n📅 Pruebas de conversión de fechas:');
    try {
      const createdDate = new Date(client.createdAt);
      console.log(`- Fecha creación convertida: ${createdDate.toLocaleDateString('es-ES')}`);
    } catch (e) {
      console.log(`- Error convirtiendo fecha creación: ${e.message}`);
    }
    
    try {
      const updatedDate = new Date(client.updatedAt);
      console.log(`- Fecha actualización convertida: ${updatedDate.toLocaleDateString('es-ES')}`);
    } catch (e) {
      console.log(`- Error convirtiendo fecha actualización: ${e.message}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testClientData().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});