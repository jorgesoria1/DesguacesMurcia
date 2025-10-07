import { neon } from "@neondatabase/serverless";

async function createTestSchedule() {
  const sql = neon(process.env.DATABASE_URL);
  
  // Obtener la hora actual + 1 minuto
  const now = new Date();
  now.setMinutes(now.getMinutes() + 1);
  const startTime = now.toISOString().slice(11, 16); // Format HH:MM
  
  console.log(`Creando programación para ejecutar a las ${startTime}`);
  
  try {
    // Crear la programación
    const result = await sql`
      INSERT INTO import_schedule (type, frequency, is_full_import, active, start_time)
      VALUES ('all', '1h', true, true, ${startTime})
      RETURNING *
    `;
    
    console.log("Programación creada exitosamente:", result[0]);
    return result[0];
  } catch (error) {
    console.error("Error creando programación:", error);
    throw error;
  }
}

createTestSchedule()
  .then(schedule => {
    console.log("✅ Programación creada:", schedule);
    process.exit(0);
  })
  .catch(error => {
    console.error("❌ Error:", error);
    process.exit(1);
  });