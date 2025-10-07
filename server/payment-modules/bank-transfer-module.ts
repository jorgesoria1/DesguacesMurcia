/**
 * Módulo de pago Transferencia Bancaria - Pago offline
 */

import { BasePaymentModule, PaymentModuleConfig, PaymentResult, PaymentOrder } from './base-payment-module';

export class BankTransferPaymentModule extends BasePaymentModule {
  protected name = 'Transferencia Bancaria';
  protected provider = 'bank_transfer';

  constructor(config: PaymentModuleConfig, isActive: boolean) {
    super(config, isActive);
  }

  validateConfig(): boolean {
    const required = ['bank_name', 'account_number'];
    return required.every(field => this.config[field] && this.config[field].trim() !== '');
  }

  // Validación para modo demo - menos estricta
  validateConfigForDemo(): boolean {
    return this.config.bank_name !== undefined && 
           this.config.account_number !== undefined &&
           this.config.bank_name !== '' &&
           this.config.account_number !== '';
  }

  getConfigFields() {
    return [
      {
        name: 'bank_name',
        label: 'Nombre del Banco',
        type: 'text' as const,
        required: true,
        description: 'Nombre de la entidad bancaria'
      },
      {
        name: 'account_number',
        label: 'Número de Cuenta (IBAN)',
        type: 'text' as const,
        required: true,
        description: 'Número de cuenta IBAN completo'
      },
      {
        name: 'account_holder',
        label: 'Titular de la Cuenta',
        type: 'text' as const,
        required: false,
        description: 'Nombre del titular de la cuenta'
      },
      {
        name: 'bic_swift',
        label: 'Código BIC/SWIFT',
        type: 'text' as const,
        required: false,
        description: 'Código BIC/SWIFT del banco'
      },
      {
        name: 'instructions',
        label: 'Instrucciones Adicionales',
        type: 'text' as const,
        required: false,
        description: 'Instrucciones adicionales para el cliente'
      },
      {
        name: 'auto_approve',
        label: 'Aprobación Automática',
        type: 'checkbox' as const,
        required: false,
        description: 'Marcar pedido como pagado automáticamente'
      }
    ];
  }

  async processPayment(order: PaymentOrder): Promise<PaymentResult> {
    if (!this.validateConfig()) {
      return {
        success: false,
        errorMessage: 'Configuración de transferencia bancaria incompleta'
      };
    }

    try {
      // Generar ID de transacción único
      const transactionId = `BANK_${order.orderNumber}_${Date.now()}`;

      // Preparar datos de transferencia
      const transferData = {
        bank_name: this.config.bank_name,
        account_number: this.config.account_number,
        account_holder: this.config.account_holder || this.config.bank_name,
        bic_swift: this.config.bic_swift,
        amount: order.amount.toFixed(2),
        currency: order.currency,
        reference: order.orderNumber,
        instructions: this.config.instructions || 'Incluir número de pedido como concepto',
        auto_approve: this.config.auto_approve || false
      };

      return {
        success: true,
        transactionId,
        data: {
          transferData,
          paymentMethod: 'bank_transfer',
          status: this.config.auto_approve ? 'completed' : 'pending',
          requiresManualApproval: !this.config.auto_approve
        }
      };

    } catch (error) {
      console.error('Error processing bank transfer payment:', error);
      return {
        success: false,
        errorMessage: 'Error al procesar el pago por transferencia bancaria'
      };
    }
  }

  async handleCallback(requestBody: any, headers: any): Promise<PaymentResult> {
    // Las transferencias bancarias no tienen callback automático
    // Se manejan manualmente desde el panel de administración
    return {
      success: true,
      data: {
        message: 'Las transferencias bancarias se procesan manualmente'
      }
    };
  }

  async verifyTransaction(transactionId: string): Promise<PaymentResult> {
    // Las transferencias bancarias no se pueden verificar automáticamente
    // Se verifican manualmente desde el panel de administración
    return {
      success: true,
      transactionId,
      data: {
        status: 'pending',
        requiresManualVerification: true,
        message: 'Verificación manual requerida'
      }
    };
  }

  /**
   * Método específico para marcar una transferencia como completada
   */
  async markAsCompleted(transactionId: string, verificationData: any): Promise<PaymentResult> {
    return {
      success: true,
      transactionId,
      data: {
        status: 'completed',
        verificationData,
        completedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Método específico para marcar una transferencia como fallida
   */
  async markAsFailed(transactionId: string, reason: string): Promise<PaymentResult> {
    return {
      success: false,
      transactionId,
      errorMessage: reason,
      data: {
        status: 'failed',
        reason,
        failedAt: new Date().toISOString()
      }
    };
  }
}