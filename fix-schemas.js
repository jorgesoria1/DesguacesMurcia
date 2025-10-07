#!/usr/bin/env node

/**
 * Schema Fix Script
 * Systematically fixes Drizzle schema validation errors
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing schema validation errors...');

const schemaPath = path.join(__dirname, 'shared', 'schema.ts');
let content = fs.readFileSync(schemaPath, 'utf8');

// Pattern to match createInsertSchema with refinements
const refinementPattern = /export const (\w+Schema) = createInsertSchema\((\w+),\s*\{[^}]*\}\s*\)\.omit\(/g;

let matches = [];
let match;
while ((match = refinementPattern.exec(content)) !== null) {
  matches.push({
    schemaName: match[1],
    tableName: match[2],
    fullMatch: match[0]
  });
}

console.log(`Found ${matches.length} schemas with refinements to fix`);

// Replace each schema with a simple version
matches.forEach(({ schemaName, tableName, fullMatch }) => {
  const simplifiedSchema = `export const ${schemaName} = createInsertSchema(${tableName}).omit(`;
  content = content.replace(fullMatch, simplifiedSchema);
  console.log(`✅ Fixed ${schemaName}`);
});

// Write the fixed content
fs.writeFileSync(schemaPath, content);
console.log('✅ Schema fixes completed');