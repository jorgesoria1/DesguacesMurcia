/**
 * Base Payment Module - Estructura base para módulos de pago estilo PrestaShop
 */

export interface PaymentModuleConfig {
  [key: string]: any;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  redirectUrl?: string;
  errorMessage?: string;
  data?: any;
}

export interface PaymentOrder {
  id: number;
  orderNumber: string;
  amount: number;
  currency: string;
  description: string;
  customerEmail: string;
  customerName: string;
  returnUrl: string;
  cancelUrl: string;
  metadata?: any;
}

export abstract class BasePaymentModule {
  protected config: PaymentModuleConfig;
  protected isActive: boolean;
  protected name: string;
  protected provider: string;

  constructor(config: PaymentModuleConfig, isActive: boolean = false) {
    this.config = config;
    this.isActive = isActive !== undefined ? isActive : false;
    this.validateConfig();
  }

  /**
   * Valida la configuración del módulo
   */
  abstract validateConfig(): boolean;

  /**
   * Genera el formulario de pago o inicia el proceso de pago
   */
  abstract processPayment(order: PaymentOrder): Promise<PaymentResult>;

  /**
   * Procesa la respuesta de confirmación del gateway
   */
  abstract handleCallback(requestBody: any, headers: any): Promise<PaymentResult>;

  /**
   * Verifica el estado de una transacción
   */
  abstract verifyTransaction(transactionId: string): Promise<PaymentResult>;

  /**
   * Obtiene la configuración disponible para el administrador
   */
  abstract getConfigFields(): Array<{
    name: string;
    label: string;
    type: 'text' | 'password' | 'select' | 'checkbox';
    required: boolean;
    options?: Array<{value: string, label: string}>;
    description?: string;
  }>;

  /**
   * Indica si el módulo está correctamente configurado
   */
  isConfigured(): boolean {
    return this.isActive && this.validateConfig();
  }

  /**
   * Validación para modo demo - menos estricta, por defecto usa validateConfig
   */
  validateConfigForDemo(): boolean {
    return this.validateConfig();
  }

  /**
   * Obtiene el nombre del módulo
   */
  getName(): string {
    return this.name;
  }

  /**
   * Obtiene el proveedor del módulo
   */
  getProvider(): string {
    return this.provider;
  }

  /**
   * Obtiene la configuración actual
   */
  getConfig(): PaymentModuleConfig {
    return this.config;
  }

  /**
   * Actualiza la configuración del módulo
   */
  updateConfig(newConfig: PaymentModuleConfig): void {
    this.config = { ...this.config, ...newConfig };
    this.validateConfig();
  }

  /**
   * Habilita o deshabilita el módulo
   */
  setActive(active: boolean): void {
    this.isActive = active;
  }

  /**
   * Obtiene el estado activo del módulo
   */
  getIsActive(): boolean {
    return this.isActive !== undefined ? this.isActive : false;
  }

  /**
   * Genera un hash seguro para validaciones
   */
  protected generateHash(data: string, key: string): string {
    const crypto = require('crypto');
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }

  /**
   * Valida un hash recibido
   */
  protected validateHash(data: string, receivedHash: string, key: string): boolean {
    const expectedHash = this.generateHash(data, key);
    return expectedHash === receivedHash;
  }
}