import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import path from "path";
import { setupAuth, isManager, canManageOrders, canManageClients } from "./auth";
import { pool } from "./db";
import { vehiclesSearchController } from "./controllers/vehicles-search-controller";
import { isAuthenticated, isAdmin } from "./middleware/auth-middleware";
import { db } from "./db";
import { users, vehicles, parts, importHistory, syncControl, apiStatsCache, provinces, paymentConfig } from "../shared/schema";
import { eq, desc, sql, like, or, and, ne, isNotNull, asc, ilike } from "drizzle-orm";
import { registerOrderRoutes } from "./api/orders";
import { registerMaintenanceRoutes } from "./api/maintenance-routes";
import { registerPaymentRoutes } from "./api/payment-routes";
import { registerGoogleMerchantRoutes } from './api/google-merchant-routes';
import importRecoveryRoutes from "./api/import-recovery";
import importStatsRoutes from './api/import-stats-routes';
import { registerRelationsDiagnosticRoutes } from './api/relations-diagnostic';
import { maintenanceRouter } from './api/maintenance-routes';
import importDebugRoutes from './api/import-debug-routes';
import metasyncOptimizedRoutes from './api/metasync-optimized-routes';
import metasyncPartLookup from './api/metasync-part-lookup';
import { extractIdFromUrl } from '../shared/utils';

// Importación antigua deshabilitada
import { setupConfigRoutes } from './direct-config-routes';
import fixPartsVehicleInfoRoutes from './api/fix-parts-vehicle-info';
import { startComprehensiveImport } from './api/metasync-comprehensive-import';
import { optimizedImportRoutes } from './api/optimized-import-routes';
import { optimizedPartsImportController } from './api/optimized-parts-import';
import metasyncApiStats from './api/metasync-api-stats';
import { registerPaymentModuleRoutes } from "./api/payment-modules";
import { registerUserManagementRoutes } from "./api/user-management";
import { registerEmailConfigRoutes } from "./api/email-config";
import { registerClientsRoutes } from "./api/clients";
import { registerCMSRoutes } from "./api/cms-routes";
import { registerImageUploadRoutes } from "./api/image-upload-routes";
import { emailService } from "./services/email";
import { metasyncApi } from "./api/metasync";
import { testImportRouter } from "./api/test-import";
import { popupsRouter } from "./routes/popups";
import uploadRouter from "./routes/upload";
import backupRouter from "./routes/backup";
import { setupGoogleReviewsRoutes } from "./routes/google-reviews.js";
import { handleSEORequest } from './seo-handler';
import { simpleSEOMiddleware } from './middleware/seo-simple';


export async function registerRoutes(app: Express): Promise<Server> {
  // DISABLED ALL SSR - Using only universal meta system
  console.log('✅ SSR middleware disabled - Using universal meta only');

  // REMOVED: Both SSR middleware to prevent interference
  // const { replitSSRMiddleware } = await import('./middleware/replit-ssr');
  const { simpleSEOMiddleware } = await import('./middleware/seo-simple');

  // Set base URL environment variable if not set
  if (!process.env.BASE_URL && process.env.REPL_SLUG && process.env.REPL_OWNER) {
    process.env.BASE_URL = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
  }

  // Health check endpoint
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).send("OK");
  });

  // Favicon - handled by static middleware

  // Debug page for Safari SEO testing
  app.get('/safari-debug.html', (req: Request, res: Response) => {
    const debugHTML = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Safari SEO Debug Test</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; }
        .test-result { padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #007AFF; }
        .success { background: #d4edda; border-left-color: #28a745; color: #155724; }
        .error { background: #f8d7da; border-left-color: #dc3545; color: #721c24; }
        .info { background: #d1ecf1; border-left-color: #17a2b8; color: #0c5460; }
        .warning { background: #fff3cd; border-left-color: #ffc107; color: #856404; }
        button { background: #007AFF; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; margin: 10px 5px; }
        button:hover { background: #0051D5; }
        #results { margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🍎 Safari SEO Debug Test</h1>
        <p>Este test diagnostica específicamente por qué Safari no recibe el SEO server-side.</p>

        <div id="browser-info"></div>

        <button onclick="runFullTest()">🚀 Test Completo Safari SEO</button>
        <button onclick="testSpecificParts()">🔧 Test Piezas Específicas</button>
        <button onclick="testServerDirect()">🌐 Test Servidor Directo</button>

        <div id="results"></div>
    </div>

    <script>
        function log(message, type = 'info', showTime = true) {
            const results = document.getElementById('results');
            const div = document.createElement('div');
            div.className = \`test-result \${type}\`;
            const timestamp = showTime ? \`[\${new Date().toLocaleTimeString()}] \` : '';
            div.innerHTML = \`\${timestamp}\${message}\`;
            results.appendChild(div);
            console.log(message);
            results.scrollTop = results.scrollHeight;
        }

        function clearResults() {
            document.getElementById('results').innerHTML = '';
        }

        function showBrowserInfo() {
            const info = document.getElementById('browser-info');
            const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

            info.innerHTML = \`
                <div class="test-result info">
                    <strong>Browser Info:</strong><br>
                    User Agent: \${navigator.userAgent}<br>
                    Safari Detected: \${isSafari ? 'YES' : 'NO'}<br>
                    Cookies Enabled: \${navigator.cookieEnabled ? 'YES' : 'NO'}<br>
                    Language: \${navigator.language}<br>
                    Platform: \${navigator.platform}
                </div>
            \`;
        }

        async function testServerDirect() {
            clearResults();
            log('🌐 Testing direct server response...', 'info');

            const testUrls = [
                '/piezas/retrovisor-izquierdo-fiat-grande-punto-199-629057',
                '/piezas/bomba-direccion-peugeot-306-35-pt-s1011993-629055',
                '/piezas/mando-luces-nissan-primera-p11-629056'
            ];

            for (const url of testUrls) {
                try {
                    log(\`Testing URL: \${url}\`, 'info');

                    const response = await fetch(url, {
                        method: 'GET',
                        headers: {
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                            'Cache-Control': 'no-cache'
                        }
                    });

                    if (response.ok) {
                        const html = await response.text();
                        const titleMatch = html.match(/<title>(.*?)<\\/title>/i);
                        const title = titleMatch ? titleMatch[1] : 'No title found';

                        if (title.includes('RETROVISOR') || title.includes('BOMBA') || title.includes('MANDO')) {
                            log(\`✅ SEO Title Found: \${title}\`, 'success');
                        } else {
                            log(\`❌ Generic Title: \${title}\`, 'error');
                        }

                        if (html.includes('/@vite/client')) {
                            log(\`⚠️ This is DEVELOPMENT HTML (Vite detected)\`, 'warning');
                        } else {
                            log(\`✅ This is SERVER-SIDE SEO HTML\`, 'success');
                        }

                    } else {
                        log(\`❌ HTTP Error: \${response.status}\`, 'error');
                    }
                } catch (error) {
                    log(\`❌ Network Error: \${error.message}\`, 'error');
                }
            }
        }

        async function testSpecificParts() {
            clearResults();
            log('🔧 Testing specific parts API...', 'info');

            const partIds = [629055, 629056, 629057];

            for (const partId of partIds) {
                try {
                    log(\`Testing Part API: /api/parts/\${partId}\`, 'info');

                    const response = await fetch(\`/api/parts/\${partId}\`);

                    if (response.ok) {
                        const part = await response.json();
                        log(\`✅ Part loaded: \${part.descripcionArticulo} - \${part.vehicleMarca} \${part.vehicleModelo}\`, 'success');
                    } else {
                        log(\`❌ Part API Error: \${response.status}\`, 'error');
                    }
                } catch (error) {
                    log(\`❌ Part API Network Error: \${error.message}\`, 'error');
                }
            }
        }

        async function runFullTest() {
            clearResults();
            log('🚀 Starting complete Safari SEO diagnostic...', 'info');

            log('Test 1: Browser Capabilities', 'info');
            log(\`Fetch API: \${typeof fetch !== 'undefined' ? 'Available' : 'Not Available'}\`, 
                typeof fetch !== 'undefined' ? 'success' : 'error');

            log('Test 2: Current Page Analysis', 'info');
            log(\`Current URL: \${window.location.href}\`, 'info');
            log(\`Document Title: \${document.title}\`, 'info');
            log(\`Document Ready State: \${document.readyState}\`, 'info');

            log('Test 3: Meta Tag Analysis', 'info');
            const metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc) {
                log(\`Meta Description: \${metaDesc.content}\`, 'success');
            } else {
                log(\`No meta description found\`, 'warning');
            }

            log('Test 4: Testing SEO-specific URLs...', 'info');
            await testServerDirect();

            log('🏁 Full test completed!', 'success');
        }

        showBrowserInfo();

        setTimeout(() => {
            log('Auto-running diagnostic in Safari...', 'info');
            runFullTest();
        }, 2000);
    </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(debugHTML);
  });

  // Setup authentication
  setupAuth(app);

  // Middleware para verificar que la petición viene desde la aplicación (no acceso directo)
  const requireAppRequest = (req: Request, res: Response, next: Function) => {
    try {
      // Si es ADMIN autenticado, permitir acceso directo siempre
      if (req.isAuthenticated && req.isAuthenticated() && req.user && (req.user as any).isAdmin) {
        return next();
      }

      // Verificar que la petición pide JSON (fetch/axios desde la app)
      const acceptHeader = req.headers['accept'] || '';
      const wantsJSON = acceptHeader.includes('application/json');
      const wantsHTML = acceptHeader.includes('text/html');

      // Si pide HTML explícitamente, es acceso directo desde navegador - BLOQUEAR
      if (wantsHTML && !wantsJSON) {
        return res.status(403).json({ 
          error: "Acceso directo no permitido. Use la aplicación web." 
        });
      }

      // Si pide JSON o es XMLHttpRequest, es petición desde la app - PERMITIR
      const isXHR = req.headers['x-requested-with'] === 'XMLHttpRequest';
      if (wantsJSON || isXHR) {
        return next();
      }

      // Por defecto, bloquear
      return res.status(403).json({ 
        error: "Acceso directo no permitido. Use la aplicación web." 
      });
    } catch (error) {
      // Si hay algún error en el middleware, permitir la petición para no romper la app
      console.error('Error en requireAppRequest middleware:', error);
      return next();
    }
  };

  // MAIN PARTS SEARCH ENDPOINT - Clean and working with SQL injection protection
  app.get("/api/search-parts", async (req: Request, res: Response) => {
    try {
      // Validar y sanitizar parámetros de entrada
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 12, 1), 10000);
      const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
      const marca = typeof req.query.marca === 'string' ? req.query.marca.trim() : '';
      const modelo = typeof req.query.modelo === 'string' ? req.query.modelo.trim() : '';
      const familia = typeof req.query.familia === 'string' ? req.query.familia.trim() : '';
      const orden = typeof req.query.orden === 'string' ? req.query.orden.trim() : 'newest';
      const activo = req.query.activo;
      const getTotalCount = req.query.getTotalCount === "true";
      const isAdmin = req.query.isAdmin === "true";
      const includeProcessed = req.query.includeProcessed === "true";
      const vehicleType = typeof req.query.vehicleType === 'string' ? req.query.vehicleType.trim() : '';
      
      console.log(`🔍 BÚSQUEDA PIEZAS: Parámetros recibidos:`, {
        limit, offset, marca, modelo, familia, orden, activo, getTotalCount, isAdmin, includeProcessed, vehicleType
      });

      // Validar orden para prevenir SQL injection
      const validOrders = [
        'newest', 'oldest', 'name_asc', 'name_desc', 'price_asc', 'price_desc',
        'fechaActualizacion_desc', 'fechaActualizacion_asc', 'descripcionArticulo_asc',
        'descripcionArticulo_desc', 'descripcionFamilia_asc', 'descripcionFamilia_desc',
        'precio_asc', 'precio_desc', 'activo_asc', 'activo_desc'
      ];
      const validatedOrden = validOrders.includes(orden) ? orden : 'newest';

      // Build ORDER BY clause con validación de seguridad
      let orderBy = "ORDER BY p.fecha_actualizacion DESC";
      switch (validatedOrden) {
        case "name_asc": orderBy = "ORDER BY p.descripcion_articulo ASC"; break;
        case "name_desc": orderBy = "ORDER BY p.descripcion_articulo DESC"; break;
        case "price_asc": orderBy = "ORDER BY CAST(p.precio AS DECIMAL) ASC"; break;
        case "price_desc": orderBy = "ORDER BY CAST(p.precio AS DECIMAL) DESC"; break;
        case "newest": 
        case "fechaActualizacion_desc": orderBy = "ORDER BY p.fecha_actualizacion DESC"; break;
        case "fechaActualizacion_asc": orderBy = "ORDER BY p.fecha_actualizacion ASC"; break;
        case "descripcionArticulo_asc": orderBy = "ORDER BY p.descripcion_articulo ASC"; break;
        case "descripcionArticulo_desc": orderBy = "ORDER BY p.descripcion_articulo DESC"; break;
        case "descripcionFamilia_asc": orderBy = "ORDER BY p.descripcion_familia ASC"; break;
        case "descripcionFamilia_desc": orderBy = "ORDER BY p.descripcion_familia DESC"; break;
        case "precio_asc": orderBy = "ORDER BY CAST(p.precio AS DECIMAL) ASC"; break;
        case "precio_desc": orderBy = "ORDER BY CAST(p.precio AS DECIMAL) DESC"; break;
        case "activo_asc": orderBy = "ORDER BY p.activo ASC"; break;
        case "activo_desc": orderBy = "ORDER BY p.activo DESC"; break;
        case "oldest": orderBy = "ORDER BY p.fecha_actualizacion ASC"; break;
      }

      // Build WHERE conditions
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      // Price filter - different logic for admin vs public
      if (isAdmin) {
        // Admin can see all parts including those with negative prices (processed parts)
        // Only exclude NULL or empty prices
        conditions.push(`(p.precio IS NOT NULL AND p.precio != '')`);
      } else {
        // Public users only see parts with positive prices (optimized)
        conditions.push(`p.precio::numeric > 0`);
      }

      // Vehicle type filter
      if (vehicleType === 'processed') {
        conditions.push(`p.id_vehiculo < 0`);
      } else if (vehicleType === 'associated') {
        conditions.push(`p.id_vehiculo > 0`);
      }

      // Handle activo filter differently for admin vs public
      if (isAdmin) {
        // Admin can see all parts or filter by active status
        if (activo === "true") {
          conditions.push(`p.activo = $${paramIndex}`);
          params.push(true);
          paramIndex++;
        } else if (activo === "false") {
          conditions.push(`p.activo = $${paramIndex}`);
          params.push(false);
          paramIndex++;
        }
        // If activo is not specified for admin, show all parts
      } else {
        // Public users MUST filter by disponible_api (critical for hiding sold parts)
        conditions.push(`p.disponible_api = $${paramIndex}`);
        params.push(true);
        paramIndex += 1;
        
        // Public users can see active parts + processed vehicle parts if includeProcessed is true
        if (includeProcessed) {
          // Show active parts OR parts with negative vehicle IDs (processed vehicles) that have valid vehicle info
          conditions.push(`(
            p.activo = $${paramIndex} OR 
            (p.id_vehiculo < 0 AND p.vehicle_marca IS NOT NULL AND p.vehicle_marca != '' 
             AND p.vehicle_marca != '» OTROS...' AND p.vehicle_modelo != 'MODELOS')
          )`);
          params.push(true);
          paramIndex += 1;
        } else {
          // Only active parts
          conditions.push(`p.activo = $${paramIndex}`);
          params.push(true);
          paramIndex += 1;
        }
      }

      if (search && search.trim() && search.trim() !== "undefined") {
        const searchTerm = search.trim();

        // Multi-word search implementation like vehicles - split search terms
        const searchTerms = searchTerm.split(/\s+/).filter(term => term.length > 0);

        if (searchTerms.length === 1) {
          const term = searchTerms[0];

          // Check if it's a numeric search (likely a reference)
          const isNumeric = /^\d+$/.test(term);

          if (isNumeric) {
            // Optimized numeric search for references and IDs
            const numericSearchCondition = `(
              p.ref_local = $${paramIndex} OR
              p.ref_principal = $${paramIndex + 1} OR
              p.cod_articulo = $${paramIndex + 1} OR
              p.id = $${paramIndex} OR
              p.vehicle_anyo = $${paramIndex} OR
              p.ref_local::text ILIKE $${paramIndex + 2} OR
              p.ref_principal ILIKE $${paramIndex + 2} OR
              p.cod_articulo ILIKE $${paramIndex + 2}
            )`;
            conditions.push(numericSearchCondition);
            params.push(parseInt(term), term, `%${term}%`);
            paramIndex += 3;
          } else {
            // Optimized single word search including all relevant fields
            const textSearchCondition = `(
              p.descripcion_articulo ILIKE $${paramIndex} OR 
              p.vehicle_marca ILIKE $${paramIndex} OR 
               p.vehicle_modelo ILIKE $${paramIndex} OR 
               p.vehicle_version ILIKE $${paramIndex} OR 
               p.descripcion_familia ILIKE $${paramIndex} OR
              p.ref_principal ILIKE $${paramIndex} OR
              p.cod_articulo ILIKE $${paramIndex} OR
              p.ref_local::text ILIKE $${paramIndex} OR
              p.combustible ILIKE $${paramIndex} OR
              p.vehicle_anyo::text ILIKE $${paramIndex}
            )`;
            conditions.push(textSearchCondition);
            params.push(`%${term}%`);
            paramIndex += 1;
          }
        } else {
          // Optimized multi-word search including all relevant fields
          const multiWordConditions = searchTerms.map((term) => {
            const termCondition = `(
              p.descripcion_articulo ILIKE $${paramIndex} OR 
              p.vehicle_marca ILIKE $${paramIndex} OR 
              p.vehicle_modelo ILIKE $${paramIndex} OR 
              p.vehicle_version ILIKE $${paramIndex} OR 
              p.descripcion_familia ILIKE $${paramIndex} OR
              p.ref_principal ILIKE $${paramIndex} OR
              p.cod_articulo ILIKE $${paramIndex} OR
              p.ref_local::text ILIKE $${paramIndex} OR
              p.combustible ILIKE $${paramIndex} OR
              p.vehicle_anyo::text ILIKE $${paramIndex}
            )`;
            params.push(`%${term}%`);
            paramIndex++;
            return termCondition;
          });

          conditions.push(`(${multiWordConditions.join(' AND ')})`);
        }
      }

      if (marca && marca !== "all-brands" && marca.trim() !== "undefined") {
        conditions.push(`p.vehicle_marca ILIKE $${paramIndex}`);
        params.push(`%${marca.trim()}%`);
        paramIndex++;
      }

      if (modelo && modelo !== "all-models" && modelo.trim() !== "undefined") {
        conditions.push(`p.vehicle_modelo ILIKE $${paramIndex}`);
        params.push(`%${modelo.trim()}%`);
        paramIndex++;
      }

      if (familia && familia !== "all-families" && familia.trim() !== "undefined") {
        conditions.push(`p.descripcion_familia ILIKE $${paramIndex}`);
        params.push(`%${familia.trim()}%`);
        paramIndex++;
      }

      // Add year filter
      const anyo = req.query.anyo as string;
      if (anyo && anyo !== "all-years" && anyo.trim() !== "undefined") {
        const yearNumber = parseInt(anyo);
        if (!isNaN(yearNumber)) {
          conditions.push(`p.vehicle_anyo = $${paramIndex}`);
          params.push(yearNumber);
          paramIndex++;
        }
      }

      // Add fuel filter
      const combustible = req.query.combustible as string;
      if (combustible && combustible !== "all-fuels" && combustible.trim() !== "undefined") {
        conditions.push(`p.combustible ILIKE $${paramIndex}`);
        params.push(`%${combustible.trim()}%`);
        paramIndex++;
      }

      // Add price filters for admin
      const precioMin = req.query.precioMin as string;
      const precioMax = req.query.precioMax as string;

      if (precioMin && !isNaN(parseFloat(precioMin))) {
        conditions.push(`CAST(p.precio AS DECIMAL) >= $${paramIndex}`);
        params.push(parseFloat(precioMin));
        paramIndex++;
      }

      if (precioMax && !isNaN(parseFloat(precioMax))) {
        conditions.push(`CAST(p.precio AS DECIMAL) <= $${paramIndex}`);
        params.push(parseFloat(precioMax));
        paramIndex++;
      }

      // Add search query support (for 'q' parameter) - soporta múltiples palabras
      const q = req.query.q as string;
      if (q && q.trim() && q.trim() !== "undefined") {
        const qTerms = q.trim().split(/\s+/).filter(term => term.length > 0);

        if (qTerms.length === 1) {
          conditions.push(`(
            p.descripcion_articulo ILIKE $${paramIndex} OR 
            p.ref_local::text ILIKE $${paramIndex} OR
            p.descripcion_familia ILIKE $${paramIndex} OR
            p.cod_articulo ILIKE $${paramIndex} OR
            p.ref_principal ILIKE $${paramIndex} OR
            p.vehicle_marca ILIKE $${paramIndex} OR
            p.vehicle_modelo ILIKE $${paramIndex} OR
            p.vehicle_version ILIKE $${paramIndex} OR
            p.vehicle_anyo::text ILIKE $${paramIndex} OR
            EXISTS (
              SELECT 1 FROM vehicles v 
              JOIN vehicle_parts vp ON v.id = vp.vehicle_id 
              WHERE vp.part_id = p.id 
              AND v.combustible ILIKE $${paramIndex}
            )
          )`);
          params.push(`%${qTerms[0]}%`);
          paramIndex++;
        } else {
          const qMultiWordConditions = qTerms.map((term) => {
            const termCondition = `(
              p.descripcion_articulo ILIKE $${paramIndex} OR 
              p.ref_local::text ILIKE $${paramIndex} OR
              p.descripcion_familia ILIKE $${paramIndex} OR
              p.cod_articulo ILIKE $${paramIndex} OR
              p.ref_principal ILIKE $${paramIndex} OR
              p.vehicle_marca ILIKE $${paramIndex} OR
              p.vehicle_modelo ILIKE $${paramIndex} OR
              p.vehicle_version ILIKE $${paramIndex} OR
              p.vehicle_anyo::text ILIKE $${paramIndex} OR
              EXISTS (
                SELECT 1 FROM vehicles v 
                JOIN vehicle_parts vp ON v.id = vp.vehicle_id 
                WHERE vp.part_id = p.id 
                AND v.combustible ILIKE $${paramIndex}
              )
            )`;
            params.push(`%${term}%`);
            paramIndex++;
            return termCondition;
          });

          conditions.push(`(${qMultiWordConditions.join(' AND ')})`);
        }
      }

      // Optimized query - remove JOINs for initial search, add them only when needed
      const query = `
        SELECT 
          p.id,
          p.ref_local as "refLocal",
          p.id_empresa as "idEmpresa",
          p.cod_articulo as "codArticulo",
          p.ref_principal as "refPrincipal",
          p.descripcion_articulo as "descripcionArticulo",
          p.descripcion_familia as "descripcionFamilia",
          p.cod_familia as "codFamilia",
          p.precio,
          p.peso,
          p.id_vehiculo as "idVehiculo",
          p.imagenes,
          p.activo,
          p.fecha_creacion as "fechaCreacion",
          p.fecha_actualizacion as "fechaActualizacion",
          p.vehicle_marca as "vehicleMarca",
          p.vehicle_modelo as "vehicleModelo",
          p.vehicle_version as "vehicleVersion",
          p.vehicle_anyo as "vehicleAnyo",
          p.combustible
        FROM parts p
        WHERE ${conditions.join(" AND ")}
        ${orderBy}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(limit, offset);
      const result = await pool.query(query, params);

      // Get total count if requested
      let total = result.rows.length;
      if (getTotalCount) {
        const countQuery = `
          SELECT COUNT(*) as total 
          FROM parts p 
          WHERE ${conditions.join(" AND ")}
        `;
        const countParams = params.slice(0, -2);
        const countResult = await pool.query(countQuery, countParams);
        total = parseInt(countResult.rows[0].total);
        console.log(`📊 BÚSQUEDA PIEZAS: Total de piezas encontradas: ${total}, Condiciones: ${conditions.join(" AND ")}`);
      }

      // Skip vehicle lookup for faster search - only get vehicles when actually needed
      const enrichedParts = result.rows.map((part: any) => ({
        ...part,
        vehicleCombustible: part.combustible, // Map combustible field for PartCard compatibility
        vehicles: [], // Empty for now - will be populated on demand
        vehicleInternalId: null
      }));

      res.json({
        data: enrichedParts,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      });

    } catch (error) {
      console.error("Error in parts search:", error);
      const limit = parseInt(req.query.limit as string) || 12;
      const offset = parseInt(req.query.offset as string) || 0;
      res.status(500).json({ 
        error: "Internal server error",
        data: [],
        pagination: { total: 0, limit: limit, offset: offset, hasMore: false }
      });
    }
  });

  // CRUD Vehículos
  app.post("/api/vehicles", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const vehicleData = req.body;

      // Generar ID local único
      const maxIdResult = await pool.query(`
        SELECT COALESCE(MAX(id_local), 0) + 1 as next_id 
        FROM vehicles
      `);
      const nextIdLocal = maxIdResult.rows[0].next_id;

      const insertQuery = `
        INSERT INTO vehicles (
          id_local, marca, modelo, version, anyo, combustible, 
          descripcion, matricula, bastidor, color, kilometraje, potencia, activo,
          fecha_creacion, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;

      const result = await pool.query(insertQuery, [
        nextIdLocal,
        vehicleData.marca,
        vehicleData.modelo,
        vehicleData.version || "",
        vehicleData.anyo,
        vehicleData.combustible || "",
        vehicleData.descripcion || "",
        vehicleData.matricula || "",
        vehicleData.bastidor || "",
        vehicleData.color || "",
        vehicleData.kilometraje || 0,
        vehicleData.potencia || 0
      ]);

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error creating vehicle:", error);
      res.status(500).json({ error: "Error al crear vehículo" });
    }
  });

  app.put("/api/vehicles/:id", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const vehicleData = req.body;

      const updateQuery = `
        UPDATE vehicles SET
          marca = $2, modelo = $3, version = $4, anyo = $5, combustible = $6,
          descripcion = $7, matricula = $8, bastidor = $9, color = $10,
          kilometraje = $11, potencia = $12, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;

      const result = await pool.query(updateQuery, [
        id,
        vehicleData.marca,
        vehicleData.modelo,
        vehicleData.version || "",
        vehicleData.anyo,
        vehicleData.combustible || "",
        vehicleData.descripcion || "",
        vehicleData.matricula || "",
        vehicleData.bastidor || "",
        vehicleData.color || "",
        vehicleData.kilometraje || 0,
        vehicleData.potencia || 0
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Vehículo no encontrado" });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error updating vehicle:", error);
      res.status(500).json({ error: "Error al actualizar vehículo" });
    }
  });

  // Toggle vehicle status (activate/deactivate)
  app.patch("/api/vehicles/:id/toggle", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // First, get the current status
      const currentQuery = `SELECT activo FROM vehicles WHERE id = $1`;
      const currentResult = await pool.query(currentQuery, [id]);

      if (currentResult.rows.length === 0) {
        return res.status(404).json({ error: "Vehículo no encontrado" });
      }

      const currentStatus = currentResult.rows[0].activo;
      const newStatus = !currentStatus;

      // Update the status
      const updateQuery = `
        UPDATE vehicles SET
          activo = $2, 
          fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;

      const result = await pool.query(updateQuery, [id, newStatus]);

      console.log(`🚗 Vehículo ${id} ${newStatus ? 'activado' : 'desactivado'}`);
      res.json({ 
        ...result.rows[0], 
        message: `Vehículo ${newStatus ? 'activado' : 'desactivado'} correctamente` 
      });
    } catch (error) {
      console.error("Error toggling vehicle status:", error);
      res.status(500).json({ error: "Error al cambiar estado del vehículo" });
    }
  });

  // Delete all vehicles - DEBE IR ANTES que la ruta /:id
  app.delete('/api/vehicles/delete-all', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      console.log('🗑️ Iniciando eliminación masiva de vehículos...');

      // Primero eliminar todas las relaciones vehículo-piezas
      const deleteRelationsResult = await pool.query('DELETE FROM vehicle_parts');
      console.log(`🔗 Eliminadas ${deleteRelationsResult.rowCount} relaciones vehículo-pieza`);

      // Luego eliminar todos los vehículos
      const deleteVehiclesResult = await pool.query('DELETE FROM vehicles');
      console.log(`🚗 Eliminados ${deleteVehiclesResult.rowCount} vehículos`);

      res.json({ 
        message: `Se han eliminado ${deleteVehiclesResult.rowCount} vehículos y ${deleteRelationsResult.rowCount} relaciones correctamente`,
        deletedVehicles: deleteVehiclesResult.rowCount,
        deletedRelations: deleteRelationsResult.rowCount
      });
    } catch (error) {
      console.error('❌ Error al eliminar todos los vehículos:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // Delete vehicle - DEBE IR DESPUÉS de delete-all
  app.delete('/api/vehicles/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ error: 'ID de vehículo inválido' });
      }

      const vehicleId = parseInt(id);

      await pool.query('DELETE FROM vehicle_parts WHERE vehicle_id = $1', [vehicleId]);
      await pool.query('DELETE FROM vehicles WHERE id = $1', [vehicleId]);

      res.json({ message: 'Vehículo eliminado correctamente' });
    } catch (error) {
      console.error('Error al eliminar vehículo:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // CRUD Piezas
  app.post("/api/parts", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const partData = req.body;

      // Generar referencia local única
      const maxRefResult = await pool.query(`
        SELECT COALESCE(MAX(ref_local), 0) + 1 as next_ref 
        FROM parts
      `);
      const nextRefLocal = maxRefResult.rows[0].next_ref;

      const insertQuery = `
        INSERT INTO parts (
          ref_local, id_empresa, cod_articulo, ref_principal, descripcion_articulo,
          descripcion_familia, cod_familia, precio, peso, id_vehiculo,
          anyo_stock, observaciones, ubicacion, activo, fecha_creacion, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;

      const result = await pool.query(insertQuery, [
        nextRefLocal,
        partData.idEmpresa || 1236,
        partData.codArticulo || "",
        partData.refPrincipal || "",
        partData.descripcionArticulo,
        partData.descripcionFamilia,
        partData.codFamilia,
        partData.precio,
        partData.peso || "0",
        partData.idVehiculo,
        partData.anyoStock || 0,
        partData.observaciones || "",
        partData.ubicacion || 0
      ]);

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error creating part:", error);
      res.status(500).json({ error: "Error al crear pieza" });
    }
  });

  app.put("/api/parts/:id", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const partData = req.body;

      const updateQuery = `
        UPDATE parts SET
          cod_articulo = $2, ref_principal = $3, descripcion_articulo = $4,
          descripcion_familia = $5, cod_familia = $6, precio = $7, peso = $8,
          id_vehiculo = $9, anyo_stock = $10, observaciones = $11, ubicacion = $12,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;

      const result = await pool.query(updateQuery, [
        id,
        partData.codArticulo || "",
        partData.refPrincipal || "",
        partData.descripcionArticulo,
        partData.descripcionFamilia,
        partData.codFamilia,
        partData.precio,
        partData.peso || "0",
        partData.idVehiculo,
        partData.anyoStock || 0,
        partData.observaciones || "",
        partData.ubicacion || 0
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Pieza no encontrada" });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error updating part:", error);
      res.status(500).json({ error: "Error al actualizar pieza" });
    }
  });

  // Toggle part status (activate/deactivate)
  app.patch("/api/parts/:id/toggle", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // First, get the current status
      const currentQuery = `SELECT activo FROM parts WHERE id = $1`;
      const currentResult = await pool.query(currentQuery, [id]);

      if (currentResult.rows.length === 0) {
        return res.status(404).json({ error: "Pieza no encontrada" });
      }

      const currentStatus = currentResult.rows[0].activo;
      const newStatus = !currentStatus;

      // Update the status
      const updateQuery = `
        UPDATE parts SET
          activo = $2, 
          fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;

      const result = await pool.query(updateQuery, [id, newStatus]);

      console.log(`🔧 Pieza ${id} ${newStatus ? 'activada' : 'desactivada'}`);
      res.json({ 
        ...result.rows[0], 
        message: `Pieza ${newStatus ? 'activada' : 'desactivada'} correctamente` 
      });
    } catch (error) {
      console.error("Error toggling part status:", error);
      res.status(500).json({ error: "Error al cambiar estado de la pieza" });
    }
  });

  // Delete all parts - DEBE IR ANTES que la ruta /:id
  app.delete('/api/parts/delete-all', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      console.log('🗑️ Iniciando eliminación masiva de piezas...');

      // 1. Primero eliminar las referencias en order_items (artículos de pedidos)
      const deleteOrderItemsResult = await pool.query('DELETE FROM order_items');
      console.log(`🛒 Eliminados ${deleteOrderItemsResult.rowCount} artículos de pedidos`);

      // 2. Luego eliminar las relaciones en vehicle_parts si existen
      const deleteRelationsResult = await pool.query('DELETE FROM vehicle_parts');
      console.log(`🔗 Eliminadas ${deleteRelationsResult.rowCount} relaciones pieza-vehículo`);

      // 3. Finalmente eliminar todas las piezas
      const deletePartsResult = await pool.query('DELETE FROM parts');
      console.log(`🔧 Eliminadas ${deletePartsResult.rowCount} piezas`);

      res.json({ 
        message: `Se han eliminado ${deletePartsResult.rowCount} piezas, ${deleteRelationsResult.rowCount} relaciones y ${deleteOrderItemsResult.rowCount} artículos de pedidos correctamente`,
        deletedParts: deletePartsResult.rowCount,
        deletedRelations: deleteRelationsResult.rowCount,
        deletedOrderItems: deleteOrderItemsResult.rowCount
      });
    } catch (error) {
      console.error('❌ Error al eliminar todas las piezas:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // Delete part - DEBE IR DESPUÉS de delete-all
  app.delete('/api/parts/:id', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ error: 'ID de pieza inválido' });
      }

      // Primero eliminar las relaciones en vehicle_parts
      try {
        await pool.query('DELETE FROM vehicle_parts WHERE part_id = $1', [id]);
      } catch (error) {
        console.log('Error deleting vehicle_parts relations:', error);
      }

      // Luego eliminar la pieza
      await db.delete(parts).where(eq(parts.id, id));

      res.json({ message: 'Pieza eliminada correctamente' });
    } catch (error) {
      console.error('Error deleting part:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // Get brands and models for filters
  app.get("/api/parts/brands-models", async (req: Request, res: Response) => {
    try {
      const brandsQuery = `
        SELECT DISTINCT vehicle_marca as brand 
        FROM parts 
        WHERE vehicle_marca IS NOT NULL AND vehicle_marca != '' 
        AND activo = true AND disponible_api = true
        ORDER BY vehicle_marca
      `;

      const modelsQuery = `
        SELECT DISTINCT vehicle_marca as brand, vehicle_modelo as model 
        FROM parts 
        WHERE vehicle_marca IS NOT NULL AND vehicle_modelo IS NOT NULL 
        AND vehicle_marca != '' AND vehicle_modelo != ''
        AND activo = true AND disponible_api = true
        ORDER BY vehicle_marca, vehicle_modelo
      `;

      const [brandsResult, modelsResult] = await Promise.all([
        pool.query(brandsQuery),
        pool.query(modelsQuery)
      ]);

      const brands = brandsResult.rows.map(row => row.brand);
      const modelsByBrand: Record<string, string[]> = {};

      modelsResult.rows.forEach(row => {
        if (!modelsByBrand[row.brand]) {
          modelsByBrand[row.brand] = [];
        }
        if (!modelsByBrand[row.brand].includes(row.model)) {
          modelsByBrand[row.brand].push(row.model);
        }
      });

      res.json({
        brands,
        models: modelsByBrand
      });

    } catch (error) {
      console.error("Error getting vehicle brands and models:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get families/categories for parts
  app.get("/api/parts/families", async (req: Request, res: Response) => {
    try {
      const query = `
        SELECT DISTINCT descripcion_familia as familia
        FROM parts
        WHERE activo = true AND disponible_api = true AND descripcion_familia IS NOT NULL
        ORDER BY descripcion_familia
      `;

      const result = await pool.query(query);
      const families = result.rows.map(row => row.familia);

      res.json(families);

    } catch (error) {
      console.error("Error getting families:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get available years for vehicles  
  app.get("/api/vehicles-filter/years", async (req: Request, res: Response) => {
    try {
      const marca = req.query.marca as string;
      const modelo = req.query.modelo as string;

      console.log(`=== OBTENIENDO AÑOS DISPONIBLES ===`);
      console.log("Marca:", marca);
      console.log("Modelo:", modelo);

      let conditions = ["v.activo = true", "v.anyo IS NOT NULL", "v.anyo > 0", "v.anyo >= 1900", "v.anyo <= 2030"];
      const params: any[] = [];
      let paramIndex = 1;

      if (marca && marca !== "all-brands") {
        conditions.push(`v.marca ILIKE $${paramIndex}`);
        params.push(`%${marca}%`);
        paramIndex++;
      }

      if (modelo && modelo !== "all-models") {
        conditions.push(`v.modelo ILIKE $${paramIndex}`);
        params.push(`%${modelo}%`);
        paramIndex++;
      }

      const query = `
        SELECT DISTINCT v.anyo as year
        FROM vehicles v
        WHERE ${conditions.join(" AND ")}
        ORDER BY v.anyo DESC
      `;

      console.log("Query años:", query);
      console.log("Parámetros:", params);

      const result = await pool.query(query, params);
      const years = result.rows.map(row => row.year);

      console.log("Años encontrados:", years.length, years);
      res.json(years);
    } catch (error) {
      console.error("Error getting vehicle years:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get available fuel types for vehicles
  app.get("/api/vehicles-filter/fuels", async (req: Request, res: Response) => {
    try {
      const marca = req.query.marca as string;
      const modelo = req.query.modelo as string;
      const anyo = req.query.anyo as string;

      console.log(`=== OBTENIENDO COMBUSTIBLES DISPONIBLES ===`);
      console.log("Marca:", marca);
      console.log("Modelo:", modelo);
      console.log("Año:", anyo);

      let conditions = ["v.activo = true", "v.combustible IS NOT NULL", "v.combustible != ''"];
      const params: any[] = [];
      let paramIndex = 1;

      if (marca && marca !== "all-brands") {
        conditions.push(`v.marca ILIKE $${paramIndex}`);
        params.push(`%${marca}%`);
        paramIndex++;
      }

      if (modelo && modelo !== "all-models") {
        conditions.push(`v.modelo ILIKE $${paramIndex}`);
        params.push(`%${modelo}%`);
        paramIndex++;
      }

      if (anyo && anyo !== "all-years") {
        const yearNumber = parseInt(anyo);
        if (!isNaN(yearNumber)) {
          conditions.push(`v.anyo = $${paramIndex}`);
          params.push(yearNumber);
          paramIndex++;
        }
      }

      const query = `
        SELECT DISTINCT v.combustible as fuel
        FROM vehicles v
        WHERE ${conditions.join(" AND ")}
        ORDER BY v.combustible ASC
      `;

      console.log("Query combustibles:", query);
      console.log("Parámetros:", params);

      const result = await pool.query(query, params);
      const fuels = result.rows.map(row => row.fuel);

      console.log("Combustibles encontrados:", fuels.length, fuels);
      res.json(fuels);
    } catch (error) {
      console.error("Error getting vehicle fuels:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get vehicles brands and models for filtering
  app.get("/api/vehicles-filter/brands-models", async (req: Request, res: Response) => {
    try {
      const brandsQuery = `
        SELECT DISTINCT marca as brand 
        FROM vehicles 
        WHERE marca IS NOT NULL AND marca != '' AND activo = true
        ORDER BY marca
      `;

      const modelsQuery = `
        SELECT DISTINCT marca as brand, modelo as model 
        FROM vehicles 
        WHERE marca IS NOT NULL AND modelo IS NOT NULL 
        AND marca != '' AND modelo != '' AND activo = true
        ORDER BY marca, modelo
      `;

      const [brandsResult, modelsResult] = await Promise.all([
        pool.query(brandsQuery),
        pool.query(modelsQuery)
      ]);

      const brands = brandsResult.rows.map(row => row.brand);
      const modelsByBrand: Record<string, string[]> = {};

      modelsResult.rows.forEach(row => {
        if (!modelsByBrand[row.brand]) {
          modelsByBrand[row.brand] = [];
        }
        if (!modelsByBrand[row.brand].includes(row.model)) {
          modelsByBrand[row.brand].push(row.model);
        }
      });

      res.json({
        brands,
        models: modelsByBrand
      });

    } catch (error) {
      console.error("Error getting vehicle brands and models:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get available models filtered by brand - Dynamic filtering
  app.get("/api/vehicles-filter/models", async (req: Request, res: Response) => {
    try {
      const marca = req.query.marca as string;

      console.log(`=== OBTENIENDO MODELOS DISPONIBLES ===`);
      console.log("Marca:", marca);

      let conditions = ["v.activo = true", "v.modelo IS NOT NULL", "v.modelo != ''"];
      const params: any[] = [];
      let paramIndex = 1;

      if (marca && marca !== "all-brands") {
        conditions.push(`v.marca ILIKE $${paramIndex}`);
        params.push(`%${marca}%`);
        paramIndex++;
      }

      const query = `
        SELECT DISTINCT v.modelo as model
        FROM vehicles v
        WHERE ${conditions.join(" AND ")}
        ORDER BY v.modelo ASC
      `;

      console.log("Query modelos:", query);
      console.log("Parámetros:", params);

      const result = await pool.query(query, params);
      const models = result.rows.map(row => row.model);

      console.log("Modelos encontrados:", models.length, models);
      res.json(models);
    } catch (error) {
      console.error("Error getting vehicle models:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Find best matching model for URL parsing - Intelligent matching
  app.get("/api/vehicles-filter/find-model-match", vehiclesSearchController.findBestModelMatch);

  // Get available models filtered by brand - Dynamic filtering for parts
  app.get("/api/parts-filter/models", async (req: Request, res: Response) => {
    try {
      const marca = req.query.marca as string;

      console.log(`=== OBTENIENDO MODELOS DISPONIBLES (PIEZAS) ===`);
      console.log("Marca:", marca);

      let conditions = ["p.activo = true", "p.disponible_api = true", "p.vehicle_modelo IS NOT NULL", "p.vehicle_modelo != ''"];
      const params: any[] = [];
      let paramIndex = 1;

      if (marca && marca !== "all-brands") {
        conditions.push(`p.vehicle_marca ILIKE $${paramIndex}`);
        params.push(`%${marca}%`);
        paramIndex++;
      }

      const query = `
        SELECT DISTINCT p.vehicle_modelo as model
        FROM parts p
        WHERE ${conditions.join(" AND ")}
        AND (p.vehicle_anyo > 0 OR p.combustible IS NOT NULL AND p.combustible != '')
        ORDER BY p.vehicle_modelo ASC
      `;

      console.log("Query modelos piezas:", query);
      console.log("Parámetros:", params);

      const result = await pool.query(query, params);
      const models = result.rows.map(row => row.model);

      console.log("Modelos de piezas encontrados:", models.length, models.slice(0, 10));
      res.json(models);
    } catch (error) {
      console.error("Error getting parts models:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get available years filtered by brand and model ONLY - NEW ORDER: years come BEFORE families
  app.get("/api/parts-filter/years", async (req: Request, res: Response) => {
    try {
      const marca = req.query.marca as string;
      const modelo = req.query.modelo as string;
      // NOTE: ignoring familia and combustible for new sequential behavior

      console.log(`=== OBTENIENDO AÑOS DISPONIBLES (PIEZAS) - NUEVO ORDEN ===`);
      console.log("Marca:", marca, "Modelo:", modelo, "(ignorando familia y combustible - años vienen antes)");

      let conditions = ["p.activo = true", "p.disponible_api = true", "p.vehicle_anyo IS NOT NULL", "p.vehicle_anyo > 0", "p.vehicle_anyo >= 1900", "p.vehicle_anyo <= 2030"];
      const params: any[] = [];
      let paramIndex = 1;

      // Only apply filters up to the current level (brand and model)
      if (marca && marca !== "all-brands" && marca.trim() !== "undefined") {
        conditions.push(`p.vehicle_marca ILIKE $${paramIndex}`);
        params.push(`%${marca.trim()}%`);
        paramIndex++;
      }

      if (modelo && modelo !== "all-models" && modelo.trim() !== "undefined") {
        conditions.push(`p.vehicle_modelo ILIKE $${paramIndex}`);
        params.push(`%${modelo.trim()}%`);
        paramIndex++;
      }

      // DO NOT apply familia or combustible filters - years come before these in new order

      const query = `
        SELECT DISTINCT p.vehicle_anyo as year
        FROM parts p
        WHERE ${conditions.join(" AND ")}
        ORDER BY p.vehicle_anyo DESC
      `;

      console.log("Query años piezas (nuevo orden):", query);
      console.log("Parámetros:", params);

      const result = await pool.query(query, params);
      const years = result.rows.map(row => row.year);

      console.log("Años de piezas encontrados (nuevo orden):", years.length, years.slice(0, 10));
      res.json(years);
    } catch (error) {
      console.error("Error getting parts years:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // OPTIMIZED: Get all filter options in a single query
  app.get("/api/parts-filter/all", async (req: Request, res: Response) => {
    try {
      const marca = req.query.marca as string;
      const modelo = req.query.modelo as string;
      const familia = req.query.familia as string;
      const anyo = req.query.anyo as string;
      const combustible = req.query.combustible as string;

      console.log(`=== OBTENIENDO TODOS LOS FILTROS (OPTIMIZADO) ===`);
      console.log("Filtros:", { marca, modelo, familia, anyo, combustible });

      // Condiciones base para todas las consultas
      let baseConditions = ["p.activo = true"];
      const params: any[] = [];
      let paramIndex = 1;

      // Aplicar filtros comunes
      if (marca && marca !== "all-brands") {
        baseConditions.push(`p.vehicle_marca ILIKE $${paramIndex}`);
        params.push(`%${marca}%`);
        paramIndex++;
      }

      if (modelo && modelo !== "all-models") {
        baseConditions.push(`p.vehicle_modelo ILIKE $${paramIndex}`);
        params.push(`%${modelo}%`);
        paramIndex++;
      }

      if (familia && familia !== "all-families") {
        baseConditions.push(`p.descripcion_familia ILIKE $${paramIndex}`);
        params.push(`%${familia}%`);
        paramIndex++;
      }

      if (anyo && anyo !== "all-years") {
        baseConditions.push(`p.vehicle_anyo = $${paramIndex}`);
        params.push(parseInt(anyo));
        paramIndex++;
      }

      if (combustible && combustible !== "all-fuels") {
        baseConditions.push(`p.combustible ILIKE $${paramIndex}`);
        params.push(`%${combustible}%`);
        paramIndex++;
      }

      // Consulta única que obtiene todos los filtros
      const optimizedQuery = `
        WITH filtered_parts AS (
          SELECT DISTINCT 
            p.vehicle_marca,
            p.vehicle_modelo,
            p.descripcion_familia,
            p.vehicle_anyo,
            p.combustible
          FROM parts p
          WHERE ${baseConditions.join(" AND ")}
        )
        SELECT 
          (SELECT array_agg(DISTINCT vehicle_marca ORDER BY vehicle_marca) 
           FROM filtered_parts 
           WHERE vehicle_marca IS NOT NULL AND vehicle_marca != '') as brands,

          (SELECT array_agg(DISTINCT vehicle_modelo ORDER BY vehicle_modelo) 
           FROM filtered_parts 
           WHERE vehicle_modelo IS NOT NULL AND vehicle_modelo != ''
           AND (vehicle_anyo > 0 OR combustible IS NOT NULL AND combustible != '')) as models,

          (SELECT array_agg(DISTINCT descripcion_familia ORDER BY descripcion_familia) 
           FROM filtered_parts 
           WHERE descripcion_familia IS NOT NULL AND descripcion_familia != '') as families,

          (SELECT array_agg(DISTINCT vehicle_anyo ORDER BY vehicle_anyo DESC) 
           FROM filtered_parts 
           WHERE vehicle_anyo IS NOT NULL AND vehicle_anyo > 0) as years,

          (SELECT array_agg(DISTINCT combustible ORDER BY combustible) 
           FROM filtered_parts 
           WHERE combustible IS NOT NULL AND combustible != '') as fuels
      `;

      console.log("Query optimizada:", optimizedQuery);
      console.log("Parámetros:", params);

      const result = await pool.query(optimizedQuery, params);
      const filterData = result.rows[0];

      const response = {
        brands: filterData.brands || [],
        models: filterData.models || [],
        families: filterData.families || [],
        years: filterData.years || [],
        fuels: filterData.fuels || []
      };

      console.log("Filtros optimizados encontrados:", {
        brands: response.brands.length,
        models: response.models.length,
        families: response.families.length,
        years: response.years.length,
        fuels: response.fuels.length
      });

      res.json(response);
    } catch (error) {
      console.error("Error getting optimized filters:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get available fuels filtered by brand, model and year only - NEW ORDER: fuels come BEFORE families
  app.get("/api/parts-filter/fuels", async (req: Request, res: Response) => {
    try {
      const marca = req.query.marca as string;
      const modelo = req.query.modelo as string;
      const anyo = req.query.anyo as string;
      // NOTE: ignoring familia for new sequential behavior

      console.log(`=== OBTENIENDO COMBUSTIBLES DISPONIBLES (PIEZAS) - NUEVO ORDEN ===`);
      console.log("Marca:", marca, "Modelo:", modelo, "Año:", anyo, "(ignorando familia - combustibles vienen antes)");

      let conditions = ["p.activo = true", "p.combustible IS NOT NULL", "p.combustible != ''"];
      const params: any[] = [];
      let paramIndex = 1;

      // Apply filters up to the current level (brand, model, year)
      if (marca && marca !== "all-brands" && marca.trim() !== "undefined") {
        conditions.push(`p.vehicle_marca ILIKE $${paramIndex}`);
        params.push(`%${marca.trim()}%`);
        paramIndex++;
      }

      if (modelo && modelo !== "all-models" && modelo.trim() !== "undefined") {
        conditions.push(`p.vehicle_modelo ILIKE $${paramIndex}`);
        params.push(`%${modelo.trim()}%`);
        paramIndex++;
      }

      if (anyo && anyo !== "all-years" && anyo.trim() !== "undefined") {
        const yearNumber = parseInt(anyo);
        if (!isNaN(yearNumber)) {
          conditions.push(`p.vehicle_anyo = $${paramIndex}`);
          params.push(yearNumber);
          paramIndex++;
        }
      }

      // DO NOT apply familia filter - fuels come before families in new order

      const query = `
        SELECT DISTINCT p.combustible as fuel
        FROM parts p
        WHERE ${conditions.join(" AND ")}
        ORDER BY p.combustible ASC
      `;

      console.log("Query combustibles piezas (nuevo orden):", query);
      console.log("Parámetros:", params);

      const result = await pool.query(query, params);
      const fuels = result.rows.map(row => row.fuel);

      console.log("Combustibles de piezas encontrados (nuevo orden):", fuels.length, fuels.slice(0, 10));
      res.json(fuels);
    } catch (error) {
      console.error("Error getting parts fuels:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get families for parts filtering - SEQUENTIAL FILTERING (families show only for selected filters)
  app.get("/api/parts-filter/families", async (req: Request, res: Response) => {
    try {
      const marca = req.query.marca as string;
      const modelo = req.query.modelo as string;
      const anyo = req.query.anyo as string;
      const combustible = req.query.combustible as string;

      console.log("=== OBTENIENDO FAMILIAS DISPONIBLES (PIEZAS) - FILTRADO SECUENCIAL ===");
      console.log("Marca:", marca, "Modelo:", modelo, "Año:", anyo, "Combustible:", combustible);

      let conditions = ["p.activo = true", "p.descripcion_familia IS NOT NULL", "p.descripcion_familia != ''"];
      const params: any[] = [];
      let paramIndex = 1;

      // Apply ALL previous filters to get only categories that have parts with these exact filters
      if (marca && marca !== "all-brands" && marca.trim() !== "undefined") {
        conditions.push(`p.vehicle_marca ILIKE $${paramIndex}`);
        params.push(`%${marca.trim()}%`);
        paramIndex++;
      }

      if (modelo && modelo !== "all-models" && modelo.trim() !== "undefined") {
        conditions.push(`p.vehicle_modelo ILIKE $${paramIndex}`);
        params.push(`%${modelo.trim()}%`);
        paramIndex++;
      }

      if (anyo && anyo !== "all-years" && anyo.trim() !== "undefined") {
        const yearNumber = parseInt(anyo);
        if (!isNaN(yearNumber)) {
          conditions.push(`p.vehicle_anyo = $${paramIndex}`);
          params.push(yearNumber);
          paramIndex++;
        }
      }

      if (combustible && combustible !== "all-fuels" && combustible.trim() !== "undefined") {
        conditions.push(`p.combustible ILIKE $${paramIndex}`);
        params.push(`%${combustible.trim()}%`);
        paramIndex++;
      }

      const query = `
        SELECT DISTINCT p.descripcion_familia as family
        FROM parts p
        WHERE ${conditions.join(" AND ")}
        ORDER BY p.descripcion_familia ASC
      `;

      console.log("Query familias piezas (filtrado secuencial):", query);
      console.log("Parámetros:", params);

      const result = await pool.query(query, params);
      const families = result.rows.map(row => row.family);

      console.log("Familias encontradas con filtros aplicados:", families.length, families);
      res.json(families);
    } catch (error) {
      console.error("Error getting parts families:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get families/categories with filters
  app.get("/api/optimized/parts/families", async (req: Request, res: Response) => {
    try {
      const marca = req.query.marca as string;
      const modelo = req.query.modelo as string;
      const anyo = req.query.anyo as string;
      const combustible = req.query.combustible as string;

      let conditions = ["p.activo = true", "p.descripcion_familia IS NOT NULL"];
      const params: any[] = [];
      let paramIndex = 1;

      if (marca && marca !== "all-brands" && marca.trim() !== "undefined") {
        conditions.push(`p.vehicle_marca ILIKE $${paramIndex}`);
        params.push(`%${marca.trim()}%`);
        paramIndex++;
      }

      if (modelo && modelo !== "all-models" && modelo.trim() !== "undefined") {
        conditions.push(`p.vehicle_modelo ILIKE $${paramIndex}`);
        params.push(`%${modelo.trim()}%`);
        paramIndex++;
      }

      if (anyo && anyo !== "all-years" && anyo.trim() !== "undefined") {
        const yearNumber = parseInt(anyo);
        if (!isNaN(yearNumber)) {
          conditions.push(`p.vehicle_anyo = $${paramIndex}`);
          params.push(yearNumber);
          paramIndex++;
        }
      }

      if (combustible && combustible !== "all-fuels" && combustible.trim() !== "undefined") {
        // Usar JOIN con vehicles para obtener el combustible
        conditions.push(`EXISTS (
          SELECT 1 FROM vehicle_parts vp 
          JOIN vehicles v ON vp.vehicle_id = v.id 
          WHERE vp.part_id = p.id AND v.combustible ILIKE $${paramIndex}
        )`);
        params.push(`%${combustible.trim()}%`);
        paramIndex++;
      }

      const query = `
        SELECT DISTINCT p.descripcion_familia as familia
        FROM parts p
        WHERE ${conditions.join(" AND ")}
        ORDER BY p.descripcion_familia
      `;

      const result = await pool.query(query, params);
      const families = result.rows.map(row => row.familia);

      res.json(families);

    } catch (error) {
      console.error("Error getting families:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Endpoint para obtener filtros disponibles
  app.get("/api/parts/filters", async (req: Request, res: Response) => {
    try {
      console.log('🔧 API /api/parts/filters llamada');

      // Obtener marcas únicas de vehículos activos
      const brandsQuery = `
        SELECT DISTINCT v.marca as brand
        FROM vehicles v
        WHERE v.activo = true AND v.marca IS NOT NULL AND v.marca != ''
        ORDER BY v.marca ASC
      `;

      // Obtener modelos únicos de vehículos activos  
      const modelsQuery = `
        SELECT DISTINCT v.modelo as model
        FROM vehicles v  
        WHERE v.activo = true AND v.modelo IS NOT NULL AND v.modelo != ''
        ORDER BY v.modelo ASC
      `;

      // Obtener familias únicas de piezas activas
      const familiesQuery = `
        SELECT DISTINCT p.descripcion_familia as family
        FROM parts p
        WHERE p.activo = true AND p.disponible_api = true AND p.descripcion_familia IS NOT NULL AND p.descripcion_familia != ''
        ORDER BY p.descripcion_familia ASC
      `;

      // Obtener años únicos de vehículos activos
      const yearsQuery = `
        SELECT DISTINCT v.anyo as year
        FROM vehicles v
        WHERE v.activo = true AND v.anyo IS NOT NULL AND v.anyo > 0
        ORDER BY v.anyo DESC
      `;

      // Obtener combustibles únicos de vehículos activos
      const fuelsQuery = `
        SELECT DISTINCT v.combustible as fuel
        FROM vehicles v
        WHERE v.activo = true AND v.combustible IS NOT NULL AND v.combustible != ''
        ORDER BY v.combustible ASC
      `;

      // Ejecutar todas las consultas en paralelo
      const [brandsResult, modelsResult, familiesResult, yearsResult, fuelsResult] = await Promise.all([
        pool.query(brandsQuery),
        pool.query(modelsQuery), 
        pool.query(familiesQuery),
        pool.query(yearsQuery),
        pool.query(fuelsQuery)
      ]);

      const response = {
        brands: brandsResult.rows.map(row => row.brand),
        models: modelsResult.rows.map(row => row.model),
        families: familiesResult.rows.map(row => row.family),
        years: yearsResult.rows.map(row => row.year),
        fuels: fuelsResult.rows.map(row => row.fuel)
      };

      console.log(`✅ Filtros obtenidos:`, {
        brands: response.brands.length,
        models: response.models.length, 
        families: response.families.length,
        years: response.years.length,
        fuels: response.fuels.length
      });

      return res.json(response);
    } catch (error) {
      console.error('Error en /api/parts/filters:', error);
      return res.status(500).json({
        error: 'Error interno del servidor',
        brands: [],
        models: [],
        families: [],
        years: [],
        fuels: []
      });
    }
  });

  // Endpoint para obtener modelos filtrados por marca (para piezas)
  app.get("/api/parts-filter/models", async (req: Request, res: Response) => {
    try {
      const { marca } = req.query;
      console.log('🔧 API /api/parts-filter/models llamada con marca:', marca);

      let query = `
        SELECT DISTINCT v.modelo as model
        FROM vehicles v
        JOIN vehicle_parts vp ON v.id = vp.vehicle_id
        JOIN parts p ON vp.part_id = p.id
        WHERE v.activo = true AND p.activo = true AND p.disponible_api = true
        AND v.modelo IS NOT NULL AND v.modelo != ''
      `;

      const params = [];
      let paramIndex = 1;

      if (marca && marca !== 'all-brands') {
        query += ` AND v.marca ILIKE $${paramIndex}`;
        params.push(`%${marca}%`);
        paramIndex++;
      }

      query += ` ORDER BY v.modelo ASC`;

      const result = await pool.query(query, params);
      const models = result.rows.map(row => row.model);

      console.log(`✅ Modelos obtenidos para marca ${marca}:`, models.length);
      return res.json(models);
    } catch (error) {
      console.error('Error en /api/parts-filter/models:', error);
      return res.status(500).json([]);
    }
  });

  // Endpoint para obtener años filtrados por marca y modelo (para piezas)
  app.get("/api/parts-filter/years", async (req: Request, res: Response) => {
    try {
      const { marca, modelo } = req.query;
      console.log('🔧 API /api/parts-filter/years llamada con:', { marca, modelo });

      let query = `
        SELECT DISTINCT v.anyo as year
        FROM vehicles v
        JOIN vehicle_parts vp ON v.id = vp.vehicle_id
        JOIN parts p ON vp.part_id = p.id
        WHERE v.activo = true AND p.activo = true AND p.disponible_api = true
        AND v.anyo IS NOT NULL AND v.anyo > 0
      `;

      const params = [];
      let paramIndex = 1;

      if (marca && marca !== 'all-brands') {
        query += ` AND v.marca ILIKE $${paramIndex}`;
        params.push(`%${marca}%`);
        paramIndex++;
      }

      if (modelo && modelo !== 'all-models') {
        query += ` AND v.modelo ILIKE $${paramIndex}`;
        params.push(`%${modelo}%`);
        paramIndex++;
      }

      query += ` ORDER BY v.anyo DESC`;

      const result = await pool.query(query, params);
      const years = result.rows.map(row => row.year);

      console.log(`✅ Años obtenidos para marca ${marca}, modelo ${modelo}:`, years.length);
      return res.json(years);
    } catch (error) {
      console.error('Error en /api/parts-filter/years:', error);
      return res.status(500).json([]);
    }
  });

  // Endpoint para obtener combustibles filtrados por marca, modelo y año (para piezas)
  app.get("/api/parts-filter/fuels", async (req: Request, res: Response) => {
    try {
      const { marca, modelo, anyo } = req.query;
      console.log('🔧 API /api/parts-filter/fuels llamada con:', { marca, modelo, anyo });

      let query = `
        SELECT DISTINCT v.combustible as fuel
        FROM vehicles v
        JOIN vehicle_parts vp ON v.id = vp.vehicle_id
        JOIN parts p ON vp.part_id = p.id
        WHERE v.activo = true AND p.activo = true AND p.disponible_api = true
        AND v.combustible IS NOT NULL AND v.combustible != ''
      `;

      const params = [];
      let paramIndex = 1;

      if (marca && marca !== 'all-brands') {
        query += ` AND v.marca ILIKE $${paramIndex}`;
        params.push(`%${marca}%`);
        paramIndex++;
      }

      if (modelo && modelo !== 'all-models') {
        query += ` AND v.modelo ILIKE $${paramIndex}`;
        params.push(`%${modelo}%`);
        paramIndex++;
      }

      if (anyo && anyo !== 'all-years') {
        query += ` AND v.anyo = $${paramIndex}`;
        params.push(parseInt(anyo as string));
        paramIndex++;
      }

      query += ` ORDER BY v.combustible ASC`;

      const result = await pool.query(query, params);
      const fuels = result.rows.map(row => row.fuel);

      console.log(`✅ Combustibles obtenidos para marca ${marca}, modelo ${modelo}, año ${anyo}:`, fuels.length);
      return res.json(fuels);
    } catch (error) {
      console.error('Error en /api/parts-filter/fuels:', error);
      return res.status(500).json([]);
    }
  });



  // Get part by ID with vehicle information and related parts - Ultra-optimized combined query
  app.get("/api/parts/:id", async (req: Request, res: Response) => {
    try {
      const partId = parseInt(req.params.id);
      const includeRelated = req.query.includeRelated === 'true';

      if (isNaN(partId)) {
        return res.status(400).json({ error: "ID de pieza inválido" });
      }

      // Main part query - Include both active parts and processed vehicle parts
      const partQuery = `
        SELECT 
          p.id,
          p.ref_local as "refLocal",
          p.id_empresa as "idEmpresa",
          p.cod_articulo as "codArticulo",
          p.ref_principal as "refPrincipal",
          p.descripcion_articulo as "descripcionArticulo",
          p.descripcion_familia as "descripcionFamilia",
          p.cod_familia as "codFamilia",
          p.precio,
          p.peso,
          p.id_vehiculo as "idVehiculo",
          p.observaciones,
          p.imagenes,
          p.activo,
          p.fecha_creacion as "fechaCreacion",
          p.fecha_actualizacion as "fechaActualizacion",
          p.vehicle_marca as "vehicleMarca",
          p.vehicle_modelo as "vehicleModelo",
          p.vehicle_version as "vehicleVersion",
          p.vehicle_anyo as "vehicleAnyo"
        FROM parts p
        WHERE p.id = $1 
        AND (
          p.activo = true 
          OR (p.id_vehiculo < 0 AND p.vehicle_marca IS NOT NULL AND p.vehicle_modelo IS NOT NULL)
        )
      `;

      // Enhanced vehicles query - Only search for non-processed vehicle parts
      const vehiclesQuery = `
        SELECT DISTINCT
          v.id,
          v.marca,
          v.modelo,
          v.version,
          v.anyo,
          v.combustible,
          v.descripcion,
          v.imagenes,
          v.potencia,
          v.matricula
        FROM vehicles v
        LEFT JOIN vehicle_parts vp ON v.id = vp.vehicle_id AND vp.part_id = $1
        LEFT JOIN parts p ON p.id = $1
        WHERE v.activo = true 
          AND p.id_vehiculo > 0  -- Only for non-processed vehicles
          AND (
            vp.part_id IS NOT NULL  -- From vehicle_parts table
            OR v.id_local = p.id_vehiculo  -- Direct mapping by id_local
          )
        LIMIT 1
      `;

      let queries = [
        pool.query(partQuery, [partId]),
        pool.query(vehiclesQuery, [partId])
      ];

      console.log(`🔍 Buscando vehículos para pieza ${partId}...`);

      // If related parts are requested, add the optimized related parts query using vehicle_parts table
      let relatedPartsPromise = null;
      if (includeRelated) {
        const relatedPartsQuery = `
          SELECT 
            p.id,
            p.ref_local as "refLocal",
            p.cod_articulo as "codArticulo",
            p.descripcion_articulo as "descripcionArticulo",
            p.descripcion_familia as "descripcionFamilia",
            p.precio,
            p.imagenes,
            p.vehicle_marca as "vehicleMarca",
            p.vehicle_modelo as "vehicleModelo",
            p.vehicle_version as "vehicleVersion"
          FROM parts p
          INNER JOIN vehicle_parts vp1 ON p.id = vp1.part_id
          INNER JOIN vehicle_parts vp2 ON vp1.vehicle_id = vp2.vehicle_id
          WHERE vp2.part_id = $1
            AND p.id != $1 
            AND p.activo = true
            AND p.precio IS NOT NULL 
            AND p.precio != ''
            AND p.precio != '0'
          ORDER BY p.descripcion_articulo
          LIMIT 6
        `;
        relatedPartsPromise = pool.query(relatedPartsQuery, [partId]);
        queries.push(relatedPartsPromise);
      }

      // Execute all queries in parallel
      const results = await Promise.all(queries);
      const [partResult, vehiclesResult, relatedPartsResult] = results;

      if (partResult.rows.length === 0) {
        return res.status(404).json({ error: "Pieza no encontrada" });
      }

      const part = partResult.rows[0];
      part.vehicles = vehiclesResult.rows;

      console.log(`✅ Vehículos encontrados para pieza ${partId}: ${vehiclesResult.rows.length}`);

      if (includeRelated && relatedPartsResult) {
        part.relatedParts = relatedPartsResult.rows;
      }

      // Add caching headers for better performance
      res.set({
        'Cache-Control': 'public, max-age=300', // 5 minutes cache
        'ETag': `part-${partId}-${Date.now()}`,
      });

      res.json(part);

    } catch (error) {
      console.error("Error getting part details:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Get vehicles with comprehensive search and filtering - acceso público
  app.get("/api/optimized/vehicles", async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = parseInt(req.query.offset as string) || 0;
      const marca = req.query.marca as string;
      const modelo = req.query.modelo as string;
      const anyo = req.query.anyo as string;
      const combustible = req.query.combustible as string;
      const potencia = req.query.potencia as string;
      const search = req.query.search as string;
      const orden = req.query.orden as string || 'newest';
      const getTotalCount = req.query.getTotalCount === 'true';

      console.log(`=== BÚSQUEDA DE VEHÍCULOS ===`);
      console.log("Parámetros recibidos:", { marca, modelo, anyo, combustible, potencia, search, orden, limit, offset });

      const conditions = ["v.activo = true"];
      const params: any[] = [];
      let paramIndex = 1;

      // Filtro por búsqueda de texto mejorado - soporta múltiples palabras, ID y referencia
      if (search && search.trim() && search.trim() !== "undefined") {
        const searchTerms = search.trim().split(/\s+/).filter(term => term.length > 0);

        if (searchTerms.length === 1) {
          const term = searchTerms[0];
          // Verificar si es un número (posible ID)
          const isNumeric = /^\d+$/.test(term);

          if (isNumeric) {
            // Si es numérico, buscar por ID exacto primero, luego por otros campos
            conditions.push(`(
              v.id = $${paramIndex} OR
              v.descripcion ILIKE $${paramIndex + 1} OR 
              v.marca ILIKE $${paramIndex + 1} OR 
              v.modelo ILIKE $${paramIndex + 1} OR
              v.version ILIKE $${paramIndex + 1} OR
              v.matricula ILIKE $${paramIndex + 1} OR
              v.bastidor ILIKE $${paramIndex + 1} OR
              v.anyo::text ILIKE $${paramIndex + 1} OR
              v.combustible ILIKE $${paramIndex + 1}
            )`);
            params.push(parseInt(term)); // ID exacto
            params.push(`%${term}%`); // Búsqueda parcial en otros campos
            paramIndex += 2;
          } else {
            // Búsqueda simple con una palabra (incluye referencia mejorada)
            conditions.push(`(
              v.descripcion ILIKE $${paramIndex} OR 
              v.marca ILIKE $${paramIndex} OR 
              v.modelo ILIKE $${paramIndex} OR
              v.version ILIKE $${paramIndex} OR
              v.matricula ILIKE $${paramIndex} OR
              v.bastidor ILIKE $${paramIndex} OR
              v.anyo::text ILIKE $${paramIndex} OR
              v.combustible ILIKE $${paramIndex} OR
              v.potencia::text ILIKE $${paramIndex}
            )`);
            params.push(`%${term}%`);
            paramIndex++;
          }
        } else {
          // Búsqueda con múltiples palabras - cada palabra debe encontrarse en algún campo
          const multiWordConditions = searchTerms.map((term) => {
            const isNumeric = /^\d+$/.test(term);

            if (isNumeric) {
              const termCondition = `(
                v.id = $${paramIndex} OR
                v.descripcion ILIKE $${paramIndex + 1} OR 
                v.marca ILIKE $${paramIndex + 1} OR 
                v.modelo ILIKE $${paramIndex + 1} OR
                v.version ILIKE $${paramIndex + 1} OR
                v.matricula ILIKE $${paramIndex + 1} OR
                v.bastidor ILIKE $${paramIndex + 1} OR
                v.anyo::text ILIKE $${paramIndex + 1} OR
                v.combustible ILIKE $${paramIndex + 1} OR
                v.potencia::text ILIKE $${paramIndex + 1}
              )`;
              params.push(parseInt(term)); // ID exacto
              params.push(`%${term}%`); // Búsqueda parcial
              paramIndex += 2;
              return termCondition;
            } else {
              const termCondition = `(
                v.descripcion ILIKE $${paramIndex} OR 
                v.marca ILIKE $${paramIndex} OR 
                v.modelo ILIKE $${paramIndex} OR
                v.version ILIKE $${paramIndex} OR
                v.matricula ILIKE $${paramIndex} OR
                v.bastidor ILIKE $${paramIndex} OR
                v.anyo::text ILIKE $${paramIndex} OR
                v.combustible ILIKE $${paramIndex} OR
                v.potencia::text ILIKE $${paramIndex}
              )`;
              params.push(`%${term}%`);
              paramIndex++;
              return termCondition;
            }
          });

          conditions.push(`(${multiWordConditions.join(' AND ')})`);
        }
      }

      // Filtro por marca
      if (marca && marca !== "all-brands" && marca !== "__empty__" && marca.trim() !== "undefined") {
        conditions.push(`v.marca ILIKE $${paramIndex}`);
        params.push(`%${marca.trim()}%`);
        paramIndex++;
      }

      // Filtro por modelo
      if (modelo && modelo !== "all-models" && modelo !== "__empty__" && modelo.trim() !== "undefined") {
        conditions.push(`v.modelo ILIKE $${paramIndex}`);
        params.push(`%${modelo.trim()}%`);
        paramIndex++;
      }

      // Filtro por año corregido
      if (anyo && anyo !== "all-years" && anyo !== "__empty__" && anyo.trim() !== "undefined") {
        const yearNumber = parseInt(anyo);
        if (!isNaN(yearNumber)) {
          conditions.push(`v.anyo = $${paramIndex}`);
          params.push(yearNumber);
          paramIndex++;
        }
      }

      // Filtro por combustible corregido
      if (combustible && combustible !== "all-fuels" && combustible !== "__empty__" && combustible.trim() !== "undefined") {
        conditions.push(`v.combustible ILIKE $${paramIndex}`);
        params.push(`%${combustible.trim()}%`);
        paramIndex++;
      }

      // Filtro por potencia
      if (potencia && potencia !== "all-powers" && potencia !== "__empty__" && potencia.trim() !== "undefined") {
        const powerNumber = parseInt(potencia);
        if (!isNaN(powerNumber)) {
          conditions.push(`v.potencia = $${paramIndex}`);
          params.push(powerNumber);
          paramIndex++;
        }
      }

      // Handle sorting
      let orderBy = "ORDER BY v.fecha_actualizacion DESC"; // Default newest first

      console.log("Parámetro de ordenación recibido:", orden);

      if (orden) {
        switch (orden) {
          case 'oldest':
            orderBy = "ORDER BY v.fecha_actualizacion ASC";
            break;
          case 'brand_asc':
            orderBy = "ORDER BY v.marca ASC, v.modelo ASC";
            break;
          case 'brand_desc':
            orderBy = "ORDER BY v.marca DESC, v.modelo DESC";
            break;
          case 'model_asc':
            orderBy = "ORDER BY v.modelo ASC, v.marca ASC";
            break;
          case 'model_desc':
            orderBy = "ORDER BY v.modelo DESC, v.marca DESC";
            break;
          case 'year_asc':
            orderBy = "ORDER BY v.anyo ASC, v.marca ASC";
            break;
          case 'year_desc':
            orderBy = "ORDER BY v.anyo DESC, v.marca ASC";
            break;
          case 'newest':
          default:
            orderBy = "ORDER BY v.fecha_actualizacion DESC";
            break;
        }
      }

      console.log("Ordenación aplicada:", orderBy);

      // Query principal con información completa del vehículo
      const query = `
        SELECT 
          v.id,
          v.marca,
          v.modelo,
          v.version,
          v.anyo,
          v.combustible,
          v.descripcion,
          v.imagenes,
          v.activo,
          v.fecha_creacion as "fechaCreacion",
          v.fecha_actualizacion as "fechaActualizacion",
          v.matricula,
          v.bastidor,
          v.potencia,
          COALESCE(v.total_parts_count, 0) as "totalParts",
          COALESCE(v.active_parts_count, 0) as "activeParts"
        FROM vehicles v
        WHERE ${conditions.join(" AND ")}
        ${orderBy}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(limit, offset);

      console.log("Query SQL:", query);
      console.log("Parámetros:", params);

      const result = await pool.query(query, params);
      console.log(`Resultados encontrados: ${result.rows.length}`);

      // Get total count if requested
      let total = result.rows.length;
      if (getTotalCount) {
        const countQuery = `
          SELECT COUNT(DISTINCT v.id) as total 
          FROM vehicles v 
          WHERE ${conditions.join(" AND ")}
        `;
        const countParams = params.slice(0, -2);
        const countResult = await pool.query(countQuery, countParams);
        total = parseInt(countResult.rows[0].total);
      }

      // Evitar cache añadiendo headers
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      res.json({
        data: result.rows,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      });

    } catch (error) {
      console.error("Error in optimized vehicles:", error);
      res.status(500).json({ 
        error: "Internal server error",
        data: [],
        pagination: { total: 0, limit: 20, offset: 0, hasMore: false }
      });
    }
  });

  // Get related parts for a specific part (other parts for the same vehicle)
  app.get("/api/parts/:id/related", async (req: Request, res: Response) => {
    try {
      const partId = parseInt(req.params.id);

      if (isNaN(partId)) {
        return res.status(400).json({ error: "ID de pieza inválido" });
      }

      // Get vehicles associated with this part
      const vehicleQuery = `
        SELECT DISTINCT v.id as vehicle_id, v.marca, v.modelo, v.version
        FROM vehicles v
        INNER JOIN vehicle_parts vp ON v.id = vp.vehicle_id
        WHERE vp.part_id = $1
        LIMIT 1
      `;

      const vehicleResult = await pool.query(vehicleQuery, [partId]);

      if (vehicleResult.rows.length === 0) {
        return res.json({ parts: [], vehicleId: null });
      }

      const vehicle = vehicleResult.rows[0];

      // Get other parts for the same vehicle (excluding current part) - optimized query
      const relatedPartsQuery = `
        SELECT 
          p.id,
          p.ref_local as "refLocal",
          p.cod_articulo as "codArticulo",
          p.descripcion_articulo as "descripcionArticulo",
          p.descripcion_familia as "descripcionFamilia",
          p.precio,
          p.imagenes,
          p.fecha_actualizacion as "fechaActualizacion",
          p.vehicle_marca as "vehicleMarca",
          p.vehicle_modelo as "vehicleModelo",
          p.vehicle_version as "vehicleVersion"
        FROM parts p
        INNER JOIN vehicle_parts vp ON p.id = vp.part_id
        WHERE vp.vehicle_id = $1 
          AND p.id != $2 
          AND p.activo = true
          AND p.precio IS NOT NULL 
          AND p.precio != '' 
          AND p.precio != '0'
          AND CAST(REPLACE(p.precio, ',', '.') AS DECIMAL) > 0
        ORDER BY p.descripcion_articulo
        LIMIT 12
      `;

      const partsResult = await pool.query(relatedPartsQuery, [vehicle.vehicle_id, partId]);

      res.json({
        parts: partsResult.rows,
        vehicleId: vehicle.vehicle_id
      });

    } catch (error) {
      console.error("Error getting related parts:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Get related parts for a vehicle (optimized endpoint)
  app.get("/api/optimized/parts/related/:vehicleId", async (req: Request, res: Response) => {
    try {
      const vehicleId = parseInt(req.params.vehicleId);
      const excludePartId = parseInt(req.query.excludePartId as string) || 0;
      const limit = parseInt(req.query.limit as string) || 8;

      if (isNaN(vehicleId)) {
        return res.status(400).json({ error: "ID de vehículo inválido" });
      }

      const query = `
        SELECT 
          p.id,
          p.ref_local as "refLocal",
          p.cod_articulo as "codArticulo",
          p.descripcion_articulo as "descripcionArticulo",
          p.descripcion_familia as "descripcionFamilia",
          p.precio,
          p.imagenes,
          p.fecha_actualizacion as "fechaActualizacion",
          p.vehicle_marca as "vehicleMarca",
          p.vehicle_modelo as "vehicleModelo",
          p.vehicle_version as "vehicleVersion",
          p.vehicle_anyo as "vehicleAnyo",
          v.combustible as "vehicleCombustible",
          v.id as "vehicleId"
        FROM parts p
        LEFT JOIN vehicle_parts vp ON p.id = vp.part_id
        LEFT JOIN vehicles v ON (vp.vehicle_id = v.id OR v.id_local = p.id_vehiculo)
        WHERE v.id = $1 
          AND p.id != $2 
          AND p.activo = true
          AND p.precio IS NOT NULL 
          AND p.precio != '' 
          AND p.precio != '0'
          AND CAST(REPLACE(p.precio, ',', '.') AS DECIMAL) > 0
        ORDER BY p.descripcion_articulo
        LIMIT $3
      `;

      const result = await pool.query(query, [vehicleId, excludePartId, limit]);

      console.log(`🔍 Piezas relacionadas encontradas para vehículo ${vehicleId}: ${result.rows.length}`);

      res.json({
        data: result.rows,
        vehicleId: vehicleId
      });

    } catch (error) {
      console.error("Error getting optimized related parts:", error);
      res.status(500).json({ 
        error: "Error interno del servidor",
        data: []
      });
    }
  });

  // Get years available in parts for filtering
  app.get("/api/parts-filter/years", async (req: Request, res: Response) => {
    try {
      const marca = req.query.marca as string;
      const modelo = req.query.modelo as string;
      const familia = req.query.familia as string;
      const combustible = req.query.combustible as string;

      const conditions = ["p.activo = true", "p.vehicle_anyo IS NOT NULL", "p.vehicle_anyo > 0", "p.vehicle_anyo >= 1900", "p.vehicle_anyo <= 2030"];
      const params: any[] = [];
      let paramIndex = 1;

      if (marca && marca !== "all-brands" && marca.trim() !== "undefined") {
        conditions.push(`p.vehicle_marca ILIKE $${paramIndex}`);
        params.push(`%${marca.trim()}%`);
        paramIndex++;
      }

      if (modelo && modelo !== "all-models" && modelo.trim() !== "undefined") {
        conditions.push(`p.vehicle_modelo ILIKE $${paramIndex}`);
        params.push(`%${modelo.trim()}%`);
        paramIndex++;
      }

      if (familia && familia !== "all-families" && familia.trim() !== "undefined") {
        conditions.push(`p.descripcion_familia ILIKE $${paramIndex}`);
        params.push(`%${familia.trim()}%`);
        paramIndex++;
      }

      if (combustible && combustible !== "all-fuels" && combustible.trim() !== "undefined") {
        // Usar JOIN con vehicles para obtener el combustible
        conditions.push(`EXISTS (
          SELECT 1 FROM vehicle_parts vp 
          JOIN vehicles v ON vp.vehicle_id = v.id 
          WHERE vp.part_id = p.id AND v.combustible ILIKE $${paramIndex}
        )`);
        params.push(`%${combustible.trim()}%`);
        paramIndex++;
      }

      const query = `
        SELECT DISTINCT p.vehicle_anyo as year
        FROM parts p
        WHERE ${conditions.join(" AND ")}
        ORDER BY p.vehicle_anyo DESC
      `;

      const result = await pool.query(query, params);
      const years = result.rows.map(row => row.year).filter(year => year !== null);

      res.json(years);

    } catch (error) {
      console.error("Error getting parts years:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Get fuels available in parts for filtering
  app.get("/api/parts-filter/fuels", async (req: Request, res: Response) => {
    try {
      const marca = req.query.marca as string;
      const modelo = req.query.modelo as string;
      const familia = req.query.familia as string;
      const anyo = req.query.anyo as string;

      // Construir condiciones usando Drizzle ORM
      const conditions = [
        eq(parts.activo, true),
        ne(parts.combustible, ""),
        isNotNull(parts.combustible)
      ];

      if (marca && marca !== "all-brands" && marca.trim() !== "undefined") {
        conditions.push(ilike(parts.vehicleMarca, `%${marca.trim()}%`));
      }

      if (modelo && modelo !== "all-models" && modelo.trim() !== "undefined") {
        conditions.push(ilike(parts.vehicleModelo, `%${modelo.trim()}%`));
      }

      if (familia && familia !== "all-families" && familia.trim() !== "undefined") {
        conditions.push(ilike(parts.descripcionFamilia, `%${familia.trim()}%`));
      }

      if (anyo && anyo !== "all-years" && anyo.trim() !== "undefined") {
        const yearNumber = parseInt(anyo);
        if (!isNaN(yearNumber)) {
          conditions.push(eq(parts.vehicleAnyo, yearNumber));
        }
      }

      const result = await db
        .selectDistinct({ 
          combustible: parts.combustible 
        })
        .from(parts)
        .where(and(...conditions))
        .orderBy(asc(parts.combustible));

      const fuels = result
        .map(row => row.combustible)
        .filter(fuel => fuel && fuel.trim() !== "");

      res.json(fuels);

    } catch (error) {
      console.error("Error getting parts fuels:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Debug endpoint to test vehicle parts counting
  app.get("/api/debug/vehicles", async (req: Request, res: Response) => {
    try {
      const query = `
        SELECT 
          v.id,
          v.marca,
          v.modelo,
          COUNT(vp.part_id) as total_parts,
          COUNT(CASE WHEN p.activo = true THEN 1 END) as active_parts
        FROM vehicles v
        LEFT JOIN vehicle_parts vp ON v.id = vp.vehicle_id
        LEFT JOIN parts p ON vp.part_id = p.id
        WHERE v.activo = true
        GROUP BY v.id, v.marca, v.modelo
        ORDER BY v.marca, v.modelo
        LIMIT 5
      `;

      const result = await pool.query(query);
      res.json({ debug: true, data: result.rows });
    } catch (error) {
      console.error("Debug error:", error);
      res.status(500).json({ error: "Debug error" });
    }
  });

  // Endpoint de diagnóstico para vehículos
  app.get("/api/vehicles/debug/stats", async (req: Request, res: Response) => {
    try {
      console.log('🔍 Iniciando diagnóstico de vehículos...');

      // Conteos básicos
      const [totalVehicles] = await db.select({ count: sql`count(*)` }).from(vehicles);
      const [activeVehicles] = await db.select({ count: sql`count(*)` }).from(vehicles).where(eq(vehicles.activo, true));
      const [inactiveVehicles] = await db.select({ count: sql`count(*)` }).from(vehicles).where(eq(vehicles.activo, false));

      // Obtener estadísticas por marca
      const brandStats = await db
        .select({
          marca: vehicles.marca,
          count: sql`count(*)`
        })
        .from(vehicles)
        .groupBy(vehicles.marca)
        .orderBy(desc(sql`count(*)`))
        .limit(10);

      // Obtener últimos vehículos creados
      const recentVehicles = await db
        .select({
          id: vehicles.id,
          idLocal: vehicles.idLocal,
          marca: vehicles.marca,
          modelo: vehicles.modelo,
          activo: vehicles.activo,
          fechaCreacion: vehicles.fechaCreacion
        })
        .from(vehicles)
        .orderBy(desc(vehicles.fechaCreacion))
        .limit(10);

      // Rango de IDs
      const [minId] = await db.select({ min: sql`min(${vehicles.id})` }).from(vehicles);
      const [maxId] = await db.select({ max: sql`max(${vehicles.id})` }).from(vehicles);
      const [minIdLocal] = await db.select({ min: sql`min(${vehicles.idLocal})` }).from(vehicles);
      const [maxIdLocal] = await db.select({ max: sql`max(${vehicles.idLocal})` }).from(vehicles);

      const stats = {
        counts: {
          total: Number(totalVehicles.count),
          active: Number(activeVehicles.count),
          inactive: Number(inactiveVehicles.count)
        },
        ranges: {
          idRange: `${minId.min} - ${maxId.max}`,
          idLocalRange: `${minIdLocal.min} - ${maxIdLocal.max}`
        },
        topBrands: brandStats.map(b => ({
          marca: b.marca,
          count: Number(b.count)
        })),
        recentVehicles: recentVehicles
      };

      console.log('📊 Estadísticas completas:', stats);

      res.json({
        success: true,
        stats
      });
    } catch (error) {
      console.error("Error en diagnóstico de vehículos:", error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Error desconocido" 
      });
    }
  });

  // Endpoint para obtener un vehículo por ID

// Obtener vehículo por ID con sus piezas - Optimized single query
app.get("/api/vehicles/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const soloActivas = req.query.soloActivas !== 'false';

    if (isNaN(id)) {
      return res.status(400).json({ error: "ID de vehículo inválido" });
    }

    // Optimized separate queries for better performance
    // Search by both id and id_local to handle both internal ID and MetaSync ID
    const vehicleQuery = `
      SELECT 
        v.id, v.id_local as "idLocal", v.marca, v.modelo, v.version, v.anyo,
        v.combustible, v.descripcion, v.imagenes, v.activo, v.matricula,
        v.bastidor, v.color, v.kilometraje, v.potencia,
        v.fecha_creacion as "fechaCreacion",
        v.fecha_actualizacion as "fechaActualizacion",
        COALESCE(v.total_parts_count, 0) as "totalParts",
        COALESCE(v.active_parts_count, 0) as "activeParts"
      FROM vehicles v
      WHERE (v.id = $1 OR v.id_local = $1) AND v.activo = true
    `;

    // Simplified parts query with better performance
    const availabilityFilter = soloActivas ? `
      AND p.activo = true
      AND p.precio IS NOT NULL 
      AND p.precio != '' 
      AND p.precio != '0'
      AND CAST(REPLACE(p.precio, ',', '.') AS DECIMAL) > 0
    ` : " AND p.activo = true";

    const partsQuery = `
      SELECT 
        p.id, p.ref_local as "refLocal", p.id_empresa as "idEmpresa",
        p.cod_articulo as "codArticulo", p.ref_principal as "refPrincipal",
        p.descripcion_articulo as "descripcionArticulo",
        p.descripcion_familia as "descripcionFamilia",
        p.cod_familia as "codFamilia", p.precio, p.peso,
        p.id_vehiculo as "idVehiculo", p.imagenes, p.activo,
        p.fecha_creacion as "fechaCreacion",
        p.fecha_actualizacion as "fechaActualizacion",
        p.vehicle_marca as "vehicleMarca",
        p.vehicle_modelo as "vehicleModelo",
        p.vehicle_version as "vehicleVersion",
        p.vehicle_anyo as "vehicleAnyo"
      FROM parts p
      INNER JOIN vehicles v ON p.id_vehiculo = v.id_local
      WHERE (v.id = $1 OR v.id_local = $1) ${availabilityFilter}
      ORDER BY p.descripcion_articulo
    `;

    // Execute queries in parallel for better performance
    const [vehicleResult, partsResult] = await Promise.all([
      pool.query(vehicleQuery, [id]),
      pool.query(partsQuery, [id])
    ]);

    if (vehicleResult.rows.length === 0) {
      return res.status(404).json({ error: "Vehículo no encontrado" });
    }

    const vehicle = vehicleResult.rows[0];
    const parts = partsResult.rows;

    res.json({
      vehicle: vehicle,
      parts: parts
    });

  } catch (error) {
    console.error("Error getting vehicle:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

  // Endpoint para obtener vehículos con paginación
  app.get("/api/vehicles", async (req: Request, res: Response) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const limit = parseInt(url.searchParams.get("limit") || "50000"); // Mostrar muchos por defecto
      const offset = parseInt(url.searchParams.get("offset") || "0");
      const search = url.searchParams.get("search") || "";

      console.log(`🚗 Solicitando vehículos: limit=${limit}, offset=${offset}, search="${search}"`);

      let baseCondition = eq(vehicles.activo, true);

      if (search) {
        const searchCondition = or(
          like(vehicles.marca, `%${search}%`),
          like(vehicles.modelo, `%${search}%`),
          like(vehicles.matricula, `%${search}%`),
          like(vehicles.bastidor, `%${search}%`)
        );
        baseCondition = and(eq(vehicles.activo, true), searchCondition);
      }

      const query = db.select().from(vehicles).where(baseCondition);
      const countQuery = db.select({ count: sql`count(*)` }).from(vehicles).where(baseCondition);

      const vehiclesList = await query
        .limit(Math.min(limit, 50000)) // Máximo 50k para evitar problemas de memoria
        .offset(offset)
        .orderBy(sql`${vehicles.fechaActualizacion} DESC`);

      const [{ count: totalCount }] = await countQuery;

      console.log(`📊 Resultado: encontrados ${vehiclesList.length} vehículos de ${totalCount} total`);

      res.json({
        vehicles: vehiclesList,
        pagination: {
          total: Number(totalCount),
          limit: Math.min(limit, 50000),
          offset,
          hasMore: offset + Math.min(limit, 50000) < Number(totalCount)
        }
      });
    } catch (error) {
      console.error("Error obteniendo vehículos:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Endpoint de piezas movido a archivo externo parts-endpoint-fixed.ts

  // Rutas de usuarios (admin)
  app.get('/api/users', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    console.log('👥 API /api/users llamada');
    try {
      const usersData = await db.select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        isAdmin: users.isAdmin,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      }).from(users);

      console.log(`Devolviendo ${usersData.length} usuarios`);
      res.json(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // Crear usuario (admin)
  app.post('/api/users', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    console.log('👥 API POST /api/users llamada');
    try {
      const { username, email, password, isAdmin, role } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });
      }

      // Validar longitud de contraseña
      if (password.length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
      }

      // Verificar si el usuario ya existe
      const existingUser = await db.select().from(users).where(eq(users.username, username)).limit(1);
      if (existingUser.length > 0) {
        return res.status(400).json({ error: 'El usuario ya existe' });
      }

      // Hashear la contraseña
      const { hashPassword } = await import('./auth');
      const hashedPassword = await hashPassword(password);

      // Crear el usuario
      const userValues: any = {
        username,
        password: hashedPassword,
        email: email || "",
        isAdmin: isAdmin || false,
        role: role || 'customer',
        firstName: "",
        lastName: "",
        address: "",
        city: "",
        postalCode: "",
        phone: "",
        province: "",
        shippingAddress: "",
        shippingCity: "",
        shippingPostalCode: "",
        shippingProvince: "",
        billingAddress: "",
        billingCity: "",
        billingPostalCode: "",
        billingProvince: ""
      };

      const newUser = await db.insert(users).values(userValues).returning({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        isAdmin: users.isAdmin,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      });

      console.log(`Usuario creado: ${username}`);
      res.status(201).json(newUser[0]);
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Error al crear usuario' });
    }
  });

  // Actualizar usuario (admin)
  app.put('/api/users/:id', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    console.log('👥 API PUT /api/users/:id llamada');
    try {
      const userId = parseInt(req.params.id);
      const { username, email, password, isAdmin, role } = req.body;

      if (isNaN(userId)) {
        return res.status(400).json({ error: 'ID de usuario inválido' });
      }

      if (!username) {
        return res.status(400).json({ error: 'El nombre de usuario es obligatorio' });
      }

      // Verificar que el usuario existe
      const existingUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (existingUser.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Preparar los datos a actualizar
      const updateData: any = {
        username,
        email: email || null,
        isAdmin: isAdmin || false,
        role: role || 'customer',
        updatedAt: new Date()
      };

      // Si se proporciona una nueva contraseña, validarla y hashearla
      if (password) {
        if (password.length < 6) {
          return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
        }
        const { hashPassword } = await import('./auth');
        updateData.password = await hashPassword(password);
      }

      // Actualizar el usuario
      const updatedUser = await db.update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          username: users.username,
          email: users.email,
          role: users.role,
          isAdmin: users.isAdmin,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt
        });

      console.log(`Usuario actualizado: ${username}`);
      res.json(updatedUser[0]);
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Error al actualizar usuario' });
    }
  });

  // Eliminar usuario (admin)
  app.delete('/api/users/:id', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    console.log('👥 API DELETE /api/users/:id llamada');
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ error: 'ID de usuario inválido' });
      }

      // Verificar que el usuario existe
      const existingUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (existingUser.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // No permitir eliminar el último administrador
      if (existingUser[0].isAdmin) {
        const adminCount = await db.select().from(users).where(eq(users.isAdmin, true));
        if (adminCount.length <= 1) {
          return res.status(400).json({ error: 'No se puede eliminar el último administrador' });
        }
      }

      // Eliminar el usuario
      await db.delete(users).where(eq(users.id, userId));

      console.log(`Usuario eliminado: ID ${userId}`);
      res.json({ message: 'Usuario eliminado correctamente' });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Error al eliminar usuario' });
    }
  });

  // Rutas de pedidos
  registerOrderRoutes(app);

  // Rutas de mantenimiento
  registerMaintenanceRoutes(app);

  // Rutas de pagos y envíos
  registerPaymentRoutes(app);
  registerPaymentModuleRoutes(app);

  // Rutas de gestión de usuarios
  registerUserManagementRoutes(app);

  // Rutas de configuración de correos
  registerEmailConfigRoutes(app);

  // Rutas de gestión de clientes
  registerClientsRoutes(app);

  // Rutas de CMS
  registerCMSRoutes(app);

  // Rutas de subida de imágenes generales
  registerImageUploadRoutes(app);

  // Registrar rutas de gestión de mensajes para administradores (FIRST!)
  const { registerAdminMessagesRoutes } = await import('./api/admin-messages-routes');
  registerAdminMessagesRoutes(app);

  // Registrar rutas de mensajes de contacto (SECOND)
  const { registerContactMessagesRoutes } = await import('./api/contact-messages');
  registerContactMessagesRoutes(app);

  // Registrar rutas de Google Merchant Center
  registerGoogleMerchantRoutes(app);



  // Endpoint para estadísticas básicas rápidas (optimizado para carga inicial)
  app.get("/api/dashboard/stats-quick", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      console.log("⚡ Obteniendo estadísticas básicas rápidas...");

      // Solo conteos básicos en una sola consulta
      const basicStats = await pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM vehicles WHERE activo = true) as vehicle_count,
          (SELECT COUNT(*) FROM parts WHERE activo = true) as active_parts,
          (SELECT COUNT(*) FROM parts) as total_parts,
          (SELECT COUNT(*) FROM orders WHERE created_at > NOW() - INTERVAL '7 days') as recent_orders
      `);

      const stats = basicStats.rows[0];

      const quickStats = {
        totalVehicles: parseInt(stats.vehicle_count) || 0,
        totalParts: parseInt(stats.total_parts) || 0,
        activeParts: parseInt(stats.active_parts) || 0,
        recentOrders: parseInt(stats.recent_orders) || 0,
        timestamp: new Date().toISOString(),
        isQuick: true
      };

      console.log("⚡ Estadísticas rápidas:", quickStats);
      res.json(quickStats);
    } catch (error) {
      console.error("❌ Error en estadísticas rápidas:", error);
      res.status(500).json({ error: "Error al obtener estadísticas básicas" });
    }
  });

  // Endpoint para estadísticas completas (carga diferida)
  app.get("/api/dashboard/stats-local", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      console.log("📊 Obteniendo estadísticas completas del dashboard...");

      // Obtener conteos básicos en paralelo
      const [
        [vehicleCount],
        [partCount], 
        [activePartCount],
        recentImports,
        lastSync,
        lastApiStats
      ] = await Promise.all([
        db.select({ count: sql<number>`COUNT(*)` }).from(vehicles),
        db.select({ count: sql<number>`COUNT(*)` }).from(parts),
        db.select({ count: sql<number>`COUNT(*)` }).from(parts).where(eq(parts.activo, true)),
        db.select().from(importHistory).orderBy(desc(importHistory.startTime)).limit(5),
        db.select().from(syncControl).orderBy(desc(syncControl.lastSyncDate)).limit(1),
        db.select().from(apiStatsCache).orderBy(desc(apiStatsCache.timestamp)).limit(1)
      ]);

      console.log("📋 Datos del cache encontrados:", lastApiStats);
      const apiData = lastApiStats[0] || null;
      console.log("📋 ApiData procesado:", apiData);

      // Debug: Mostrar cálculos de porcentajes
      const vehiclePercentage = apiData?.vehiclesCount ? 
        Math.min(100, Math.round((Number(vehicleCount.count) / apiData.vehiclesCount) * 100)) : 0;
      const partPercentage = apiData?.partsCount ? 
        Math.min(100, Math.round((Number(partCount.count) / apiData.partsCount) * 100)) : 0;

      console.log("🔍 Cálculo de porcentajes:", {
        vehicleCount: Number(vehicleCount.count),
        partCount: Number(partCount.count),
        activePartCount: Number(activePartCount.count),
        apiVehicles: apiData?.vehiclesCount,
        apiParts: apiData?.partsCount,
        vehiclePercentage,
        partPercentage
      });

      const stats = {
        totalVehicles: Number(vehicleCount.count) || 0,
        totalParts: Number(partCount.count) || 0,
        activeParts: Number(activePartCount.count) || 0,
        vehicles: {
          total: Number(vehicleCount.count) || 0,
          active: Number(vehicleCount.count) || 0,
        },
        parts: {
          total: Number(partCount.count) || 0,
          active: Number(activePartCount.count) || 0,
        },
        imports: {
          recent: recentImports.length,
          lastImport: recentImports[0]?.startTime || null,
        },
        sync: {
          lastSync: lastSync[0]?.lastSyncDate || null,
          lastId: lastSync[0]?.lastId || 0,
        },
        // Mostrar últimos datos de API si están disponibles
        api: {
          vehiclesCount: apiData?.vehiclesCount || 0,
          partsCount: apiData?.partsCount || 0
        },
        database: {
          vehiclesCount: Number(vehicleCount.count) || 0,
          partsCount: Number(partCount.count) || 0,
          vehiclesImportPercentage: vehiclePercentage,
          partsImportPercentage: partPercentage
        },
        timestamp: new Date().toISOString(),
        isLocal: true, // Indicador de que son datos locales
        lastApiUpdate: apiData?.timestamp || null // Cuándo se actualizó la API por última vez
      };

      console.log("Estadísticas locales calculadas:", stats);
      res.json(stats);
    } catch (error) {
      console.error("Error al obtener estadísticas locales del dashboard:", error);
      res.status(500).json({
        error: "Error al obtener estadísticas locales",
        details: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  });

  // Endpoint para estadísticas completas del dashboard (incluye API externa y guarda en cache)
  app.get("/api/dashboard/stats", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      console.log("Obteniendo estadísticas completas del dashboard...");

      // Obtener conteos básicos
      const [vehicleCount] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(vehicles);
      const [partCount] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(parts);
      const [activePartCount] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(parts)
        .where(eq(parts.activo, true));

      // Obtener estadísticas de importaciones recientes
      const recentImports = await db
        .select()
        .from(importHistory)
        .orderBy(desc(importHistory.startTime))
        .limit(5);

      // Calcular estadísticas de sync
      const lastSync = await db
        .select()
        .from(syncControl)
        .orderBy(desc(syncControl.lastSyncDate))
        .limit(1);

      // Intentar obtener datos de API externa
      let apiData = { vehiclesCount: 0, partsCount: 0, lastApiUpdate: null };
      try {
        console.log("Consultando API externa para estadísticas...");

        // Usar endpoint interno que ya existe
        const metasyncResponse = await fetch(`http://localhost:${process.env.PORT || 5000}/api/metasync-optimized/api-stats`);
        if (metasyncResponse.ok) {
          const metasyncData = await metasyncResponse.json();
          console.log('Datos de API Metasync obtenidos:', metasyncData);

          if (metasyncData.success && metasyncData.data) {
            apiData = {
              vehiclesCount: metasyncData.data.vehiclesCount || 0,
              partsCount: metasyncData.data.partsCount || 0,
              lastApiUpdate: new Date()
            };

            // Actualizar cache con nuevos datos
            await db.insert(apiStatsCache).values({
              vehiclesCount: apiData.vehiclesCount,
              partsCount: apiData.partsCount,
              timestamp: new Date()
            });
            console.log('Datos de API guardados en cache');
          }
        }
      } catch (apiError) {
        console.warn('Error al consultar API externa, usando datos del cache:', apiError);

        // Usar datos del cache si falla la API
        const lastApiStats = await db
          .select()
          .from(apiStatsCache)
          .orderBy(desc(apiStatsCache.timestamp))
          .limit(1);

        if (lastApiStats[0]) {
          apiData = {
            vehiclesCount: lastApiStats[0].vehiclesCount,
            partsCount: lastApiStats[0].partsCount,
            lastApiUpdate: lastApiStats[0].timestamp
          };
        }
      }

      const stats = {
        totalVehicles: Number(vehicleCount.count) || 0,
        totalParts: Number(partCount.count) || 0,
        activeParts: Number(activePartCount.count) || 0,
        vehicles: {
          total: Number(vehicleCount.count) || 0,
          active: Number(vehicleCount.count) || 0,
        },
        parts: {
          total: Number(partCount.count) || 0,
          active: Number(activePartCount.count) || 0,
        },
        imports: {
          recent: recentImports.length,
          lastImport: recentImports[0]?.startTime || null,
        },
        sync: {
          lastSync: lastSync[0]?.lastSyncDate || null,
          lastId: lastSync[0]?.lastId || 0,
        },
        // Datos de API (actuales o del cache)
        api: {
          vehiclesCount: apiData.vehiclesCount,
          partsCount: apiData.partsCount
        },
        database: {
          vehiclesCount: Number(vehicleCount.count) || 0,
          partsCount: Number(partCount.count) || 0,
          vehiclesImportPercentage: apiData.vehiclesCount ? 
            Math.min(100, Math.round((Number(vehicleCount.count) / apiData.vehiclesCount) * 100)) : 0,
          partsImportPercentage: apiData.partsCount ? 
            Math.min(100, Math.round((Number(partCount.count) / apiData.partsCount) * 100)) : 0
        },
        timestamp: new Date().toISOString(),
        isLocal: false, // Indicador de que son datos completos
        lastApiUpdate: apiData.lastApiUpdate
      };

      console.log("Estadísticas completas calculadas:", stats);
      res.json(stats);
    } catch (error) {
      console.error("Error al obtener estadísticas del dashboard:", error);
      res.status(500).json({
        error: "Error al obtener estadísticas",
        details: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  });

  app.use("/api/import-recovery", importRecoveryRoutes);
  app.use('/api/import', importStatsRoutes);
  registerRelationsDiagnosticRoutes(app);
  app.use('/api/maintenance', maintenanceRouter);
  app.use('/api/import', importDebugRoutes);
  app.use('/api/metasync-optimized', metasyncOptimizedRoutes);
  app.use('/api/metasync-optimized/parts', metasyncPartLookup);


  app.use('/api/optimized-parts', optimizedPartsImportController);
  app.use('/api/metasync-optimized', metasyncApiStats);
  app.use('/api/test', testImportRouter);

  // Endpoint de piezas corregido (implementación completa)
  const partsEndpointComplete = await import('./api/parts-endpoint-complete');
  app.use('/api/parts', partsEndpointComplete.default);
  app.use('/api/fix-parts-vehicle-info', fixPartsVehicleInfoRoutes);

  // Comprehensive import endpoint - removes 1000 limit and fixes vehicle associations
  app.post('/api/comprehensive-import/parts', isAuthenticated, isAdmin, startComprehensiveImport);

  // Registrar rutas corregidas de importación (sin limitaciones)
  const importRoutesFixed = await import('./api/import-routes-fixed');
  app.use('/api/import-fixed', importRoutesFixed.default);

  // Registrar rutas sin limitaciones artificiales
  const importUnlimitedRoutes = await import('./api/import-unlimited-routes');
  app.use('/api/import-unlimited', importUnlimitedRoutes.default);

  // Endpoint para procesar piezas existentes
  app.post('/api/parts/process-existing', async (req, res) => {
    try {
      const { partsVehicleMatcher } = await import('./services/parts-vehicle-matcher.js');
      await partsVehicleMatcher.processExistingParts();
      res.json({ success: true, message: 'Piezas procesadas correctamente' });
    } catch (error) {
      console.error('Error procesando piezas existentes:', error);
      res.status(500).json({ error: 'Error procesando piezas existentes' });
    }
  });

  // Shipping calculation endpoint with zone rates
  app.post('/api/shipping/calculate', async (req: Request, res: Response) => {
    try {
      const { postalCode, province, cartItems, totalWeight } = req.body;

      if (!province || !cartItems || cartItems.length === 0) {
        return res.status(400).json({ 
          error: "Provincia y artículos del carrito son requeridos" 
        });
      }

      // Calculate total weight if not provided
      let calculatedWeight = totalWeight || 0;
      if (!calculatedWeight) {
        console.log(`📦 Calculando peso total del carrito:`);
        calculatedWeight = cartItems.reduce((total: number, item: any) => {
          // Los valores están almacenados con factor 100 (500 representa 5kg)
          const storedValue = parseFloat(item.peso || 500);
          const actualWeightKg = storedValue / 100; // 500 → 5kg
          const actualWeightGrams = actualWeightKg * 1000; // 5kg → 5000g
          console.log(`  - Pieza ${item.partId}: ${storedValue} almacenado → ${actualWeightKg}kg (${actualWeightGrams}g) x ${item.quantity} = ${actualWeightGrams * item.quantity}g`);
          return total + (actualWeightGrams * item.quantity);
        }, 0);
        console.log(`  📊 Peso total calculado: ${calculatedWeight}g`);
      }

      // Keep weight in grams for database comparison (database stores weights in grams)
      const weightInGrams = calculatedWeight;

      // Get province zone assignment
      const provinceResult = await pool.query(`
        SELECT p.id, p.name, p.shipping_zone_id, sz.name as zone_name
        FROM provinces p
        LEFT JOIN shipping_zones sz ON p.shipping_zone_id = sz.id
        WHERE LOWER(p.name) = LOWER($1)
      `, [province]);

      if (provinceResult.rows.length === 0) {
        return res.status(400).json({ 
          error: "Provincia no encontrada" 
        });
      }

      const provinceData = provinceResult.rows[0];

      if (!provinceData.shipping_zone_id) {
        return res.status(400).json({ 
          error: "Provincia no asignada a ninguna zona de envío" 
        });
      }

      // Get available shipping methods with rates for the weight range
      const shippingResult = await pool.query(`
        SELECT 
          sc.id,
          sc.name,
          sc.description,
          sc.base_price,
          sc.free_shipping_threshold,
          sc.estimated_days,
          sz.name as zone_name,
          zr.price as zone_price,
          zr.min_weight,
          zr.max_weight
        FROM shipping_config sc
        JOIN zone_rates zr ON sc.id = zr.shipping_config_id
        JOIN shipping_zones sz ON zr.shipping_zone_id = sz.id
        WHERE sc.is_active = true 
          AND sz.id = $1
          AND zr.min_weight <= $2
          AND (zr.max_weight IS NULL OR zr.max_weight >= $2)
        ORDER BY sc.name, zr.min_weight
      `, [provinceData.shipping_zone_id, weightInGrams]);

      const shippingOptions = [];
      const processedMethods = new Set();

      for (const method of shippingResult.rows) {
        if (!processedMethods.has(method.id)) {
          processedMethods.add(method.id);

          // Calculate cart subtotal for free shipping threshold
          const cartSubtotal = cartItems.reduce((total: number, item: any) => {
            return total + (parseFloat(item.price) * item.quantity);
          }, 0);

          // Check if free shipping applies
          const freeShippingThreshold = parseFloat(method.free_shipping_threshold || 0);
          const isFreeShipping = freeShippingThreshold > 0 && cartSubtotal >= freeShippingThreshold;

          const shippingCost = isFreeShipping ? 0 : parseFloat(method.zone_price);

          shippingOptions.push({
            id: method.id,
            name: method.name,
            description: method.description,
            cost: shippingCost,
            originalCost: parseFloat(method.zone_price),
            estimatedDays: method.estimated_days || 3,
            zoneName: method.zone_name,
            isFreeShipping,
            freeShippingThreshold: freeShippingThreshold,
            weightRange: {
              min: parseFloat(method.min_weight),
              max: method.max_weight ? parseFloat(method.max_weight) : null
            }
          });
        }
      }

      if (shippingOptions.length === 0) {
        return res.status(400).json({ 
          error: "No hay métodos de envío disponibles para esta zona y peso" 
        });
      }

      res.json({
        province: provinceData.name,
        zoneName: provinceData.zone_name,
        totalWeight: calculatedWeight,
        weightInGrams,
        cartSubtotal: cartItems.reduce((total: number, item: any) => {
          return total + (parseFloat(item.price) * item.quantity);
        }, 0),
        shippingOptions: shippingOptions.sort((a, b) => a.cost - b.cost)
      });

    } catch (error) {
      console.error("Error calculating shipping:", error);
      res.status(500).json({ 
        error: "Error al calcular envío",
        details: error instanceof Error ? error.message : "Error desconocido"
      });
    }
  });

  // Public provinces API endpoint for checkout
  app.get('/api/provinces', async (req: Request, res: Response) => {
    try {
      const provincesResult = await db.select({
        id: provinces.id,
        name: provinces.name,
        code: provinces.code,
        shipping_zone_id: provinces.shippingZoneId,
        created_at: provinces.createdAt,
        updated_at: provinces.updatedAt
      }).from(provinces).orderBy(asc(provinces.name));

      res.json(provincesResult);
    } catch (error) {
      console.error("Error fetching provinces:", error);
      res.status(500).json({ error: "Error al obtener provincias" });
    }
  });

  // Admin provinces API endpoint (requires authentication)
  app.get('/api/admin/provinces', async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user!.isAdmin) {
      return res.status(403).json({ error: "No autorizado" });
    }

    try {
      const provincesResult = await db.select({
        id: provinces.id,
        name: provinces.name,
        code: provinces.code,
        shipping_zone_id: provinces.shippingZoneId,
        created_at: provinces.createdAt,
        updated_at: provinces.updatedAt
      }).from(provinces).orderBy(asc(provinces.name));

      res.json(provincesResult);
    } catch (error) {
      console.error("Error fetching provinces:", error);
      res.status(500).json({ error: "Error al obtener provincias" });
    }
  });

  // Public payment methods API endpoint for checkout
  app.get('/api/payment-methods', async (req: Request, res: Response) => {
    try {
      const paymentMethodsResult = await db.select({
        id: paymentConfig.id,
        name: paymentConfig.name,
        provider: paymentConfig.provider,
        is_active: paymentConfig.isActive,
        config: paymentConfig.config
      }).from(paymentConfig).where(eq(paymentConfig.isActive, true)).orderBy(asc(paymentConfig.name));

      res.json(paymentMethodsResult);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      res.status(500).json({ error: "Error al obtener métodos de pago" });
    }
  });

  // Configurar rutas de configuración directa
  setupConfigRoutes(app);
  console.log("✅ Rutas de configuración registradas correctamente");

  // Import comprehensive final route
  const metasyncComprehensiveFinal = (await import('./api/metasync-comprehensive-final')).default;
  app.use('/api/metasync', metasyncComprehensiveFinal);

  // Optimized import routes for faster vehicle processing
  app.use('/api/optimized-import', optimizedImportRoutes);

  // Improved parts import with proper monitoring
  const improvedPartsImport = (await import('./api/improved-parts-import')).default;
  app.use('/api/metasync-optimized', improvedPartsImport);

  // CMS Routes - Usando rutas seguras temporales para evitar reinicios del servidor
  const { setupSafeCMSRoutes } = await import('./routes-temp-fix');
  setupSafeCMSRoutes(app);
  // Toda la lógica CMS ha sido movida a rutas seguras temporales
  // Servir archivos estáticos subidos
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
  console.log('✅ Static files middleware configured for /uploads');

  // Sistema de Pop-ups
  app.use('/api/popups', popupsRouter);
  app.use('/api/upload', uploadRouter);
  app.use('/api/backup', backupRouter);

  // Google Reviews routes
  setupGoogleReviewsRoutes(app);

  // SEO API routes for dynamic meta tags
  try {
    const { seoRoutes } = await import('./api/seo-routes');
    app.use('/api/seo', seoRoutes);
    console.log('✅ SEO API routes registered');
  } catch (error) {
    console.error('❌ Error registering SEO routes:', error);
  }

  console.log('✅ Routes setup completed successfully');

  // Aplicar SEO middleware como estaba funcionando
  app.use(simpleSEOMiddleware);
  console.log('✅ SEO middleware restored - funcionando como ayer');

  // Ruta de pruebas SEO para desarrollo - Servir directamente sin Vite
  app.get('/seo-test', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    const fs = require('fs');
    const testPageContent = fs.readFileSync('./seo-test.html', 'utf8');
    res.send(testPageContent);
  });

  console.log('✅ SEO test page available at /seo-test');

  // Only keep the unlimited pagination import system
  const server = createServer(app);
  return server;
}