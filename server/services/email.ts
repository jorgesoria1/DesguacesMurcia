import nodemailer from 'nodemailer';
import { db } from '../db';
import { emailConfig, emailLogs, insertEmailLogSchema } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

interface EmailConfig {
  fromEmail: string;
  fromName: string;
  adminEmail: string;
  orderNotificationEmails: string[];
}

class EmailService {
  public transporter: nodemailer.Transporter;
  private config: EmailConfig | null = null;
  private currentTransportMethod: string = 'sendmail';

  constructor() {
    // Configure nodemailer to use sendmail by default (real mode)
    this.transporter = nodemailer.createTransport({
      sendmail: true,
      newline: 'unix',
      path: '/usr/sbin/sendmail'
    });
    console.log('Email service initialized with sendmail transport');
  }

  async initialize() {
    // Load email configuration from database
    try {
      const configs = await db.select().from(emailConfig);
      
      const getConfigValue = (key: string, defaultValue: string = '') => {
        const config = configs.find(c => c.key === key);
        return config?.value || defaultValue;
      };

      this.config = {
        fromEmail: process.env.FROM_EMAIL || 'noreply@desguacesmurcia.com',
        fromName: process.env.FROM_NAME || 'Desguace Murcia',
        adminEmail: getConfigValue('contact_admin_email', 'admin@desguacesmurcia.com'),
        orderNotificationEmails: [
          getConfigValue('orders_admin_email'),
          getConfigValue('orders_copy_email'),
          getConfigValue('contact_copy_email')
        ].filter(email => email.length > 0)
      };

      // Check email transport priority: SendGrid > SMTP > Sendmail
      const sendgridEnabled = getConfigValue('sendgrid_enabled') === 'true';
      const sendgridApiKey = getConfigValue('sendgrid_api_key') || process.env.SENDGRID_API_KEY;
      
      const smtpEnabled = getConfigValue('smtp_enabled') === 'true';
      const smtpHost = getConfigValue('smtp_host');
      const smtpPort = getConfigValue('smtp_port', '587');
      const smtpUser = getConfigValue('smtp_user');
      const smtpPass = getConfigValue('smtp_pass');

      if (sendgridEnabled && sendgridApiKey) {
        // Use SendGrid if enabled and configured
        this.transporter = nodemailer.createTransport({
          host: 'smtp.sendgrid.net',
          port: 587,
          auth: {
            user: 'apikey',
            pass: sendgridApiKey
          }
        });
        this.currentTransportMethod = 'sendgrid';
        console.log('Email service initialized with SendGrid SMTP transport');
      } else if (smtpEnabled && smtpHost && smtpUser && smtpPass) {
        // Use custom SMTP if configured
        this.transporter = nodemailer.createTransport({
          host: smtpHost,
          port: parseInt(smtpPort),
          secure: parseInt(smtpPort) === 465, // true for 465, false for other ports
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });
        this.currentTransportMethod = 'smtp';
        console.log('Email service initialized with custom SMTP transport');
      } else {
        // Force SMTP with basic configuration to avoid sendmail
        this.transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: 'fallback@example.com',
            pass: 'fallback'
          }
        });
        this.currentTransportMethod = 'smtp_fallback';
        console.log('Email service using fallback SMTP transport (no sendmail)');
      }
    } catch (error) {
      console.error('Error initializing email service:', error);
    }
  }

  // Función para crear y guardar log de email
  async createEmailLog(
    recipientEmail: string,
    subject: string,
    emailType: string,
    emailContent: string,
    textContent: string,
    metadata: any = {}
  ) {
    try {
      const [emailLog] = await db.insert(emailLogs).values({
        recipientEmail,
        subject,
        emailType,
        transportMethod: this.currentTransportMethod,
        status: 'pending' as const,
        emailContent,
        textContent,
        metadata: JSON.stringify(metadata),
      }).returning();
      
      return emailLog;
    } catch (error) {
      console.error('Error creating email log:', error);
      return null;
    }
  }

  // Función para actualizar el estado del log
  async updateEmailLog(emailLogId: number, status: 'sent' | 'failed', errorMessage?: string) {
    try {
      await db.update(emailLogs)
        .set({
          status,
          errorMessage: errorMessage || null,
          sentAt: status === 'sent' ? new Date() : null,
          updatedAt: new Date()
        })
        .where(eq(emailLogs.id, emailLogId));
    } catch (error) {
      console.error('Error updating email log:', error);
    }
  }

  // Función principal para enviar email con logging completo y adjuntos
  async sendEmailWithLogging(
    to: string,
    subject: string,
    html: string,
    text: string,
    emailType: string,
    metadata: any = {},
    attachments: any[] = []
  ) {
    // Crear log inicial
    const emailLog = await this.createEmailLog(to, subject, emailType, html, text, metadata);
    
    console.log(`📧 Enviando email [${emailType}] a: ${to}`);
    console.log(`🔧 Método: ${this.currentTransportMethod}`);
    console.log(`📝 Asunto: ${subject}`);
    
    try {
      // Intentar enviar email
      const mailOptions: any = {
        from: `${this.config?.fromName || 'Desguace Murcia'} <${this.config?.fromEmail || 'noreply@desguacesmurcia.com'}>`,
        to,
        subject,
        html,
        text
      };

      // Añadir adjuntos si existen
      if (attachments && attachments.length > 0) {
        mailOptions.attachments = attachments;
      }

      const result = await this.transporter.sendMail(mailOptions);

      console.log(`✅ Email enviado exitosamente a: ${to}`);
      console.log(`📋 Detalles del envío:`, result);
      
      // Actualizar log como exitoso
      if (emailLog) {
        await this.updateEmailLog(emailLog.id, 'sent');
      }
      
      return { success: true, result, logId: emailLog?.id };
      
    } catch (error) {
      console.error(`❌ Error enviando email a: ${to}`, error);
      
      // Actualizar log como fallido
      if (emailLog) {
        await this.updateEmailLog(emailLog.id, 'failed', error.message);
      }
      
      return { success: false, error: error.message, logId: emailLog?.id };
    }
  }

  async sendOrderConfirmationToCustomer(orderData: any) {
    // Initialize config if not loaded
    if (!this.config) {
      await this.initialize();
    }
    
    if (!this.config) {
      console.warn('Email service not configured. Skipping customer order confirmation.');
      return;
    }

    const { customerEmail, customerName, customerNifCif, orderId, orderReference, items, subtotal, shippingCost, total, paymentMethod, shippingAddress, shippingCity, shippingProvince, shippingPostalCode, shippingCountry } = orderData;

    const itemsHtml = items.map((item: any) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">
          <strong>${item.partName}</strong><br>
          <small style="color: #666;">${item.partFamily}</small>
          ${item.vehicleInfo ? `<br><em style="color: #0066cc;">Para: ${item.vehicleInfo}</em>` : ''}
        </td>
        <td style="padding: 8px; border: 1px solid #ddd;">
          ${item.refLocal ? `<strong>Ref Principal:</strong> ${item.refLocal}<br>` : ''}
          ${item.partReference ? `<strong>Código:</strong> ${item.partReference}<br>` : ''}
          ${item.refPrincipal ? `<strong>Ref Fabricante:</strong> ${item.refPrincipal}` : ''}
        </td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${Number(item.price).toFixed(2)}€</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;"><strong>${Number(item.subtotal).toFixed(2)}€</strong></td>
      </tr>
    `).join('');

    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2c5282; margin: 0;">Desguace Murcia</h1>
              <h2 style="color: #333; margin: 10px 0;">Confirmación de Pedido</h2>
              <p style="background-color: #e2e8f0; padding: 10px; border-radius: 5px; font-size: 18px; font-weight: bold; color: #2c5282;">${orderReference}</p>
            </div>
            
            <div style="margin-bottom: 30px;">
              <p>Estimado/a <strong>${customerName}</strong>,</p>
              <p>Gracias por confiar en nosotros. Hemos recibido tu pedido y lo procesaremos en breve.</p>
            </div>

            <div style="margin-bottom: 30px;">
              <h3 style="color: #2c5282; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Información del Cliente</h3>
              <div style="background-color: #f7fafc; padding: 15px; border-radius: 5px;">
                <p style="margin: 5px 0;"><strong>Nombre:</strong> ${customerName}</p>
                <p style="margin: 5px 0;"><strong>Email:</strong> ${customerEmail}</p>
                <p style="margin: 5px 0;"><strong>NIF/CIF:</strong> ${customerNifCif || 'No especificado'}</p>
              </div>
            </div>

            <div style="margin-bottom: 30px;">
              <h3 style="color: #2c5282; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
                ${orderData.isPickup ? 'Información de Recogida' : 'Información de Envío'}
              </h3>
              <div style="background-color: #f7fafc; padding: 15px; border-radius: 5px;">
                ${orderData.isPickup ? `
                  <p style="margin: 5px 0; color: #2c5282; font-weight: bold;">🏪 Recogida en nuestras instalaciones</p>
                  <p style="margin: 5px 0;"><strong>Dirección:</strong> ${shippingAddress}</p>
                  <p style="margin: 5px 0;"><strong>Ciudad:</strong> ${shippingCity}</p>
                  <p style="margin: 5px 0;"><strong>Provincia:</strong> ${shippingProvince}</p>
                  <p style="margin: 5px 0;"><strong>Código Postal:</strong> ${shippingPostalCode}</p>
                  <p style="margin: 5px 0;"><strong>País:</strong> ${shippingCountry}</p>
                  <p style="margin: 10px 0; color: #666; font-style: italic;">
                    <strong>Teléfono:</strong> 958 790 858 | <strong>Email:</strong> info@desguacemurcia.com
                  </p>
                ` : `
                  <p style="margin: 5px 0;"><strong>Dirección:</strong> ${shippingAddress}</p>
                  <p style="margin: 5px 0;"><strong>Ciudad:</strong> ${shippingCity}</p>
                  <p style="margin: 5px 0;"><strong>Provincia:</strong> ${shippingProvince}</p>
                  <p style="margin: 5px 0;"><strong>Código Postal:</strong> ${shippingPostalCode}</p>
                  <p style="margin: 5px 0;"><strong>País:</strong> ${shippingCountry}</p>
                `}
              </div>
            </div>
          
            <h3 style="color: #2c5282; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Detalles del Pedido</h3>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: white;">
              <thead>
                <tr style="background-color: #2c5282; color: white;">
                  <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Producto y Vehículo</th>
                  <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Referencias</th>
                  <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">Cant.</th>
                  <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">Precio</th>
                  <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            <div style="margin: 30px 0; padding: 20px; background-color: #f7fafc; border-radius: 5px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 5px 0; text-align: right; font-size: 16px;"><strong>Subtotal:</strong></td>
                  <td style="padding: 5px 0 5px 20px; text-align: right; font-size: 16px; width: 120px;">${Number(subtotal).toFixed(2)}€</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; text-align: right; font-size: 16px;"><strong>Gastos de envío:</strong></td>
                  <td style="padding: 5px 0 5px 20px; text-align: right; font-size: 16px;">${Number(shippingCost).toFixed(2)}€</td>
                </tr>
                <tr style="border-top: 2px solid #2c5282;">
                  <td style="padding: 10px 0 5px 0; text-align: right; font-size: 20px; font-weight: bold; color: #2c5282;"><strong>TOTAL:</strong></td>
                  <td style="padding: 10px 0 5px 20px; text-align: right; font-size: 20px; font-weight: bold; color: #2c5282;">${Number(total).toFixed(2)}€</td>
                </tr>
              </table>
            </div>
            
            <div style="margin: 20px 0; padding: 15px; background-color: #e6fffa; border-left: 4px solid #38b2ac; border-radius: 5px;">
              <p style="margin: 0;"><strong>Método de pago:</strong> ${paymentMethod.name}</p>
              ${paymentMethod.provider === 'bank_transfer' ? `
                <div style="margin-top: 15px; padding: 15px; background-color: #f0f8ff; border-radius: 5px;">
                  <h4 style="margin: 0 0 10px 0; color: #2c5282;">Datos para Transferencia Bancaria:</h4>
                  <p style="margin: 5px 0;"><strong>Banco:</strong> ${paymentMethod.config?.bank_name || 'Información disponible al procesar'}</p>
                  <p style="margin: 5px 0;"><strong>Número de Cuenta:</strong> ${paymentMethod.config?.account_number || 'Se enviará por separado'}</p>
                  <p style="margin: 5px 0;"><strong>Concepto:</strong> ${orderReference}</p>
                  <p style="margin: 10px 0 0 0; font-style: italic; color: #666;">Una vez realizada la transferencia, tu pedido será procesado automáticamente.</p>
                  <div style="margin-top: 15px; padding: 12px; background-color: #fff3cd; border-left: 4px solid #f39c12; border-radius: 3px;">
                    <p style="margin: 0; color: #856404; font-weight: bold;">⚠️ IMPORTANTE:</p>
                    <p style="margin: 5px 0 0 0; color: #856404;">Si en 24 horas no se recibe el pago, el pedido será anulado automáticamente.</p>
                    <p style="margin: 5px 0 0 0; color: #856404;"><strong>Por favor, envía el justificante de pago a:</strong> <a href="mailto:pedidos@desguacemurcia.com" style="color: #2c5282;">pedidos@desguacemurcia.com</a></p>
                  </div>
                </div>
              ` : ''}
              ${(paymentMethod.provider === 'cash' || paymentMethod.provider === 'cash_on_delivery') ? `
                <div style="margin-top: 15px; padding: 12px; background-color: #fff3cd; border-left: 4px solid #f39c12; border-radius: 3px;">
                  <p style="margin: 0; color: #856404; font-weight: bold;">⚠️ IMPORTANTE:</p>
                  <p style="margin: 5px 0 0 0; color: #856404;">Si en 24 horas no se recibe el pago, el pedido será anulado automáticamente.</p>
                </div>
              ` : ''}
            </div>
            
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <p>Si tienes alguna pregunta sobre tu pedido, no dudes en contactarnos:</p>
              <p><strong>📞 Teléfono:</strong> 958 79 08 58</p>
              <p><strong>📧 Email:</strong> info@desguacesmurcia.com</p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; color: #666;">
              <p>Gracias por confiar en Desguace Murcia</p>
              <p><em>Tu especialista en piezas de automóvil</em></p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = html.replace(/<[^>]*>/g, '');
    
    return await this.sendEmailWithLogging(
      customerEmail,
      `Confirmación de Pedido ${orderReference} - Desguace Murcia`,
      html,
      text,
      'order_confirmation',
      { orderId, orderReference, customerName, total, paymentMethod: paymentMethod.name }
    );
  }

  async sendOrderNotificationToAdmin(orderData: any) {
    // Initialize config if not loaded
    if (!this.config) {
      await this.initialize();
    }
    
    if (!this.config) {
      console.warn('Email service not configured. Skipping admin order notification.');
      return;
    }

    const { customerName, customerEmail, customerPhone, customerNifCif, orderId, orderReference, items, subtotal, shippingCost, total, shippingAddress, shippingCity, shippingProvince, shippingPostalCode, shippingCountry, paymentMethod, notes } = orderData;

    const itemsHtml = items.map((item: any) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">
          <strong>${item.partName}</strong><br>
          <small style="color: #666;">${item.partFamily}</small>
          ${item.vehicleInfo ? `<br><em style="color: #0066cc;">Vehículo: ${item.vehicleInfo}</em>` : ''}
        </td>
        <td style="padding: 8px; border: 1px solid #ddd;">
          ${item.refLocal ? `<strong>Ref Principal:</strong> ${item.refLocal}<br>` : ''}
          ${item.partReference ? `<strong>Código:</strong> ${item.partReference}<br>` : ''}
          ${item.refPrincipal ? `<strong>Ref Fabricante:</strong> ${item.refPrincipal}` : ''}
        </td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${Number(item.price).toFixed(2)}€</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;"><strong>${Number(item.subtotal).toFixed(2)}€</strong></td>
      </tr>
    `).join('');

    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px; padding: 20px; background-color: #dc3545; color: white; border-radius: 5px;">
              <h1 style="margin: 0;">🚨 NUEVO PEDIDO 🚨</h1>
              <h2 style="margin: 10px 0; background-color: rgba(255,255,255,0.2); padding: 10px; border-radius: 5px;">${orderReference}</h2>
              <p style="margin: 0; font-size: 16px;">Pedido ID: #${orderId}</p>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
              <div style="background-color: #e8f4fd; padding: 20px; border-radius: 8px; border-left: 4px solid #2c5282;">
                <h3 style="color: #2c5282; margin-top: 0;">👤 Datos del Cliente</h3>
                <p style="margin: 8px 0;"><strong>Nombre:</strong> ${customerName}</p>
                <p style="margin: 8px 0;"><strong>📧 Email:</strong> <a href="mailto:${customerEmail}" style="color: #2c5282;">${customerEmail}</a></p>
                <p style="margin: 8px 0;"><strong>📞 Teléfono:</strong> <a href="tel:${customerPhone}" style="color: #2c5282;">${customerPhone}</a></p>
                <p style="margin: 8px 0;"><strong>🆔 NIF/CIF:</strong> ${customerNifCif || 'No especificado'}</p>
              </div>
              
              <div style="background-color: #f0fff4; padding: 20px; border-radius: 8px; border-left: 4px solid #38a169;">
                <h3 style="color: #38a169; margin-top: 0;">
                  ${orderData.isPickup ? '🏪 Información de Recogida' : '📦 Información de Envío'}
                </h3>
                ${orderData.isPickup ? `
                  <p style="margin: 8px 0; color: #38a169; font-weight: bold;">RECOGIDA EN INSTALACIONES</p>
                  <p style="margin: 8px 0;"><strong>Dirección:</strong> ${shippingAddress}</p>
                  <p style="margin: 8px 0;"><strong>Ciudad:</strong> ${shippingCity}</p>
                  <p style="margin: 8px 0;"><strong>Provincia:</strong> ${shippingProvince}</p>
                  <p style="margin: 8px 0;"><strong>CP:</strong> ${shippingPostalCode}</p>
                  <p style="margin: 8px 0;"><strong>País:</strong> ${shippingCountry}</p>
                  <p style="margin: 8px 0; color: #666; font-style: italic;">
                    <strong>Tel:</strong> 958 790 858 | <strong>Email:</strong> info@desguacemurcia.com
                  </p>
                ` : `
                  <p style="margin: 8px 0;"><strong>Dirección:</strong> ${shippingAddress}</p>
                  <p style="margin: 8px 0;"><strong>Ciudad:</strong> ${shippingCity}</p>
                  <p style="margin: 8px 0;"><strong>Provincia:</strong> ${shippingProvince}</p>
                  <p style="margin: 8px 0;"><strong>CP:</strong> ${shippingPostalCode}</p>
                  <p style="margin: 8px 0;"><strong>País:</strong> ${shippingCountry}</p>
                `}
              </div>
            </div>

            ${notes ? `
              <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin-bottom: 20px;">
                <h4 style="color: #856404; margin-top: 0;">💬 Notas del Cliente:</h4>
                <p style="margin: 0; color: #856404;">${notes}</p>
              </div>
            ` : ''}
            
            <div style="margin-bottom: 30px;">
              <h3 style="color: #2c5282; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">🛒 Productos Pedidos</h3>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <thead>
                  <tr style="background-color: #2c5282; color: white;">
                    <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Producto y Vehículo</th>
                    <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Referencias</th>
                    <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">Cant.</th>
                    <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">Precio</th>
                    <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
              <div style="display: grid; grid-template-columns: 1fr auto; gap: 20px; align-items: center;">
                <div>
                  <h3 style="color: #2c5282; margin: 0 0 15px 0;">💰 Resumen Financiero</h3>
                  <div style="display: grid; grid-template-columns: auto 1fr auto; gap: 10px; align-items: center;">
                    <span><strong>Subtotal:</strong></span>
                    <span style="border-bottom: 1px dotted #ccc;"></span>
                    <span style="font-weight: bold;">${Number(subtotal).toFixed(2)}€</span>
                    
                    <span><strong>Gastos de envío:</strong></span>
                    <span style="border-bottom: 1px dotted #ccc;"></span>
                    <span style="font-weight: bold;">${Number(shippingCost).toFixed(2)}€</span>
                    
                    <span style="font-size: 18px; color: #2c5282;"><strong>TOTAL:</strong></span>
                    <span style="border-bottom: 2px solid #2c5282;"></span>
                    <span style="font-size: 20px; font-weight: bold; color: #2c5282;">${Number(total).toFixed(2)}€</span>
                  </div>
                </div>
                
                <div style="text-align: center; padding: 15px; background-color: #e6fffa; border-radius: 5px; border-left: 4px solid #38b2ac;">
                  <p style="margin: 0 0 5px 0; font-weight: bold;">💳 Método de Pago</p>
                  <p style="margin: 0; color: #2c5282; font-weight: bold;">${paymentMethod.name}</p>
                  ${paymentMethod.provider === 'bank_transfer' ? `
                    <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">⚠️ Transferencia bancaria - Pendiente de confirmación</p>
                    <div style="margin-top: 10px; padding: 8px; background-color: #fff3cd; border-radius: 3px;">
                      <p style="margin: 0; font-size: 11px; color: #856404; font-weight: bold;">⏰ PLAZO: 24 horas máximo</p>
                      <p style="margin: 2px 0 0 0; font-size: 10px; color: #856404;">Cliente debe enviar justificante a pedidos@desguacemurcia.com</p>
                    </div>
                  ` : ''}
                  ${(paymentMethod.provider === 'cash' || paymentMethod.provider === 'cash_on_delivery') ? `
                    <div style="margin-top: 10px; padding: 8px; background-color: #fff3cd; border-radius: 3px;">
                      <p style="margin: 0; font-size: 11px; color: #856404; font-weight: bold;">⏰ PLAZO: 24 horas máximo</p>
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>
            
            <div style="background-color: #fff5f5; padding: 20px; border-radius: 5px; border-left: 4px solid #f56565; text-align: center;">
              <h3 style="color: #c53030; margin-top: 0;">⚡ ACCIÓN REQUERIDA</h3>
              <p style="margin: 10px 0; font-size: 16px; color: #2d3748;">
                <strong>Procesa este pedido inmediatamente en el panel de administración</strong>
              </p>
              <p style="margin: 0; font-size: 14px; color: #666;">
                ⏰ Tiempo de respuesta recomendado: 2 horas máximo
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #666;">
              <p style="margin: 0;">📧 Enviado automáticamente desde Desguace Murcia</p>
              <p style="margin: 5px 0 0 0; font-size: 12px;">Sistema de gestión de pedidos</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send to admin email - remove duplicates
    const allEmails = [this.config.adminEmail, ...this.config.orderNotificationEmails].filter(Boolean);
    const emailAddresses = [...new Set(allEmails)]; // Remove duplicates
    const text = html.replace(/<[^>]*>/g, '');
    const results = [];

    for (const emailAddress of emailAddresses) {
      const result = await this.sendEmailWithLogging(
        emailAddress,
        `🚨 NUEVO PEDIDO ${orderReference} - ${Number(total).toFixed(2)}€ - ${customerName}`,
        html,
        text,
        'order_notification',
        { orderId, orderReference, customerName, customerEmail, total, paymentMethod: paymentMethod.name }
      );
      results.push(result);
    }

    return results;
  }

  async sendContactFormNotification(formData: any) {
    // Initialize config if not loaded
    if (!this.config) {
      await this.initialize();
    }
    
    if (!this.config) {
      console.warn('Email service not configured. Skipping contact form notification.');
      return;
    }

    const { name, email, phone, message, subject } = formData;

    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #2c5282; color: white; padding: 20px; border-radius: 10px 10px 0 0;">
            <h2 style="margin: 0; color: white;">📧 Nuevo Mensaje de Contacto</h2>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border: 1px solid #e9ecef;">
            <div style="background-color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
              <h3 style="color: #2c5282; margin-top: 0;">Datos del remitente</h3>
              <p><strong>Nombre:</strong> ${name}</p>
              <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
              ${phone ? `<p><strong>Teléfono:</strong> ${phone}</p>` : ''}
              ${subject ? `<p><strong>Asunto:</strong> ${subject}</p>` : ''}
            </div>
            
            <div style="background-color: white; padding: 20px; border-radius: 5px;">
              <h3 style="color: #2c5282; margin-top: 0;">Mensaje</h3>
              <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #2c5282; border-radius: 3px;">
                <p style="white-space: pre-wrap; margin: 0;">${message}</p>
              </div>
            </div>
          </div>
          
          <div style="background-color: #e9ecef; padding: 15px; border-radius: 0 0 10px 10px; text-align: center; color: #6c757d;">
            <p style="margin: 0;"><em>Responde directamente a este email para contactar con el cliente</em></p>
          </div>
        </body>
      </html>
    `;

    // Send to admin email - remove duplicates
    const allEmails = [this.config.adminEmail, ...this.config.orderNotificationEmails].filter(Boolean);
    const emailAddresses = [...new Set(allEmails)]; // Remove duplicates
    const text = html.replace(/<[^>]*>/g, '');
    const results = [];

    for (const emailAddress of emailAddresses) {
      const result = await this.sendEmailWithLogging(
        emailAddress,
        `📧 Contacto - ${name} - ${subject || 'Sin asunto'}`,
        html,
        text,
        'contact_form',
        { senderName: name, senderEmail: email, senderPhone: phone, subject: subject || '' }
      );
      results.push(result);
    }

    return results;
  }

  async sendVehicleValuationNotification(formData: any) {
    // Initialize config if not loaded
    if (!this.config) {
      await this.initialize();
    }
    
    if (!this.config) {
      console.warn('Email service not configured. Skipping vehicle valuation notification.');
      return;
    }

    const { name, email, phone, make, model, year, kilometer, fuel, condition, additional, images } = formData;

    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #dc3545; color: white; padding: 20px; border-radius: 10px 10px 0 0;">
            <h2 style="margin: 0; color: white;">🚗 Nueva Solicitud de Tasación</h2>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border: 1px solid #e9ecef;">
            <div style="background-color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
              <h3 style="color: #dc3545; margin-top: 0;">Datos del cliente</h3>
              <p><strong>Nombre:</strong> ${name}</p>
              <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
              ${phone ? `<p><strong>Teléfono:</strong> ${phone}</p>` : ''}
            </div>
            
            <div style="background-color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
              <h3 style="color: #dc3545; margin-top: 0;">Datos del vehículo</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <p><strong>Marca:</strong> ${make}</p>
                <p><strong>Modelo:</strong> ${model}</p>
                <p><strong>Año:</strong> ${year}</p>
                <p><strong>Kilómetros:</strong> ${kilometer} km</p>
                <p><strong>Combustible:</strong> ${fuel}</p>
                ${images && images.length > 0 ? `<p><strong>Imágenes:</strong> ${images.length} adjuntas</p>` : ''}
              </div>
            </div>
            
            <div style="background-color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
              <h3 style="color: #dc3545; margin-top: 0;">Estado del vehículo</h3>
              <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; border-radius: 3px; margin-bottom: 15px;">
                <p style="white-space: pre-wrap; margin: 0;"><strong>Condición:</strong> ${condition}</p>
              </div>
              ${additional ? `
                <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #6c757d; border-radius: 3px;">
                  <p style="white-space: pre-wrap; margin: 0;"><strong>Información adicional:</strong> ${additional}</p>
                </div>
              ` : ''}
            </div>
            
            ${images && images.length > 0 ? `
              <div style="background-color: white; padding: 20px; border-radius: 5px;">
                <h3 style="color: #dc3545; margin-top: 0;">Imágenes del vehículo (${images.length})</h3>
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center;">
                  <p style="margin: 0; color: #495057; font-size: 14px;">
                    📎 <strong>${images.length} imagen${images.length > 1 ? 'es' : ''} adjunta${images.length > 1 ? 's' : ''} a este email</strong>
                  </p>
                  <p style="margin: 10px 0 0 0; font-size: 12px; color: #6c757d; font-style: italic;">
                    Las imágenes aparecen como archivos adjuntos en este correo para su descarga y revisión.
                  </p>
                </div>
              </div>
            ` : ''}
          </div>
          
          <div style="background-color: #dc3545; color: white; padding: 15px; border-radius: 0 0 10px 10px; text-align: center;">
            <p style="margin: 0; font-weight: bold;">⚡ ACCIÓN REQUERIDA: Contactar al cliente para coordinar tasación</p>
          </div>
        </body>
      </html>
    `;

    // Preparar adjuntos de imágenes
    const attachments = [];
    if (images && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        const imagePath = images[i];
        try {
          // Construir la ruta completa al archivo
          const fullPath = path.join(process.cwd(), imagePath.startsWith('/') ? imagePath.substring(1) : imagePath);
          
          // Verificar si el archivo existe
          if (fs.existsSync(fullPath)) {
            const fileName = path.basename(imagePath);
            const extension = path.extname(fileName).toLowerCase();
            
            // Determinar el tipo MIME basado en la extensión
            let contentType = 'application/octet-stream';
            if (extension === '.jpg' || extension === '.jpeg') {
              contentType = 'image/jpeg';
            } else if (extension === '.png') {
              contentType = 'image/png';
            } else if (extension === '.gif') {
              contentType = 'image/gif';
            } else if (extension === '.webp') {
              contentType = 'image/webp';
            }

            attachments.push({
              filename: `vehiculo_${make}_${model}_imagen_${i + 1}${extension}`,
              path: fullPath,
              contentType: contentType
            });
          } else {
            console.warn(`⚠️ Imagen no encontrada: ${fullPath}`);
          }
        } catch (error) {
          console.error(`❌ Error procesando imagen ${imagePath}:`, error);
        }
      }
    }

    // Send to admin email - remove duplicates
    const allEmails = [this.config.adminEmail, ...this.config.orderNotificationEmails].filter(Boolean);
    const emailAddresses = [...new Set(allEmails)]; // Remove duplicates
    const text = html.replace(/<[^>]*>/g, '');
    const results = [];

    for (const emailAddress of emailAddresses) {
      const result = await this.sendEmailWithLogging(
        emailAddress,
        `🚗 TASACIÓN - ${make} ${model} ${year} - ${name}`,
        html,
        text,
        'vehicle_valuation',
        { 
          senderName: name, 
          senderEmail: email, 
          senderPhone: phone,
          vehicleMake: make,
          vehicleModel: model,
          vehicleYear: year,
          imagesCount: images ? images.length : 0,
          attachmentsCount: attachments.length
        },
        attachments
      );
      results.push(result);
    }

    return results;
  }

  async sendOrderStatusChangeNotification(orderData: any) {
    // Initialize config if not loaded
    if (!this.config) {
      await this.initialize();
    }
    
    if (!this.config) {
      console.warn('Email service not configured. Skipping order status change notification.');
      return;
    }

    const { 
      orderId, 
      orderReference, 
      customerName, 
      customerEmail, 
      newStatus, 
      previousStatus,
      transportAgency,
      expeditionNumber,
      adminObservations 
    } = orderData;

    // Definir información del estado
    const statusInfo = {
      pendiente_verificar: {
        title: 'Pendiente de Verificación',
        color: '#f59e0b',
        description: 'Tu pedido está siendo revisado por nuestro equipo',
        nextStep: 'Te notificaremos cuando el pedido sea verificado'
      },
      verificado: {
        title: 'Verificado',
        color: '#3b82f6',
        description: 'Tu pedido ha sido verificado y se está preparando',
        nextStep: 'Procederemos con el embalaje de tus productos'
      },
      embalado: {
        title: 'Embalado',
        color: '#8b5cf6',
        description: 'Tu pedido está embalado y listo para envío',
        nextStep: 'Se coordinará el envío con la empresa de transporte'
      },
      enviado: {
        title: 'Enviado',
        color: '#10b981',
        description: 'Tu pedido está en camino',
        nextStep: 'Recibirás tu pedido en la dirección especificada'
      },
      incidencia: {
        title: 'Incidencia',
        color: '#ef4444',
        description: 'Ha surgido una incidencia con tu pedido',
        nextStep: 'Nuestro equipo se pondrá en contacto contigo'
      }
    };

    const currentStatusInfo = statusInfo[newStatus as keyof typeof statusInfo] || {
      title: 'Estado Actualizado',
      color: '#6b7280',
      description: 'El estado de tu pedido ha cambiado',
      nextStep: 'Te mantendremos informado de cualquier cambio'
    };

    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px; padding: 20px; background-color: ${currentStatusInfo.color}; color: white; border-radius: 5px;">
              <h1 style="margin: 0;">📋 Estado de Pedido Actualizado</h1>
              <h2 style="margin: 10px 0; background-color: rgba(255,255,255,0.2); padding: 10px; border-radius: 5px;">${orderReference}</h2>
            </div>
            
            <div style="margin-bottom: 30px;">
              <h3 style="color: #2c5282;">Hola ${customerName},</h3>
              <p style="margin: 15px 0; font-size: 16px; line-height: 1.6;">
                El estado de tu pedido <strong>${orderReference}</strong> ha sido actualizado.
              </p>
            </div>

            <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; border-left: 4px solid ${currentStatusInfo.color}; margin-bottom: 20px;">
              <h3 style="color: ${currentStatusInfo.color}; margin-top: 0;">🔄 Nuevo Estado: ${currentStatusInfo.title}</h3>
              <p style="margin: 10px 0; font-size: 16px;">${currentStatusInfo.description}</p>
              <p style="margin: 10px 0; font-style: italic; color: #666;"><strong>Próximo paso:</strong> ${currentStatusInfo.nextStep}</p>
            </div>

            ${transportAgency || expeditionNumber ? `
              <div style="background-color: #e6fffa; padding: 20px; border-radius: 8px; border-left: 4px solid #38b2ac; margin-bottom: 20px;">
                <h3 style="color: #2c5282; margin-top: 0;">🚚 Información de Envío</h3>
                ${transportAgency ? `<p style="margin: 8px 0;"><strong>Empresa de transporte:</strong> ${transportAgency}</p>` : ''}
                ${expeditionNumber ? `<p style="margin: 8px 0;"><strong>Número de seguimiento:</strong> <span style="font-family: monospace; background-color: #fff; padding: 2px 6px; border-radius: 3px;">${expeditionNumber}</span></p>` : ''}
              </div>
            ` : ''}

            ${adminObservations ? `
              <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin-bottom: 20px;">
                <h4 style="color: #856404; margin-top: 0;">💬 Notas adicionales:</h4>
                <p style="margin: 0; color: #856404;">${adminObservations}</p>
              </div>
            ` : ''}
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <p>Si tienes alguna pregunta sobre tu pedido, no dudes en contactarnos:</p>
              <p><strong>📞 Teléfono:</strong> 958 79 08 58</p>
              <p><strong>📧 Email:</strong> info@desguacesmurcia.com</p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; color: #666;">
              <p>Gracias por confiar en Desguace Murcia</p>
              <p><em>Tu especialista en piezas de automóvil</em></p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = html.replace(/<[^>]*>/g, '');
    
    return await this.sendEmailWithLogging(
      customerEmail,
      `Estado de Pedido Actualizado: ${currentStatusInfo.title} - ${orderReference}`,
      html,
      text,
      'order_status_change',
      { orderId, orderReference, newStatus, previousStatus, customerName }
    );
  }

  async sendPaymentStatusChangeNotification(orderData: any) {
    // Initialize config if not loaded
    if (!this.config) {
      await this.initialize();
    }
    
    if (!this.config) {
      console.warn('Email service not configured. Skipping payment status change notification.');
      return;
    }

    const { 
      orderId, 
      orderReference, 
      customerName, 
      customerEmail, 
      newPaymentStatus, 
      previousPaymentStatus 
    } = orderData;

    // Definir información del estado de pago
    const paymentStatusInfo = {
      pagado: {
        title: 'Pago Confirmado',
        color: '#10b981',
        icon: '✅',
        description: 'Tu pago ha sido confirmado correctamente',
        nextStep: 'Tu pedido será procesado inmediatamente'
      },
      pendiente: {
        title: 'Pago Pendiente',
        color: '#f59e0b',
        icon: '⏳',
        description: 'Estamos esperando la confirmación de tu pago',
        nextStep: 'Una vez confirmado el pago, procesaremos tu pedido'
      }
    };

    const currentPaymentInfo = paymentStatusInfo[newPaymentStatus as keyof typeof paymentStatusInfo] || {
      title: 'Estado de Pago Actualizado',
      color: '#6b7280',
      icon: '💳',
      description: 'El estado de tu pago ha cambiado',
      nextStep: 'Te mantendremos informado de cualquier cambio'
    };

    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px; padding: 20px; background-color: ${currentPaymentInfo.color}; color: white; border-radius: 5px;">
              <h1 style="margin: 0;">${currentPaymentInfo.icon} Estado de Pago Actualizado</h1>
              <h2 style="margin: 10px 0; background-color: rgba(255,255,255,0.2); padding: 10px; border-radius: 5px;">${orderReference}</h2>
            </div>
            
            <div style="margin-bottom: 30px;">
              <h3 style="color: #2c5282;">Hola ${customerName},</h3>
              <p style="margin: 15px 0; font-size: 16px; line-height: 1.6;">
                El estado del pago de tu pedido <strong>${orderReference}</strong> ha sido actualizado.
              </p>
            </div>

            <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; border-left: 4px solid ${currentPaymentInfo.color}; margin-bottom: 20px;">
              <h3 style="color: ${currentPaymentInfo.color}; margin-top: 0;">${currentPaymentInfo.icon} ${currentPaymentInfo.title}</h3>
              <p style="margin: 10px 0; font-size: 16px;">${currentPaymentInfo.description}</p>
              <p style="margin: 10px 0; font-style: italic; color: #666;"><strong>Próximo paso:</strong> ${currentPaymentInfo.nextStep}</p>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <p>Si tienes alguna pregunta sobre tu pago o pedido, no dudes en contactarnos:</p>
              <p><strong>📞 Teléfono:</strong> 958 79 08 58</p>
              <p><strong>📧 Email:</strong> info@desguacesmurcia.com</p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; color: #666;">
              <p>Gracias por confiar en Desguace Murcia</p>
              <p><em>Tu especialista en piezas de automóvil</em></p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = html.replace(/<[^>]*>/g, '');
    
    return await this.sendEmailWithLogging(
      customerEmail,
      `Estado de Pago Actualizado: ${currentPaymentInfo.title} - ${orderReference}`,
      html,
      text,
      'payment_status_change',
      { orderId, orderReference, newPaymentStatus, previousPaymentStatus, customerName }
    );
  }
}

export const emailService = new EmailService();