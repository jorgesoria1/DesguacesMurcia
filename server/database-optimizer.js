/**
 * OPTIMIZADOR DE BASE DE DATOS - EMERGENCY PERFORMANCE FIX
 * Target: Reducir server response time de 756ms identificado en PageSpeed
 */

const { Pool } = require('pg');

// Cache de consultas en memoria para reducir hits DB
const queryCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Interceptor de consultas con cache
const cacheQuery = async (pool, query, params, cacheKey, ttl = CACHE_TTL) => {
  // Verificar cache primero
  const cached = queryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.result;
  }
  
  try {
    // Ejecutar consulta
    const result = await pool.query(query, params);
    
    // Guardar en cache
    queryCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });
    
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Optimizar consulta de vehículo individual (página VehicleDetail)
const getOptimizedVehicle = async (pool, vehicleId) => {
  const cacheKey = `vehicle:${vehicleId}`;
  
  const query = `
    SELECT 
      v.*,
      (SELECT COUNT(*) FROM parts p 
       WHERE p.vehicle_marca = v.marca 
       AND p.vehicle_modelo = v.modelo 
       AND p.activo = true) as parts_count
    FROM vehicles v 
    WHERE v.id = $1 AND v.activo = true
  `;
  
  return await cacheQuery(pool, query, [vehicleId], cacheKey);
};

// Optimizar consulta de piezas de vehículo con LIMIT
const getOptimizedVehicleParts = async (pool, marca, modelo, limit = 20, offset = 0) => {
  const cacheKey = `parts:${marca}:${modelo}:${limit}:${offset}`;
  
  const query = `
    SELECT 
      p.id, p.descripcion_articulo, p.precio, p.imagen_principal,
      p.ref_principal, p.cod_articulo, p.descripcion_familia
    FROM parts p
    WHERE p.vehicle_marca = $1 
    AND p.vehicle_modelo = $2 
    AND p.activo = true
    AND p.precio IS NOT NULL 
    AND p.precio != ''
    ORDER BY p.fecha_actualizacion DESC
    LIMIT $3 OFFSET $4
  `;
  
  return await cacheQuery(pool, query, [marca, modelo, limit, offset], cacheKey);
};

// Preparar statements para consultas frecuentes
const prepareStatements = async (pool) => {
  const statements = [
    {
      name: 'get_vehicle_by_id',
      text: `
        SELECT v.*, 
               (SELECT COUNT(*) FROM parts p 
                WHERE p.vehicle_marca = v.marca 
                AND p.vehicle_modelo = v.modelo 
                AND p.activo = true) as parts_count
        FROM vehicles v 
        WHERE v.id = $1 AND v.activo = true
      `
    },
    {
      name: 'get_vehicle_parts',
      text: `
        SELECT p.id, p.descripcion_articulo, p.precio, p.imagen_principal
        FROM parts p
        WHERE p.vehicle_marca = $1 
        AND p.vehicle_modelo = $2 
        AND p.activo = true
        ORDER BY p.fecha_actualizacion DESC
        LIMIT $3
      `
    }
  ];
  
  for (const stmt of statements) {
    try {
      await pool.query(`PREPARE ${stmt.name} AS ${stmt.text}`);
      console.log(`✅ Prepared statement: ${stmt.name}`);
    } catch (error) {
      console.warn(`Warning: Could not prepare ${stmt.name}:`, error.message);
    }
  }
};

// Limpiar cache periódicamente
const cleanCache = () => {
  const now = Date.now();
  const maxAge = 10 * 60 * 1000; // 10 minutos
  
  for (const [key, value] of queryCache.entries()) {
    if (now - value.timestamp > maxAge) {
      queryCache.delete(key);
    }
  }
};

// Pool de conexiones optimizado
const createOptimizedPool = (connectionString) => {
  return new Pool({
    connectionString,
    max: 20, // Máximo 20 conexiones
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    // Optimizaciones de rendimiento
    query_timeout: 5000, // Timeout de 5s por query
    statement_timeout: 5000
  });
};

// Inicializar optimizaciones de DB
const initDatabaseOptimizations = async (pool) => {
  console.log('🚀 Initializing database performance optimizations...');
  
  try {
    // Preparar statements
    await prepareStatements(pool);
    
    // Configurar limpieza de cache
    setInterval(cleanCache, 5 * 60 * 1000); // Cada 5 minutos
    
    // Estadísticas iniciales
    console.log('✅ Database optimizations initialized');
    console.log(`📊 Cache initialized with TTL: ${CACHE_TTL / 1000}s`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize database optimizations:', error);
    return false;
  }
};

module.exports = {
  initDatabaseOptimizations,
  getOptimizedVehicle,
  getOptimizedVehicleParts,
  cacheQuery,
  createOptimizedPool,
  cleanCache
};