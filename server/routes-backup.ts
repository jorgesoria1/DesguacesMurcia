import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { metasyncApi } from "./api/metasync";
import { metasyncController } from "./api/metasyncController";
import { importScheduler } from "./services/scheduler";
import { z } from "zod";
import { insertApiConfigSchema, insertImportScheduleSchema, insertUserSchema, insertVehicleSchema, insertPartSchema, InsertImportHistory } from "../shared/schema";
import { setupAuth, isAdmin, isAuthenticated, hashPassword } from "./auth";
import { pool } from "./db";
import axios from "axios";
import { registerCartRoutes } from "./api/cart";
import { registerOrderRoutes } from "./api/orders";
import { findMatchingVehicles, matchPartWithVehicles } from "./utils/vehicle-matcher";
import { importService } from "./services/import-service";
import { importador } from "./services/importador";
import metasyncRoutes from "./api/metasyncRoutes";
import metasyncImportRoutes from "./api/metasync-import-routes";
import metasyncOptimizedRoutes from "./api/metasync-optimized-routes";
import { disableZeroPriceParts } from "./utils/disable-zero-price-parts";
import utilitiesRoutes from "./api/utilities-routes";
import importRecoveryRoutes from "./api/import-recovery";
import { mkdir, writeFile, readFile, access } from 'fs/promises';
import { eq, sql, inArray } from "drizzle-orm";
import { registerDirectSearchRoute as registerDirectSearchRoutes } from "./api/direct-search";
import { registerNativeSearchRoute as registerNativeSearchRoutes } from "./api/native-search";
import { registerBrandSpecificRoutes } from "./api/brand-routes";
import { registerPartsBrandsModelsRoutes } from "./api/parts-brands-models";

// URL base de la API Metasync (para acceder directamente en rutas raw)
const METASYNC_BASE_URL = 'https://apis.metasync.com';
const METASYNC_ALMACEN_URL = `${METASYNC_BASE_URL}/Almacen`;

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint for monitoring
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).send("OK");
  });

  // Additional health endpoint with more details
  app.get("/healthz", (_req: Request, res: Response) => {
    res.status(200).json({
      status: "OK",
      timestamp: new Date().toISOString()
    });
  });
  
  // Configurar autenticación
  setupAuth(app);

  // Inicializar el programador de importaciones
  await importScheduler.initialize();

  // MAIN PARTS SEARCH ENDPOINT
  app.get("/api/search-parts", async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 12;
      const offset = parseInt(req.query.offset as string) || 0;
      const search = req.query.search as string;
      const marca = req.query.marca as string;
      const modelo = req.query.modelo as string;
      const familia = req.query.familia as string;
      const orden = req.query.orden as string || "newest";
      const activo = req.query.activo === "true";
      const getTotalCount = req.query.getTotalCount === "true";
      
      // Build ORDER BY clause
      let orderBy = "ORDER BY p.updated_at DESC";
      switch (orden) {
        case "name_asc": orderBy = "ORDER BY p.descripcion_articulo ASC"; break;
        case "name_desc": orderBy = "ORDER BY p.descripcion_articulo DESC"; break;
        case "price_asc": orderBy = "ORDER BY CAST(p.precio AS DECIMAL) ASC"; break;
        case "price_desc": orderBy = "ORDER BY CAST(p.precio AS DECIMAL) DESC"; break;
        case "newest": orderBy = "ORDER BY p.updated_at DESC"; break;
        case "oldest": orderBy = "ORDER BY p.updated_at ASC"; break;
      }

      // Build WHERE conditions
      const conditions = ["p.activo = $1", "CAST(p.precio AS DECIMAL) > 0"];
      const params = [activo];
      let paramIndex = 2;

      if (search && search.trim() && search.trim() !== "undefined") {
        conditions.push(`p.descripcion_articulo ILIKE $${paramIndex}`);
        params.push(`%${search.trim()}%`);
        paramIndex++;
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

      // Main query
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
          p.imagenes,
          p.activo,
          p.fecha_creacion as "fechaCreacion",
          p.updated_at as "fechaActualizacion",
          p.vehicle_marca as "vehicleMarca",
          p.vehicle_modelo as "vehicleModelo",
          p.vehicle_version as "vehicleVersion",
          p.vehicle_anyo as "vehicleAnyo"
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
        const countParams = params.slice(0, -2); // Remove limit and offset
        const countResult = await pool.query(countQuery, countParams);
        total = parseInt(countResult.rows[0].total);
      }

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
      console.error("Error in parts search:", error);
      res.status(500).json({ 
        error: "Internal server error",
        data: [],
        pagination: { total: 0, limit: limit || 12, offset: offset || 0, hasMore: false }
      });
    }
  });

  // Register cart routes
  registerCartRoutes(app);

  // Register order routes  
  registerOrderRoutes(app);

  // Register brand specific routes
  registerBrandSpecificRoutes(app);

  // Register parts brands models routes
  registerPartsBrandsModelsRoutes(app);

  // Register metasync routes
  metasyncRoutes(app);
  metasyncImportRoutes(app);
  metasyncOptimizedRoutes(app);
  utilitiesRoutes(app);
  importRecoveryRoutes(app);

  // Register direct search routes
  registerDirectSearchRoutes(app);
  registerNativeSearchRoutes(app);

  const server = createServer(app);
  return server;
}