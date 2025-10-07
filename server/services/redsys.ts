
import crypto from "crypto";

interface RedsysConfig {
  merchantCode: string;
  terminal: string;
  secretKey: string;
  environment: "test" | "production";
}

interface PaymentRequest {
  orderId: string;
  amount: number; // En céntimos
  currency: string;
  description: string;
  customerEmail?: string;
  merchantUrl?: string;
  successUrl: string;
  errorUrl: string;
}

export class RedsysService {
  private config: RedsysConfig;
  private urls = {
    test: "https://sis-t.redsys.es:25443/sis/realizarPago",
    production: "https://sis.redsys.es/sis/realizarPago"
  };

  constructor(config: RedsysConfig) {
    this.config = config;
  }

  generatePaymentForm(request: PaymentRequest): string {
    const merchantParameters = this.createMerchantParameters(request);
    const signature = this.createSignature(merchantParameters);

    const formUrl = this.urls[this.config.environment];

    return `
      <form id="redsys-form" action="${formUrl}" method="POST">
        <input type="hidden" name="Ds_SignatureVersion" value="HMAC_SHA256_V1" />
        <input type="hidden" name="Ds_MerchantParameters" value="${merchantParameters}" />
        <input type="hidden" name="Ds_Signature" value="${signature}" />
      </form>
      <script>
        document.getElementById('redsys-form').submit();
      </script>
    `;
  }

  private createMerchantParameters(request: PaymentRequest): string {
    const params = {
      DS_MERCHANT_AMOUNT: request.amount.toString(),
      DS_MERCHANT_ORDER: request.orderId,
      DS_MERCHANT_MERCHANTCODE: this.config.merchantCode,
      DS_MERCHANT_CURRENCY: request.currency === "EUR" ? "978" : "978",
      DS_MERCHANT_TRANSACTIONTYPE: "0",
      DS_MERCHANT_TERMINAL: this.config.terminal,
      DS_MERCHANT_MERCHANTURL: request.merchantUrl,
      DS_MERCHANT_URLOK: request.successUrl,
      DS_MERCHANT_URLKO: request.errorUrl,
      DS_MERCHANT_PRODUCTDESCRIPTION: request.description,
      DS_MERCHANT_CONSUMERLANGUAGE: "001"
    };

    return Buffer.from(JSON.stringify(params)).toString("base64");
  }

  private createSignature(merchantParameters: string): string {
    const key = Buffer.from(this.config.secretKey, "base64");
    const orderData = JSON.parse(Buffer.from(merchantParameters, "base64").toString());
    const orderId = orderData.DS_MERCHANT_ORDER;
    
    // Usar createCipheriv en lugar del deprecado createCipher
    const iv = Buffer.alloc(8, 0); // DES-EDE3 requiere IV de 8 bytes
    const cipher = crypto.createCipheriv("des-ede3-cbc", key, iv);
    cipher.setAutoPadding(false);
    
    let encrypted = cipher.update(orderId, "utf8", "binary");
    encrypted += cipher.final("binary");
    
    const hmac = crypto.createHmac("sha256", Buffer.from(encrypted, "binary"));
    hmac.update(merchantParameters);
    
    return hmac.digest("base64");
  }

  verifyResponse(merchantParameters: string, signature: string): boolean {
    try {
      const calculatedSignature = this.createSignature(merchantParameters);
      // Normalizar caracteres base64 para comparación
      const normalizedCalculated = calculatedSignature.replace(/\+/g, '-').replace(/\//g, '_');
      const normalizedReceived = signature.replace(/\+/g, '-').replace(/\//g, '_');
      return normalizedCalculated === normalizedReceived;
    } catch (error) {
      return false;
    }
  }

  parseResponse(merchantParameters: string): any {
    try {
      return JSON.parse(Buffer.from(merchantParameters, "base64").toString());
    } catch (error) {
      throw new Error("Invalid merchant parameters");
    }
  }
}
