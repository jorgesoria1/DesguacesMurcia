/**
 * Fix Schema Type Issues
 * This script fixes the TypeScript compilation errors in schema.ts
 */

import { writeFileSync, readFileSync } from 'fs';

console.log('🔧 Fixing schema type issues...');

// Read the current schema
const schemaContent = readFileSync('shared/schema.ts', 'utf8');

// Fix the schema by replacing problematic createInsertSchema calls
const fixedSchema = schemaContent
  .replace(
    /export const insertUserSchema = createInsertSchema\(users\)\.omit\({[\s\S]*?\}\);/,
    `export const insertUserSchema = createInsertSchema(users, {
  username: true,
  password: true,
  email: true,
  firstName: true,
  lastName: true,
  address: true,
  city: true,
  postalCode: true,
  phone: true,
  province: true,
  role: true,
  isAdmin: true,
});`
  )
  .replace(
    /export const insertApiConfigSchema = createInsertSchema\(apiConfig\)\.omit\({[\s\S]*?\}\);/,
    `export const insertApiConfigSchema = createInsertSchema(apiConfig, {
  apiKey: true,
  companyId: true,
  channel: true,
});`
  )
  .replace(
    /export const insertChatbotConfigSchema = createInsertSchema\(chatbotConfig\)\.omit\({[\s\S]*?\}\);/,
    `export const insertChatbotConfigSchema = createInsertSchema(chatbotConfig, {
  code: true,
});`
  );

// Write the fixed schema
writeFileSync('shared/schema.ts', fixedSchema);

console.log('✅ Schema type issues fixed');