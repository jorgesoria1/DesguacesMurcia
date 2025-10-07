import { BasePaymentModule } from './base-payment-module';
import { PaymentConfig, PaymentModuleInfo } from '../types/payment-types';

export class CashModule extends BasePaymentModule {
  provider = 'cash';
  name = 'Pago en Efectivo';

  getModuleInfo(): PaymentModuleInfo {
    return {
      provider: this.provider,
      name: this.name,
      isActive: this.isActive,
      configFields: [
        {
          name: 'pickup_location',
          label: 'Lugar de Recogida',
          type: 'text',
          required: true,
          description: 'Dirección donde el cliente puede recoger el producto y pagar en efectivo'
        },
        {
          name: 'pickup_hours',
          label: 'Horario de Recogida',
          type: 'text',
          required: true,
          description: 'Horario de atención para recogida (ej: Lun-Vie: de 8:00h. a 13:30h. y de 16:00h. a 17:30h)'
        },
        {
          name: 'contact_phone',
          label: 'Teléfono de Contacto',
          type: 'text',
          required: true,
          description: 'Número de teléfono para coordinar la recogida'
        },
        {
          name: 'preparation_time',
          label: 'Tiempo de Preparación',
          type: 'text',
          required: false,
          description: 'Tiempo estimado para preparar el pedido (ej: 24-48 horas)'
        },
        {
          name: 'instructions',
          label: 'Instrucciones Adicionales',
          type: 'textarea',
          required: false,
          description: 'Instrucciones adicionales para el cliente sobre el pago en efectivo'
        },
        {
          name: 'require_identification',
          label: 'Requiere Identificación',
          type: 'checkbox',
          required: false,
          description: 'Marcar si se requiere identificación para la recogida'
        }
      ],
      config: this.config
    };
  }

  validateConfig(): boolean {
    if (!this.config || typeof this.config !== 'object') {
      return false;
    }
    
    const requiredFields = ['pickup_location', 'pickup_hours', 'contact_phone'];
    
    for (const field of requiredFields) {
      if (!this.config[field] || typeof this.config[field] !== 'string' || this.config[field].trim() === '') {
        return false;
      }
    }
    
    return true;
  }

  // Validación para modo demo - menos estricta
  validateConfigForDemo(): boolean {
    return this.config && 
           this.config.pickup_location !== undefined && 
           this.config.pickup_hours !== undefined && 
           this.config.contact_phone !== undefined &&
           this.config.pickup_location !== '' &&
           this.config.pickup_hours !== '' &&
           this.config.contact_phone !== '';
  }

  async processPayment(order: any): Promise<any> {
    // Para pago en efectivo, no se procesa el pago inmediatamente
    // Se marca como pendiente hasta que se complete la recogida
    
    return {
      success: true,
      transactionId: `cash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      paymentMethod: 'cash',
      amount: order.amount,
      currency: order.currency,
      message: 'Pago en efectivo pendiente. El cliente debe recoger el producto y pagar en el lugar indicado.',
      instructions: {
        pickup_location: this.config.pickup_location,
        pickup_hours: this.config.pickup_hours,
        contact_phone: this.config.contact_phone,
        preparation_time: this.config.preparation_time,
        instructions: this.config.instructions,
        require_identification: this.config.require_identification
      }
    };
  }

  async handleCallback(requestBody: any, headers: any): Promise<any> {
    // Los pagos en efectivo no requieren callbacks
    // La confirmación se hace manualmente cuando el cliente recoge el producto
    return {
      success: true,
      message: 'Callback no requerido para pago en efectivo'
    };
  }

  async verifyTransaction(transactionId: string): Promise<any> {
    // Para pagos en efectivo, la verificación se hace manualmente
    return {
      success: true,
      status: 'pending',
      message: 'Verificación manual requerida para pago en efectivo',
      transactionId: transactionId
    };
  }

  getConfigFields(): Array<{
    name: string;
    label: string;
    type: 'text' | 'password' | 'select' | 'checkbox';
    required: boolean;
    options?: Array<{value: string, label: string}>;
    description?: string;
  }> {
    return [
      {
        name: 'pickup_location',
        label: 'Lugar de Recogida',
        type: 'text',
        required: true,
        description: 'Dirección donde el cliente puede recoger el producto y pagar en efectivo'
      },
      {
        name: 'pickup_hours',
        label: 'Horario de Recogida',
        type: 'text',
        required: true,
        description: 'Horario de atención para recogida (ej: Lun-Vie: de 8:00h. a 13:30h. y de 16:00h. a 17:30h)'
      },
      {
        name: 'contact_phone',
        label: 'Teléfono de Contacto',
        type: 'text',
        required: true,
        description: 'Número de teléfono para coordinar la recogida'
      },
      {
        name: 'preparation_time',
        label: 'Tiempo de Preparación',
        type: 'text',
        required: false,
        description: 'Tiempo estimado para preparar el pedido (ej: 24-48 horas)'
      },
      {
        name: 'instructions',
        label: 'Instrucciones Adicionales',
        type: 'text',
        required: false,
        description: 'Instrucciones adicionales para el cliente sobre el pago en efectivo'
      },
      {
        name: 'require_identification',
        label: 'Requiere Identificación',
        type: 'checkbox',
        required: false,
        description: 'Marcar si se requiere identificación para la recogida'
      }
    ];
  }

  async refundPayment(transactionId: string, amount?: number): Promise<any> {
    // Para pagos en efectivo, el reembolso se maneja manualmente
    return {
      success: true,
      refundId: `cash_refund_${Date.now()}`,
      message: 'Reembolso en efectivo debe procesarse manualmente',
      amount: amount,
      status: 'manual_refund_required'
    };
  }

  getPaymentInstructions(): string {
    return `
      <div class="cash-payment-instructions">
        <h3>Instrucciones para Pago en Efectivo</h3>
        <div class="instruction-item">
          <strong>Lugar de Recogida:</strong> ${this.config.pickup_location || 'No especificado'}
        </div>
        <div class="instruction-item">
          <strong>Horario:</strong> ${this.config.pickup_hours || 'No especificado'}
        </div>
        <div class="instruction-item">
          <strong>Teléfono de Contacto:</strong> ${this.config.contact_phone || 'No especificado'}
        </div>
        ${this.config.preparation_time ? `
          <div class="instruction-item">
            <strong>Tiempo de Preparación:</strong> ${this.config.preparation_time}
          </div>
        ` : ''}
        ${this.config.instructions ? `
          <div class="instruction-item">
            <strong>Instrucciones:</strong> ${this.config.instructions}
          </div>
        ` : ''}
        ${this.config.require_identification ? `
          <div class="instruction-item">
            <strong>Importante:</strong> Traer identificación para la recogida
          </div>
        ` : ''}
        <div class="instruction-note">
          <p><strong>Nota:</strong> Su pedido se preparará tras la confirmación. Pague únicamente cuando recoja el producto.</p>
        </div>
      </div>
    `;
  }
}