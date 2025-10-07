/**
 * Módulo de pago Redsys - Integración con pasarela de pago española
 */

import { BasePaymentModule, PaymentModuleConfig, PaymentResult, PaymentOrder } from './base-payment-module';
import * as crypto from 'crypto';

export class RedsysPaymentModule extends BasePaymentModule {
  protected name = 'Redsys';
  protected provider = 'redsys';

  constructor(config: PaymentModuleConfig, isActive: boolean) {
    super(config, isActive);
  }

  validateConfig(): boolean {
    const required = ['merchantCode', 'secretKey', 'terminal'];
    const isValid = required.every(field => {
      const value = this.config[field];
      const hasValue = value && value.toString().trim() !== '';
      return hasValue;
    });
    return isValid;
  }

  // Validación para modo demo - menos estricta
  validateConfigForDemo(): boolean {
    return this.config.merchantCode !== undefined && 
           this.config.secretKey !== undefined && 
           this.config.terminal !== undefined &&
           this.config.merchantCode !== '' &&
           this.config.secretKey !== '' &&
           this.config.terminal !== '' &&
           this.config.merchantCode !== '123456789' &&
           this.config.secretKey !== 'c2VjcmV0a2V5YmFzZTY0dGVzdA==';
  }

  getConfigFields() {
    return [
      {
        name: 'merchantCode',
        label: 'Código de Comercio',
        type: 'text' as const,
        required: true,
        description: 'Código único de comercio asignado por Redsys'
      },
      {
        name: 'secretKey',
        label: 'Clave Secreta SHA256',
        type: 'password' as const,
        required: true,
        description: 'Clave secreta para firmar las peticiones'
      },
      {
        name: 'terminal',
        label: 'Terminal',
        type: 'text' as const,
        required: true,
        description: 'Número de terminal (normalmente 1)'
      },
      {
        name: 'environment',
        label: 'Entorno',
        type: 'select' as const,
        required: true,
        options: [
          { value: 'test', label: 'Pruebas' },
          { value: 'production', label: 'Producción' }
        ],
        description: 'Entorno de ejecución'
      },
      {
        name: 'urlOk',
        label: 'URL de Éxito',
        type: 'text' as const,
        required: true,
        description: 'URL a la que redirigir tras pago exitoso'
      },
      {
        name: 'urlKo',
        label: 'URL de Error',
        type: 'text' as const,
        required: true,
        description: 'URL a la que redirigir tras pago fallido'
      }
    ];
  }

  async processPayment(order: PaymentOrder): Promise<PaymentResult> {

    if (!this.validateConfig()) {
      return {
        success: false,
        errorMessage: 'Configuración de Redsys incompleta'
      };
    }

    try {
      // Generar número de pedido único de 12 caracteres (formato YYYYMMDD + 4 dígitos)
      const redsysOrderNumber = this.generateRedsysOrderNumber(order.orderNumber);
      
      // Preparar datos del pedido según documentación oficial Redsys (MAYÚSCULAS OFICIALES)
      const orderData = {
        // PARÁMETROS OBLIGATORIOS - FORMATO OFICIAL REDSYS SEGÚN MANUAL V3.0
        DS_MERCHANT_AMOUNT: Math.round(order.amount * 100).toString(), // Importe en céntimos
        DS_MERCHANT_ORDER: redsysOrderNumber, // Número de pedido (12 caracteres)
        DS_MERCHANT_MERCHANTCODE: this.config.merchantCode, // Código FUC del comercio
        DS_MERCHANT_CURRENCY: '978', // Euro (código ISO 4217)
        DS_MERCHANT_TRANSACTIONTYPE: '0', // Autorización
        DS_MERCHANT_TERMINAL: this.config.terminal.padStart(3, '0'), // Terminal (3 dígitos)
        
        // URLS DE RESPUESTA
        DS_MERCHANT_MERCHANTURL: `https://${process.env.CLOUD_DOMAIN || 'localhost:5000'}/api/payment/redsys/callback`,
        DS_MERCHANT_URLOK: this.config.urlOk,
        DS_MERCHANT_URLKO: this.config.urlKo,
        
        // PARÁMETROS OPCIONALES
        DS_MERCHANT_CONSUMERLANGUAGE: '001', // Español
        DS_MERCHANT_PRODUCTDESCRIPTION: `Compra en Desguace Murcia - Ref ${redsysOrderNumber}`,
        DS_MERCHANT_TITULAR: order.customerName,
        // ⚠️ OMITIR MERCHANTDATA TEMPORALMENTE PARA EVITAR PROBLEMAS JSON
        // DS_MERCHANT_MERCHANTDATA: `ORDER_${redsysOrderNumber}`
      };

      if (redsysOrderNumber.length > 12) {
        return {
          success: false,
          errorMessage: `Error interno: número de pedido muy largo (${redsysOrderNumber.length} caracteres)`
        };
      }

      // Codificar parámetros
      const merchantParameters = this.base64Encode(JSON.stringify(orderData));
      
      // Generar firma usando el número de pedido de Redsys
      const signature = this.generateRedsysSignature(merchantParameters, redsysOrderNumber);

      // URL del formulario según el entorno
      const actionUrl = this.config.environment === 'production' 
        ? 'https://sis.redsys.es/sis/realizarPago'
        : 'https://sis-t.redsys.es:25443/sis/realizarPago';

      // Generar formulario HTML según especificación oficial Redsys
      const formHtml = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Redirigiendo a Redsys...</title>
</head>
<body>
    <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
        <h2>Redirigiendo al sistema de pago seguro...</h2>
        <p>Por favor, espere mientras le redirigimos.</p>
        <div style="margin: 20px 0;">
            <div style="display: inline-block; width: 40px; height: 40px; border: 3px solid #f3f3f3; border-top: 3px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        </div>
    </div>
    
    <form id="redsys-form" name="from" action="${actionUrl}" method="POST" style="display: none;">
        <input type="hidden" name="Ds_SignatureVersion" value="HMAC_SHA256_V1" />
        <input type="hidden" name="Ds_MerchantParameters" value="${merchantParameters}" />
        <input type="hidden" name="Ds_Signature" value="${signature}" />
    </form>
    
    <style>
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
    
    <script>
        // Envío automático del formulario
        window.onload = function() {
            setTimeout(function() {
                document.getElementById('redsys-form').submit();
            }, 1000);
        };
    </script>
</body>
</html>`;

      return {
        success: true,
        data: {
          formHtml,
          actionUrl,
          merchantParameters,
          signature,
          orderNumber: order.orderNumber, // ✅ AÑADIDO: número de pedido original
          redsysOrderNumber, // Número de pedido adaptado para Redsys
          amount: Math.round(order.amount * 100), // ✅ AÑADIDO: importe en céntimos
          reference: order.orderNumber, // ✅ AÑADIDO: referencia del pedido
          orderData // Para debugging
        }
      };

    } catch (error) {
      console.error('Error processing Redsys payment:', error);
      return {
        success: false,
        errorMessage: 'Error al procesar el pago con Redsys'
      };
    }
  }

  async handleCallback(requestBody: any, headers: any): Promise<PaymentResult> {
    try {
      const { Ds_SignatureVersion, Ds_MerchantParameters, Ds_Signature } = requestBody;

      if (!Ds_MerchantParameters || !Ds_Signature) {
        return {
          success: false,
          errorMessage: 'Parámetros faltantes en la respuesta de Redsys'
        };
      }

      const decodedParams = JSON.parse(this.base64Decode(Ds_MerchantParameters));

      // El número de pedido viene en Ds_Order (respuesta) no Ds_Merchant_Order
      const orderNumber = decodedParams.Ds_Order;
      
      // Verificar firma usando el algoritmo correcto
      const expectedSignature = this.generateRedsysSignature(Ds_MerchantParameters, orderNumber);

      if (Ds_Signature !== expectedSignature) {
        return {
          success: false,
          errorMessage: 'Firma inválida - verificación de seguridad fallida'
        };
      }

      // Verificar código de respuesta según documentación Redsys
      const responseCode = decodedParams.Ds_Response;
      const isSuccessful = responseCode !== undefined && 
                          parseInt(responseCode) >= 0 && 
                          parseInt(responseCode) <= 99;

      return {
        success: isSuccessful,
        transactionId: decodedParams.Ds_AuthorisationCode,
        data: {
          ...decodedParams,
          responseCode,
          orderNumber,
          amount: parseInt(decodedParams.Ds_Amount) / 100 // Convertir de céntimos a euros
        }
      };

    } catch (error) {
      return {
        success: false,
        errorMessage: 'Error al procesar la respuesta de Redsys: ' + error.message
      };
    }
  }

  async verifyTransaction(transactionId: string): Promise<PaymentResult> {
    // Redsys no proporciona API REST para verificar transacciones
    // La verificación se hace en el callback
    return {
      success: true,
      transactionId,
      data: { verified: true }
    };
  }

  private base64Encode(data: string): string {
    return Buffer.from(data, 'utf8').toString('base64');
  }

  private base64Decode(data: string): string {
    return Buffer.from(data, 'base64').toString('utf8');
  }

  private generateRedsysOrderNumber(originalOrderNumber?: string): string {
    // Generar número de pedido único de exactamente 12 caracteres
    // Formato: YYYYMMDD + 4 dígitos basados en el número original o timestamp
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    
    // Extraer números del pedido original o usar timestamp
    let orderDigits = '0000';
    if (originalOrderNumber) {
      const digits = originalOrderNumber.replace(/\D/g, '');
      if (digits.length > 0) {
        orderDigits = digits.slice(-4).padStart(4, '0');
      }
    }
    
    // Si no hay dígitos del pedido, usar últimos 4 dígitos del timestamp
    if (orderDigits === '0000') {
      orderDigits = Date.now().toString().slice(-4);
    }
    
    const redsysOrderNumber = year + month + day + orderDigits;
    
    // Asegurar que tiene exactamente 12 caracteres
    return redsysOrderNumber.slice(0, 12);
  }

  private generateRedsysSignature(merchantParameters: string, orderNumber: string): string {
    try {
      // Implementación oficial Redsys: 3DES ECB + HMAC SHA-256
      const secretKey = Buffer.from(this.config.secretKey, 'base64');
      
      // 1. Preparar el número de pedido (debe ser exactamente el valor enviado)
      const orderBuffer = Buffer.from(orderNumber, 'utf8');
      
      // 2. Crear cipher 3DES en modo ECB sin padding
      const cipher = crypto.createCipheriv('des-ede3-ecb', secretKey, null);
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

      return signature;
    } catch (error) {
      throw new Error('Error al generar firma de Redsys: ' + error.message);
    }
  }
}