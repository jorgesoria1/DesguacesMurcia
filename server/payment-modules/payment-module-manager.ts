/**
 * Gestor de Módulos de Pago - Administra todos los módulos de pago disponibles
 */

import { BasePaymentModule, PaymentResult, PaymentOrder } from './base-payment-module';
import { RedsysModuleNew } from './redsys-module-new.js';
import { PayPalPaymentModule } from './paypal-module';
import { StripePaymentModule } from './stripe-module';
import { BankTransferPaymentModule } from './bank-transfer-module';
import { CashModule } from './cash-module';

export class PaymentModuleManager {
  private modules: Map<string, BasePaymentModule> = new Map();

  constructor() {
    // Los módulos se inicializarán cuando se cargue la configuración
  }

  /**
   * Inicializar módulos con configuración de base de datos
   */
  async initializeModules(paymentConfigs: any[]) {
    this.modules.clear();

    for (const config of paymentConfigs) {
      let module: BasePaymentModule;

      switch (config.provider) {
        case 'redsys':
          module = new RedsysModuleNew(config.config, config.isActive || config.is_active);
          break;
        case 'paypal':
          module = new PayPalPaymentModule(config.config, config.isActive || config.is_active);
          break;
        case 'stripe':
          module = new StripePaymentModule(config.config, config.isActive || config.is_active);
          break;
        case 'bank_transfer':
          module = new BankTransferPaymentModule(config.config, config.isActive || config.is_active);
          break;
        case 'cash':
          module = new CashModule(config.config, config.isActive || config.is_active);
          break;
        default:
          console.warn(`Módulo de pago desconocido: ${config.provider}`);
          continue;
      }

      this.modules.set(config.provider, module);
    }
  }

  /**
   * Obtener módulo por proveedor
   */
  getModule(provider: string): BasePaymentModule | undefined {
    return this.modules.get(provider);
  }

  /**
   * Obtener todos los módulos activos y configurados
   */
  getActiveModules(): BasePaymentModule[] {
    return Array.from(this.modules.values()).filter(module => module.isConfigured());
  }

  /**
   * Obtener todos los módulos (activos e inactivos)
   */
  getAllModules(): BasePaymentModule[] {
    return Array.from(this.modules.values());
  }



  /**
   * Procesar pago con un módulo específico
   */
  async processPayment(provider: string, order: PaymentOrder): Promise<PaymentResult> {
    const module = this.getModule(provider);
    
    if (!module) {
      return {
        success: false,
        errorMessage: `Módulo de pago ${provider} no encontrado`
      };
    }

    if (!module.isConfigured()) {
      return {
        success: false,
        errorMessage: `Módulo de pago ${provider} no está configurado correctamente`
      };
    }

    return await module.processPayment(order);
  }

  /**
   * Manejar callback de un módulo específico
   */
  async handleCallback(provider: string, requestBody: any, headers: any): Promise<PaymentResult> {
    const module = this.getModule(provider);
    
    if (!module) {
      return {
        success: false,
        errorMessage: `Módulo de pago ${provider} no encontrado`
      };
    }

    return await module.handleCallback(requestBody, headers);
  }

  /**
   * Verificar transacción de un módulo específico
   */
  async verifyTransaction(provider: string, transactionId: string): Promise<PaymentResult> {
    const module = this.getModule(provider);
    
    if (!module) {
      return {
        success: false,
        errorMessage: `Módulo de pago ${provider} no encontrado`
      };
    }

    return await module.verifyTransaction(transactionId);
  }

  /**
   * Obtener configuración de campos para un módulo
   */
  getModuleConfigFields(provider: string) {
    const module = this.getModule(provider);
    return module ? module.getConfigFields() : [];
  }

  /**
   * Obtener información de todos los módulos para administración
   */
  getModulesInfo() {
    return Array.from(this.modules.entries()).map(([provider, module]) => ({
      provider,
      name: module.getName(),
      isActive: module.getIsActive(),
      configFields: module.getConfigFields(),
      config: module.getConfig()
    }));
  }

  /**
   * Actualizar configuración de un módulo
   */
  async updateModuleConfig(provider: string, config: any, isActive: boolean) {
    const module = this.getModule(provider);
    if (module) {
      module.updateConfig(config);
      module.setActive(isActive);
      return true;
    }
    return false;
  }

  /**
   * Verificar si hay al menos un módulo activo
   */
  hasActiveModules(): boolean {
    return this.getActiveModules().length > 0;
  }

  /**
   * Obtener módulos disponibles para el checkout
   */
  getCheckoutModules() {
    return this.getActiveModules().map(module => ({
      provider: module.getProvider(),
      name: module.getName(),
      config: module.getConfig()
    }));
  }

  /**
   * Obtener módulos para checkout incluyendo no configurados (para demo)
   */
  getCheckoutModulesForDemo() {
    return Array.from(this.modules.values())
      .filter(module => module.getIsActive())
      .map(module => {
        const hasBasicConfig = module.validateConfigForDemo();
        return {
          provider: module.getProvider(),
          name: module.getName(),
          config: module.getConfig(),
          isConfigured: module.isConfigured(),
          needsConfiguration: !hasBasicConfig
        };
      });
  }
}

// Singleton instance
export const paymentModuleManager = new PaymentModuleManager();