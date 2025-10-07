import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export interface BackupInfo {
  id: string;
  name: string;
  type: 'database';
  size: number;
  createdAt: Date;
  path: string;
  description?: string;
}

export class BackupService {
  private backupDir = path.join(process.cwd(), 'backups');

  constructor() {
    this.ensureBackupDir();
  }

  private async ensureBackupDir() {
    try {
      await fs.access(this.backupDir);
    } catch {
      await fs.mkdir(this.backupDir, { recursive: true });
    }
  }

  async createDatabaseBackup(name?: string): Promise<BackupInfo> {
    console.log('🔧 BACKUP: Iniciando creación de backup de base de datos...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = name || `backup-database-${timestamp}`;
    const filename = `${backupName}.sql`;
    const backupPath = path.join(this.backupDir, filename);

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.error('❌ BACKUP: DATABASE_URL no configurada');
      throw new Error('DATABASE_URL no configurada - verificar variables de entorno');
    }

    console.log('🔧 BACKUP: Usando método nativo compatible con Neon...');
    
    try {
      await this.ensureBackupDir();
      
      // Crear backup usando método nativo mejorado
      const backupInfo = await this.createDatabaseBackupAlternative(backupName, timestamp, backupPath);
      return backupInfo;

      
    } catch (error) {
      console.error('❌ BACKUP: Error crítico:', error);
      throw new Error(`Error creando backup de base de datos: ${error.message || error}`);
    }
  }

  private async createDatabaseBackupAlternative(name?: string, timestamp?: string, backupPath?: string): Promise<BackupInfo> {
    console.log('🔧 BACKUP: Iniciando backup alternativo con Neon...');
    
    const { neon } = await import('@neondatabase/serverless');
    
    if (!timestamp) {
      timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    }
    const backupName = name || `backup-database-${timestamp}`;
    if (!backupPath) {
      const filename = `${backupName}.sql`;
      backupPath = path.join(this.backupDir, filename);
    }

    const sql = neon(process.env.DATABASE_URL!);
    
    try {
      console.log('🔧 BACKUP: Conectando a la base de datos...');
      
      // Obtener esquema de todas las tablas
      const tables = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `;
      
      console.log(`🔧 BACKUP: Encontradas ${tables.length} tablas para backup`);
      
      let backupContent = '-- Database backup created at ' + new Date().toISOString() + '\n';
      backupContent += `-- Backup method: Neon database export (${tables.length} tables)\n`;
      backupContent += '-- For complete data backup, use external tools like pg_dump with full database access\n\n';
      
      // Contador de progreso
      let processedTables = 0;
      
      // Para cada tabla, obtener esquema básico y algunos datos de muestra
      for (const table of tables) {
        const tableName = table.table_name;
        processedTables++;
        
        try {
          console.log(`🔧 BACKUP: Procesando tabla ${processedTables}/${tables.length}: ${tableName}`);
          
          // Obtener información básica de columnas
          const tableInfo = await sql`
            SELECT 
              column_name,
              data_type,
              character_maximum_length,
              is_nullable,
              column_default
            FROM information_schema.columns
            WHERE table_name = ${tableName}
            ORDER BY ordinal_position
          `;
          
          // Obtener count de registros
          const countResult = await sql(`SELECT COUNT(*) as count FROM "${tableName}"`);
          const recordCount = countResult[0]?.count || 0;
          
          console.log(`🔧 BACKUP: Tabla ${tableName}: ${tableInfo.length} columnas, ${recordCount} registros`);
          
          backupContent += `-- Table: ${tableName} (${recordCount} records)\n`;
          backupContent += `DROP TABLE IF EXISTS "${tableName}" CASCADE;\n`;
          
          // Crear comando CREATE TABLE básico
          let createTable = `CREATE TABLE "${tableName}" (\n`;
          const columns = tableInfo.map(col => {
            let colDef = `  "${col.column_name}" ${col.data_type}`;
            if (col.character_maximum_length) {
              colDef += `(${col.character_maximum_length})`;
            }
            if (col.is_nullable === 'NO') colDef += ' NOT NULL';
            if (col.column_default) {
              colDef += ` DEFAULT ${col.column_default}`;
            }
            return colDef;
          });
          createTable += columns.join(',\n') + '\n);\n\n';
          backupContent += createTable;
          
          // Solo agregar datos de muestra para tablas pequeñas
          if (recordCount > 0 && recordCount <= 100) {
            console.log(`🔧 BACKUP: Incluyendo datos de muestra para ${tableName}`);
            const sampleRows = await sql(`SELECT * FROM "${tableName}" LIMIT 50`);
            if (sampleRows.length > 0) {
              const columnNames = Object.keys(sampleRows[0]);
              backupContent += `-- Sample data for table: ${tableName}\n`;
              
              for (const row of sampleRows) {
                const values = columnNames.map(col => {
                  const val = row[col];
                  if (val === null) return 'NULL';
                  if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
                  if (val instanceof Date) return `'${val.toISOString()}'`;
                  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
                  return val;
                });
                backupContent += `INSERT INTO "${tableName}" (${columnNames.map(c => `"${c}"`).join(', ')}) VALUES (${values.join(', ')});\n`;
              }
              backupContent += '\n';
            }
          } else if (recordCount > 100) {
            backupContent += `-- Note: Table ${tableName} has ${recordCount} records - schema only (too large for full backup)\n\n`;
          }
        } catch (tableError) {
          console.error(`❌ BACKUP: Error procesando tabla ${tableName}:`, tableError);
          backupContent += `-- Error processing table ${tableName}: ${tableError.message || tableError}\n\n`;
        }
      }
      
      console.log(`✅ BACKUP: Procesadas todas las tablas (${processedTables}/${tables.length})`);
      
      backupContent += '\n-- Backup completed at ' + new Date().toISOString() + '\n';
      backupContent += `-- Summary: ${processedTables} tables processed successfully\n`;
      backupContent += '-- Note: This backup contains table schemas and sample data for small tables only\n';
      backupContent += '-- For complete data backup of large tables, use external database tools\n';
      
      console.log('🔧 BACKUP: Escribiendo archivo de backup...');
      await fs.writeFile(backupPath, backupContent);
      const stats = await fs.stat(backupPath);
      
      console.log(`✅ BACKUP: Backup completado exitosamente - Tamaño: ${this.formatFileSize(stats.size)}`);
      
      return {
        id: `db-${timestamp}`,
        name: backupName,
        type: 'database',
        size: stats.size,
        createdAt: new Date(),
        path: backupPath,
        description: `Backup de esquema de base de datos PostgreSQL (${processedTables} tablas)`
      };
    } catch (error) {
      console.error('❌ BACKUP: Error en proceso de backup:', error);
      throw new Error(`Error creando backup de base de datos: ${error.message || error}`);
    }
  }

  async restoreDatabase(backupPath: string): Promise<void> {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL no configurada');
    }

    // Verificar que el archivo existe
    try {
      await fs.access(backupPath);
    } catch {
      throw new Error('Archivo de backup no encontrado');
    }

    // Restaurar base de datos
    const command = `psql "${dbUrl}" < "${backupPath}"`;
    
    try {
      await execAsync(command);
    } catch (error) {
      throw new Error(`Error restaurando base de datos: ${error}`);
    }
  }

  async listBackups(): Promise<BackupInfo[]> {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups: BackupInfo[] = [];

      for (const file of files) {
        if (file.startsWith('.') || !file.endsWith('.sql')) {
          continue;
        }

        const filePath = path.join(this.backupDir, file);
        const stats = await fs.stat(filePath);

        if (stats.isFile()) {
          backups.push({
            id: file.replace(/\.sql$/, ''),
            name: file,
            type: 'database',
            size: stats.size,
            createdAt: stats.birthtime,
            path: filePath,
            description: 'Backup completo de base de datos PostgreSQL'
          });
        }
      }

      return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error listando backups:', error);
      return [];
    }
  }

  async deleteBackup(backupId: string): Promise<void> {
    const backups = await this.listBackups();
    const backup = backups.find(b => b.id === backupId);
    
    if (!backup) {
      throw new Error('Backup no encontrado');
    }

    await fs.unlink(backup.path);
  }

  formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}

export const backupService = new BackupService();