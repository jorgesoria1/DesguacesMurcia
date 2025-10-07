import crypto from 'crypto';
import { BasePaymentModule, PaymentResult, PaymentOrder } from './base-payment-module.js';

/**
 * NUEVO MÓDULO REDSYS - IMPLEMENTACIÓN OFICIAL
 * Basado en documentación oficial TPV-Virtual Manual V3.0
 * y mejores prácticas de implementación en producción
 */

export class RedsysModuleNew extends BasePaymentModule {
  protected provider = 'redsys';
  protected name = 'Redsys TPV Virtual';
  
  private redsysConfig: {
    merchantCode: string;
    terminal: string;
    secretKey: string;
    environment: 'test' | 'production';
    urlOk: string;
    urlKo: string;
  };
  constructor(config: any, isActive: boolean = false) {
    super(config, isActive);
    
    // Manejar configuración vacía o undefined
    const safeConfig = config || {};
    
    this.redsysConfig = {
      merchantCode: safeConfig.merchantCode || safeConfig.merchant_code || '',
      terminal: safeConfig.terminal || '001',
      secretKey: safeConfig.secretKey || safeConfig.secret_key || '',
      environment: safeConfig.environment || 'test',
      urlOk: safeConfig.urlOk || safeConfig.success_url || '',
      urlKo: safeConfig.urlKo || safeConfig.error_url || ''
    };
  }

  /**
   * Validar configuración del módulo
   */
  validateConfig(): boolean {
    // Si no hay configuración, devolver false sin error
    if (!this.redsysConfig) {
      return false;
    }
    
    return !!(
      this.redsysConfig.merchantCode &&
      this.redsysConfig.terminal &&
      this.redsysConfig.secretKey &&
      this.redsysConfig.merchantCode.trim() !== '' &&
      this.redsysConfig.terminal.trim() !== '' &&
      this.redsysConfig.secretKey.trim() !== ''
    );
  }

  /**
   * Validación para modo demo - menos estricta
   */
  validateConfigForDemo(): boolean {
    if (!this.redsysConfig) {
      return false;
    }
    
    return !!(
      this.redsysConfig.merchantCode &&
      this.redsysConfig.terminal &&
      this.redsysConfig.secretKey &&
      this.redsysConfig.merchantCode !== '123456789' &&
      this.redsysConfig.secretKey !== 'c2VjcmV0a2V5YmFzZTY0dGVzdA=='
    );
  }

  /**
   * Obtener campos de configuración para administración
   */
  getConfigFields() {
    return [
      {
        name: 'merchantCode',
        label: 'Código de Comercio',
        type: 'text' as const,
        required: true,
        description: 'Código de comercio proporcionado por Redsys'
      },
      {
        name: 'terminal',
        label: 'Terminal',
        type: 'text' as const,
        required: true,
        description: 'Número de terminal (normalmente 001)'
      },
      {
        name: 'secretKey',
        label: 'Clave Secreta',
        type: 'password' as const,
        required: true,
        description: 'Clave secreta proporcionada por Redsys (Base64)'
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
        description: 'Entorno de Redsys a utilizar'
      }
    ];
  }

  /**
   * Verificar transacción (implementación base)
   */
  async verifyTransaction(transactionId: string): Promise<PaymentResult> {
    return {
      success: true,
      data: { verified: true, transactionId }
    };
  }

  /**
   * Genera número de pedido compatible con Redsys (máximo 12 caracteres)
   * Formato: YYYYMMDDNNNN (fecha + 4 dígitos secuenciales)
   */
  private generateRedsysOrderNumber(originalOrderNumber: string): string {
    const today = new Date();
    const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    
    // Extraer número secuencial del pedido original o generar uno aleatorio
    const numbers = originalOrderNumber.replace(/\D/g, '');
    const sequence = numbers.slice(-4).padStart(4, '0') || Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    
    const redsysNumber = datePrefix + sequence; // YYYYMMDDNNNN = 12 caracteres exactos
    
    return redsysNumber;
  }

  /**
   * Codificación Base64 estándar
   */
  private base64Encode(data: string): string {
    return Buffer.from(data, 'utf8').toString('base64');
  }

  /**
   * Decodificación Base64 estándar
   */
  private base64Decode(data: string): string {
    return Buffer.from(data, 'base64').toString('utf8');
  }

  /**
   * Encriptación 3DES según implementación oficial Redsys
   * Copiado exactamente del código oficial de PrestaShop
   */
  private encrypt3DES(message: string, key: Buffer): Buffer {
    // IV por defecto como en el código oficial
    const iv = Buffer.alloc(8, 0); // {0, 0, 0, 0, 0, 0, 0, 0}
    
    // Padding manual al tamaño de bloque de 8 bytes
    const blockSize = 8;
    const padLength = blockSize - (message.length % blockSize);
    const paddedMessage = message + '\0'.repeat(padLength);
    
    // Encriptación con des-ede3-cbc (3DES) exactamente como el código oficial
    const cipher = crypto.createCipheriv('des-ede3-cbc', key, iv);
    cipher.setAutoPadding(false); // Usamos padding manual
    
    let encrypted = cipher.update(paddedMessage, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    return encrypted;
  }

  /**
   * Genera firma según implementación oficial Redsys
   * Basado exactamente en createMerchantSignature() del código oficial
   */
  private createSignature(merchantParameters: string, orderNumber: string): string {
    try {

      // Paso 1: Decodificar la clave Base64 (como en el código oficial)
      const key = Buffer.from(this.redsysConfig.secretKey, 'base64');

      // Paso 2: Diversificar la clave con el número de pedido usando 3DES (código oficial)
      const derivedKey = this.encrypt3DES(orderNumber, key);

      // Paso 3: MAC256 del parámetro Ds_MerchantParameters (código oficial)
      const hmac = crypto.createHmac('sha256', derivedKey);
      hmac.update(merchantParameters, 'utf8');
      const mac = hmac.digest();

      // Paso 4: Codificar resultado en Base64 (código oficial)
      const signature = mac.toString('base64');

      return signature;

    } catch (error) {
      throw new Error('Error generando firma Redsys');
    }
  }

  /**
   * Procesa un pago con Redsys
   */
  async processPayment(order: PaymentOrder): Promise<PaymentResult> {
    try {
      // Generar número de pedido válido para Redsys
      const redsysOrderNumber = this.generateRedsysOrderNumber(order.orderNumber);
      
      // Validar longitud crítica
      if (redsysOrderNumber.length !== 12) {
        throw new Error(`Número de pedido debe tener exactamente 12 caracteres: ${redsysOrderNumber} (${redsysOrderNumber.length})`);
      }

      // Preparar parámetros según especificación oficial
      const merchantData = {
        DS_MERCHANT_AMOUNT: Math.round(order.amount * 100).toString(),
        DS_MERCHANT_ORDER: redsysOrderNumber,
        DS_MERCHANT_MERCHANTCODE: this.redsysConfig.merchantCode,
        DS_MERCHANT_CURRENCY: '978', // EUR
        DS_MERCHANT_TRANSACTIONTYPE: '0', // Autorización
        DS_MERCHANT_TERMINAL: this.redsysConfig.terminal.padStart(3, '0'),
        DS_MERCHANT_MERCHANTURL: `https://${process.env.CLOUD_DOMAIN || 'localhost:5000'}/api/payment/redsys/callback`,
        DS_MERCHANT_URLOK: this.redsysConfig.urlOk || `https://${process.env.CLOUD_DOMAIN}/payment/success`,
        DS_MERCHANT_URLKO: this.redsysConfig.urlKo || `https://${process.env.CLOUD_DOMAIN}/payment/failure`,
        DS_MERCHANT_CONSUMERLANGUAGE: '001', // Español
        DS_MERCHANT_PRODUCTDESCRIPTION: `Compra Desguace Murcia ${redsysOrderNumber}`,
        DS_MERCHANT_TITULAR: order.customerName
      };

      // Codificar en Base64
      const merchantParameters = this.base64Encode(JSON.stringify(merchantData));
      
      // Generar firma
      const signature = this.createSignature(merchantParameters, redsysOrderNumber);

      // URL del TPV
      const actionUrl = this.redsysConfig.environment === 'production' 
        ? 'https://sis.redsys.es/sis/realizarPago'
        : 'https://sis-t.redsys.es:25443/sis/realizarPago';

      // Generar formulario HTML
      const formHtml = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pago Seguro - Redsys</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background: #f5f5f5; 
        }
        .loading {
            display: inline-block;
            width: 40px;
            height: 40px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #2196F3;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <h2>Conectando con el sistema de pago seguro...</h2>
    <p>Le estamos redirigiendo a Redsys para completar su pago.</p>
    <div class="loading"></div>
    
    <form id="redsysForm" action="${actionUrl}" method="POST" style="display: none;">
        <input type="hidden" name="Ds_SignatureVersion" value="HMAC_SHA256_V1" />
        <input type="hidden" name="Ds_MerchantParameters" value="${merchantParameters}" />
        <input type="hidden" name="Ds_Signature" value="${signature}" />
    </form>
    
    <script>
        setTimeout(() => {
            document.getElementById('redsysForm').submit();
        }, 2000);
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
          orderNumber: order.orderNumber,
          redsysOrderNumber,
          amount: Math.round(order.amount * 100),
          reference: order.orderNumber
        }
      };

    } catch (error) {
      return {
        success: false,
        errorMessage: `Error procesando pago: ${error.message}`
      };
    }
  }

  /**
   * Verifica la firma de respuesta de Redsys
   */
  async handleCallback(requestBody: any): Promise<PaymentResult> {
    try {
      const { Ds_SignatureVersion, Ds_MerchantParameters, Ds_Signature } = requestBody;
      
      if (!Ds_MerchantParameters || !Ds_Signature) {
        throw new Error('Parámetros de callback incompletos');
      }

      const decodedParams = JSON.parse(this.base64Decode(Ds_MerchantParameters));

      // Verificar firma (normalizar caracteres base64)
      const expectedSignature = this.createSignature(Ds_MerchantParameters, decodedParams.Ds_Order);
      const normalizedExpected = expectedSignature.replace(/\+/g, '-').replace(/\//g, '_');
      const normalizedReceived = Ds_Signature.replace(/\+/g, '-').replace(/\//g, '_');
      
      if (normalizedExpected !== normalizedReceived) {
        throw new Error('Firma de respuesta inválida');
      }

      return {
        success: true,
        data: {
          orderNumber: decodedParams.Ds_Order,
          amount: parseInt(decodedParams.Ds_Amount) / 100,
          currency: decodedParams.Ds_Currency,
          responseCode: decodedParams.Ds_Response,
          authCode: decodedParams.Ds_AuthorisationCode,
          transactionType: decodedParams.Ds_TransactionType
        }
      };

    } catch (error) {
      return {
        success: false,
        errorMessage: `Error verificando callback: ${error.message}`
      };
    }
  }
}

export default RedsysModuleNew;