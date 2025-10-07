// Script para forzar la ejecución del scheduler
import { exec } from 'child_process';

async function forceSchedulerRun() {
  try {
    console.log('Forzando ejecución del scheduler...');
    
    // Hacer una petición para activar el scheduler
    const response = await fetch('http://localhost:5000/api/import/schedules');
    console.log('Respuesta del scheduler:', response.status);
    
    // Verificar si hay importaciones pendientes
    try {
      const schedules = await response.json();
      console.log('Programaciones encontradas:', schedules);
    } catch (e) {
      console.log('Error al leer respuesta:', e.message);
    }
    
    // Reiniciar el scheduler
    exec('pkill -f "scheduler"', (error, stdout, stderr) => {
      if (error) {
        console.log('No se encontró proceso scheduler para reiniciar');
      } else {
        console.log('Scheduler reiniciado');
      }
    });
    
  } catch (error) {
    console.error('Error al forzar scheduler:', error);
  }
}

forceSchedulerRun();