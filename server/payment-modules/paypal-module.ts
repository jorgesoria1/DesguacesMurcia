/**
 * Módulo de pago PayPal - Integración con pasarela de pago internacional
 */

import { BasePaymentModule, PaymentModuleConfig, PaymentResult, PaymentOrder } from './base-payment-module';
import {
  Client,
  Environment,
  LogLevel,
  OAuthAuthorizationController,
  OrdersController,
} from "@paypal/paypal-server-sdk";

export class PayPalPaymentModule extends BasePaymentModule {
  protected name = 'PayPal';
  protected provider = 'paypal';
  private client: Client | null = null;
  private ordersController: OrdersController | null = null;
  private oAuthController: OAuthAuthorizationController | null = null;

  constructor(config: PaymentModuleConfig, isActive: boolean = false) {
    super(config, isActive);
    
    if (this.validateConfig()) {
      this.initializePayPal();
    }
  }

  private initializePayPal() {
    this.client = new Client({
      clientCredentialsAuthCredentials: {
        oAuthClientId: this.config.clientId,
        oAuthClientSecret: this.config.clientSecret,
      },
      timeout: 0,
      environment: this.config.environment === 'production' 
        ? Environment.Production 
        : Environment.Sandbox,
      logging: {
        logLevel: LogLevel.Info,
        logRequest: { logBody: true },
        logResponse: { logHeaders: true },
      },
    });

    this.ordersController = new OrdersController(this.client);
    this.oAuthController = new OAuthAuthorizationController(this.client);
  }

  validateConfig(): boolean {
    const required = ['clientId', 'clientSecret', 'environment'];
    return required.every(field => this.config[field] && this.config[field].trim() !== '');
  }

  // Validación para modo demo - menos estricta
  validateConfigForDemo(): boolean {
    return this.config.clientId !== undefined && 
           this.config.clientSecret !== undefined && 
           this.config.environment !== undefined &&
           this.config.clientId !== '' &&
           this.config.clientSecret !== '' &&
           this.config.environment !== '' &&
           !this.config.clientId.includes('demo') &&
           !this.config.clientSecret.includes('demo');
  }

  getConfigFields() {
    return [
      {
        name: 'clientId',
        label: 'Client ID',
        type: 'text' as const,
        required: true,
        description: 'Client ID de la aplicación PayPal'
      },
      {
        name: 'clientSecret',
        label: 'Client Secret',
        type: 'password' as const,
        required: true,
        description: 'Client Secret de la aplicación PayPal'
      },
      {
        name: 'environment',
        label: 'Entorno',
        type: 'select' as const,
        required: true,
        options: [
          { value: 'sandbox', label: 'Sandbox (Pruebas)' },
          { value: 'production', label: 'Producción' }
        ],
        description: 'Entorno de ejecución'
      }
    ];
  }

  async processPayment(order: PaymentOrder): Promise<PaymentResult> {
    if (!this.validateConfig() || !this.ordersController) {
      return {
        success: false,
        errorMessage: 'Configuración de PayPal incompleta'
      };
    }

    try {
      const collect = {
        body: {
          intent: 'CAPTURE',
          purchaseUnits: [
            {
              amount: {
                currencyCode: order.currency,
                value: order.amount.toString(),
              },
              description: order.description
            },
          ],
        },
        prefer: 'return=minimal',
      };

      const { body, ...httpResponse } = await this.ordersController.createOrder(collect);
      const jsonResponse = JSON.parse(String(body));

      if (httpResponse.statusCode === 201) {
        return {
          success: true,
          data: {
            orderId: jsonResponse.id,
            status: jsonResponse.status,
            links: jsonResponse.links,
            clientToken: await this.getClientToken(),
            redirectUrl: `/payment/paypal?amount=${order.amount}&order_id=${jsonResponse.id}`
          }
        };
      }

      return {
        success: false,
        errorMessage: 'Error al crear la orden en PayPal'
      };

    } catch (error) {
      console.error('Error processing PayPal payment:', error);
      return {
        success: false,
        errorMessage: 'Error al procesar el pago con PayPal'
      };
    }
  }

  async getClientToken(): Promise<string> {
    if (!this.oAuthController) {
      throw new Error('PayPal no configurado');
    }

    const auth = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`,
    ).toString('base64');

    const { result } = await this.oAuthController.requestToken(
      {
        authorization: `Basic ${auth}`,
      },
      { intent: 'sdk_init', response_type: 'client_token' },
    );

    return result.accessToken;
  }

  async captureOrder(orderId: string): Promise<PaymentResult> {
    if (!this.ordersController) {
      return {
        success: false,
        errorMessage: 'PayPal no configurado'
      };
    }

    try {
      const collect = {
        id: orderId,
        prefer: 'return=minimal',
      };

      const { body, ...httpResponse } = await this.ordersController.captureOrder(collect);
      const jsonResponse = JSON.parse(String(body));

      return {
        success: httpResponse.statusCode === 201,
        transactionId: jsonResponse.id,
        data: jsonResponse
      };

    } catch (error) {
      console.error('Error capturing PayPal order:', error);
      return {
        success: false,
        errorMessage: 'Error al capturar la orden de PayPal'
      };
    }
  }

  async handleCallback(requestBody: any, headers: any): Promise<PaymentResult> {
    // PayPal usa un flujo diferente donde la captura se hace directamente
    // No necesita callback como Redsys
    return {
      success: true,
      data: requestBody
    };
  }

  async verifyTransaction(transactionId: string): Promise<PaymentResult> {
    if (!this.ordersController) {
      return {
        success: false,
        errorMessage: 'PayPal no configurado'
      };
    }

    try {
      const { body } = await this.ordersController.showOrderDetails({
        id: transactionId
      });
      
      const orderDetails = JSON.parse(String(body));
      
      return {
        success: orderDetails.status === 'COMPLETED',
        transactionId: orderDetails.id,
        data: orderDetails
      };

    } catch (error) {
      console.error('Error verifying PayPal transaction:', error);
      return {
        success: false,
        errorMessage: 'Error al verificar la transacción'
      };
    }
  }
}