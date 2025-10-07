#!/usr/bin/env node

import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

async function testManagerPermissions() {
  console.log('🧪 Probando permisos del usuario gestor...\n');

  try {
    // Crear una sesión
    const agent = axios.create({
      baseURL: BASE_URL,
      withCredentials: true,
      validateStatus: function (status) {
        return status < 500; // No throw error para 4xx
      }
    });

    // 1. Iniciar sesión como gestor
    console.log('🔐 Iniciando sesión como gestor...');
    const loginResponse = await agent.post('/api/login', {
      identifier: 'gestor',
      password: 'gestor123' // Asumiendo esta contraseña
    });

    if (loginResponse.status !== 200) {
      console.log('❌ Error al iniciar sesión:', loginResponse.status, loginResponse.data);
      
      // Si falla, intentar con diferentes contraseñas comunes
      const commonPasswords = ['123456', 'password', 'admin', 'gestor', 'manager'];
      let loginSuccess = false;
      
      for (const pwd of commonPasswords) {
        console.log(`🔍 Probando contraseña: ${pwd}`);
        const testLogin = await agent.post('/api/login', {
          identifier: 'gestor',
          password: pwd
        });
        
        if (testLogin.status === 200) {
          console.log(`✅ Login exitoso con contraseña: ${pwd}`);
          loginSuccess = true;
          break;
        }
      }
      
      if (!loginSuccess) {
        console.log('❌ No se pudo iniciar sesión con ninguna contraseña común');
        return;
      }
    } else {
      console.log('✅ Login exitoso');
    }

    // 2. Obtener lista de pedidos
    console.log('\n📋 Obteniendo lista de pedidos...');
    const ordersResponse = await agent.get('/api/admin/orders');
    
    if (ordersResponse.status !== 200) {
      console.log('❌ Error al obtener pedidos:', ordersResponse.status, ordersResponse.data);
      return;
    }

    const orders = ordersResponse.data;
    console.log(`✅ Obtenidos ${orders.length} pedidos`);

    if (orders.length === 0) {
      console.log('⚠️  No hay pedidos para probar');
      return;
    }

    // 3. Probar cambiar estado de pago del primer pedido
    const testOrder = orders[0];
    console.log(`\n🔄 Probando cambio de estado de pago en pedido ${testOrder.id}...`);
    
    const newPaymentStatus = testOrder.paymentStatus === 'pagado' ? 'pendiente' : 'pagado';
    const paymentResponse = await agent.patch(`/api/admin/orders/${testOrder.id}/payment-status`, {
      paymentStatus: newPaymentStatus
    });

    if (paymentResponse.status === 200) {
      console.log(`✅ Estado de pago cambiado exitosamente a: ${newPaymentStatus}`);
    } else {
      console.log('❌ Error al cambiar estado de pago:', paymentResponse.status, paymentResponse.data);
    }

    // 4. Probar cambiar estado del pedido
    console.log(`\n🔄 Probando cambio de estado del pedido ${testOrder.id}...`);
    
    const validStatuses = ["pendiente_verificar", "verificado", "embalado", "enviado", "incidencia"];
    const currentStatus = testOrder.status;
    const newStatus = validStatuses.find(s => s !== currentStatus) || "verificado";
    
    const statusResponse = await agent.patch(`/api/admin/orders/${testOrder.id}/status`, {
      status: newStatus
    });

    if (statusResponse.status === 200) {
      console.log(`✅ Estado del pedido cambiado exitosamente a: ${newStatus}`);
    } else {
      console.log('❌ Error al cambiar estado del pedido:', statusResponse.status, statusResponse.data);
    }

    // 5. Verificar acceso a otros endpoints de gestión
    console.log('\n🔍 Verificando acceso a otros endpoints...');
    
    const endpoints = [
      { name: 'Admin Dashboard', path: '/api/admin/orders/trash' },
      { name: 'Order Details', path: `/api/admin/orders/${testOrder.id}` }
    ];

    for (const endpoint of endpoints) {
      const response = await agent.get(endpoint.path);
      if (response.status === 200) {
        console.log(`✅ ${endpoint.name}: Acceso permitido`);
      } else {
        console.log(`❌ ${endpoint.name}: Acceso denegado (${response.status})`);
      }
    }

    console.log('\n🎉 Pruebas de permisos completadas');

  } catch (error) {
    console.error('❌ Error durante las pruebas:', error.message);
  }
}

testManagerPermissions();