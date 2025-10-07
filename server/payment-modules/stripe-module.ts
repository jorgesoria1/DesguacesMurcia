/**
 * Módulo de pago Stripe - Integración con pasarela de pago internacional
 */

import { BasePaymentModule, PaymentModuleConfig, PaymentResult, PaymentOrder } from './base-payment-module';
import Stripe from 'stripe';

export class StripePaymentModule extends BasePaymentModule {
  protected name = 'Stripe';
  protected provider = 'stripe';
  private stripe: Stripe | null = null;

  constructor(config: PaymentModuleConfig, isActive: boolean = false) {
    super(config, isActive);
    
    if (this.validateConfig()) {
      this.stripe = new Stripe(this.config.secretKey, {
        apiVersion: '2023-10-16',
      });
    }
  }

  validateConfig(): boolean {
    const required = ['publicKey', 'secretKey'];
    return required.every(field => this.config[field] && this.config[field].trim() !== '');
  }

  // Validación para modo demo - menos estricta
  validateConfigForDemo(): boolean {
    return this.config.publicKey !== undefined && 
           this.config.secretKey !== undefined &&
           this.config.publicKey !== '' &&
           this.config.secretKey !== '' &&
           !this.config.publicKey.includes('demo') &&
           !this.config.secretKey.includes('demo');
  }

  getConfigFields() {
    return [
      {
        name: 'publicKey',
        label: 'Clave Pública',
        type: 'text' as const,
        required: true,
        description: 'Clave pública de Stripe (comienza con pk_)'
      },
      {
        name: 'secretKey',
        label: 'Clave Secreta',
        type: 'password' as const,
        required: true,
        description: 'Clave secreta de Stripe (comienza con sk_)'
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
        name: 'webhookSecret',
        label: 'Webhook Secret',
        type: 'password' as const,
        required: false,
        description: 'Secret para webhooks de Stripe (opcional)'
      }
    ];
  }

  async processPayment(order: PaymentOrder): Promise<PaymentResult> {
    if (!this.validateConfig() || !this.stripe) {
      return {
        success: false,
        errorMessage: 'Configuración de Stripe incompleta'
      };
    }

    try {
      // Crear Payment Intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(order.amount * 100), // Convertir a centavos
        currency: order.currency.toLowerCase(),
        metadata: {
          orderId: order.id?.toString() || '',
          orderNumber: order.orderNumber,
          customerEmail: order.customerEmail
        },
        description: order.description
      });

      return {
        success: true,
        data: {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          publicKey: this.config.publicKey,
          redirectUrl: `/payment/stripe?client_secret=${paymentIntent.client_secret}`
        }
      };

    } catch (error) {
      console.error('Error processing Stripe payment:', error);
      return {
        success: false,
        errorMessage: 'Error al procesar el pago con Stripe'
      };
    }
  }

  async handleCallback(requestBody: any, headers: any): Promise<PaymentResult> {
    try {
      if (!this.stripe) {
        throw new Error('Stripe no configurado');
      }

      // Verificar webhook signature si está configurado
      if (this.config.webhookSecret && headers['stripe-signature']) {
        const signature = headers['stripe-signature'];
        const event = this.stripe.webhooks.constructEvent(
          requestBody,
          signature,
          this.config.webhookSecret
        );

        if (event.type === 'payment_intent.succeeded') {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          
          return {
            success: true,
            transactionId: paymentIntent.id,
            data: {
              status: paymentIntent.status,
              amount: paymentIntent.amount / 100,
              currency: paymentIntent.currency,
              metadata: paymentIntent.metadata
            }
          };
        }
      }

      return {
        success: false,
        errorMessage: 'Webhook no válido'
      };

    } catch (error) {
      console.error('Error handling Stripe callback:', error);
      return {
        success: false,
        errorMessage: 'Error al procesar la respuesta de Stripe'
      };
    }
  }

  async verifyTransaction(transactionId: string): Promise<PaymentResult> {
    if (!this.stripe) {
      return {
        success: false,
        errorMessage: 'Stripe no configurado'
      };
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(transactionId);
      
      return {
        success: paymentIntent.status === 'succeeded',
        transactionId: paymentIntent.id,
        data: {
          status: paymentIntent.status,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          metadata: paymentIntent.metadata
        }
      };

    } catch (error) {
      console.error('Error verifying Stripe transaction:', error);
      return {
        success: false,
        errorMessage: 'Error al verificar la transacción'
      };
    }
  }
}