#!/usr/bin/env node

/**
 * Script para probar la importación secuencial: vehículos primero, luego piezas
 */

console.log('🔄 Script de prueba de importación secuencial iniciado...');

// Simular una importación programada de tipo 'all' para probar la secuencia
const testSchedule = {
  id: 999,
  type: 'all',
  frequency: 'once',
  active: true,
  isFullImport: false,
  startTime: '14:00',
  lastRun: null,
  nextRun: new Date(),
  createdAt: new Date(),
  updatedAt: new Date()
};

console.log('✅ Programación de prueba creada:', testSchedule);
console.log('🚀 En una importación tipo "all", el scheduler debe:');
console.log('   1. Verificar que no hay importaciones en curso');
console.log('   2. Iniciar importación de vehículos');
console.log('   3. Esperar a que termine la importación de vehículos');
console.log('   4. Iniciar importación de piezas');
console.log('   5. Retornar el resultado de la importación de piezas');

export { testSchedule };