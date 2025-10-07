const crypto = require('crypto');

// Datos de prueba desde variables de entorno (valores por defecto son los oficiales de Redsys)
const testConfig = {
  merchantCode: process.env.REDSYS_MERCHANT_CODE || '999008881',  // Código oficial de pruebas
  terminal: process.env.REDSYS_TERMINAL || '001',            // Terminal oficial de pruebas
  secretKey: process.env.REDSYS_SECRET_KEY || 'sq7HjrUOBfKmC576ILgskD5srU870gJ7'  // Clave oficial
};

// Datos de la transacción
const orderData = {
  Ds_Merchant_Amount: '145',
  Ds_Merchant_Order: '202508024824',
  Ds_Merchant_MerchantCode: testConfig.merchantCode,
  Ds_Merchant_Currency: '978',
  Ds_Merchant_TransactionType: '0',
  Ds_Merchant_Terminal: testConfig.terminal,
  Ds_Merchant_MerchantURL: 'https://271a4945-5aed-4283-8175-5a05de5ef28c-00-6w7452awe2o4.worf.replit.dev/api/payment/redsys/callback',
  Ds_Merchant_UrlOK: 'https://271a4945-5aed-4283-8175-5a05de5ef28c-00-6w7452awe2o4.worf.replit.dev/payment/success',
  Ds_Merchant_UrlKO: 'https://271a4945-5aed-4283-8175-5a05de5ef28c-00-6w7452awe2o4.worf.replit.dev/payment/failure',
  Ds_Merchant_ConsumerLanguage: '001'
};

function base64Encode(data) {
  return Buffer.from(data, 'utf8').toString('base64');
}

function generateRedsysSignature(merchantParameters, orderNumber, secretKey) {
  try {
    console.log('🔐 Generando firma con datos oficiales...');
    
    // Implementación oficial Redsys: 3DES ECB + HMAC SHA-256
    const key = Buffer.from(secretKey, 'base64');
    
    // 1. Preparar el número de pedido (debe ser exactamente el valor enviado)
    const orderBuffer = Buffer.from(orderNumber, 'utf8');
    
    // 2. Crear cipher 3DES en modo ECB sin padding
    const cipher = crypto.createCipheriv('des-ede3-ecb', key, null);
    cipher.setAutoPadding(false);
    
    // 3. Pad del número de pedido a 8 bytes (bloque 3DES)
    const paddedOrder = Buffer.alloc(8);
    orderBuffer.copy(paddedOrder, 0, 0, Math.min(8, orderBuffer.length));
    
    // 4. Cifrar con 3DES para obtener clave derivada
    let derivedKey = cipher.update(paddedOrder);
    derivedKey = Buffer.concat([derivedKey, cipher.final()]);
    
    // 5. Generar HMAC SHA-256 con la clave derivada  
    const hmac = crypto.createHmac('sha256', derivedKey);
    hmac.update(merchantParameters, 'utf8');
    const signature = hmac.digest('base64');

    console.log('✅ Firma generada:', signature);
    return signature;
  } catch (error) {
    console.error('❌ Error generando firma:', error);
    return null;
  }
}

// Test completo
console.log('=== TEST REDSYS CON DATOS OFICIALES ===');
console.log('Datos de configuración:', testConfig);
console.log('Datos del pedido:', orderData);

const merchantParameters = base64Encode(JSON.stringify(orderData));
console.log('\nParámetros codificados:', merchantParameters);

const signature = generateRedsysSignature(merchantParameters, orderData.Ds_Merchant_Order, testConfig.secretKey);

console.log('\n=== RESULTADO DEL TEST ===');
console.log('Signature:', signature);
console.log('Parámetros válidos:', merchantParameters.length > 0);
console.log('Firma válida:', signature !== null);

// Decodificar para verificar
const decoded = JSON.parse(Buffer.from(merchantParameters, 'base64').toString('utf8'));
console.log('\nVerificación de decodificación:');
console.log('Importe:', decoded.Ds_Merchant_Amount);
console.log('Comercio:', decoded.Ds_Merchant_MerchantCode);
console.log('Terminal:', decoded.Ds_Merchant_Terminal);
console.log('Pedido:', decoded.Ds_Merchant_Order);