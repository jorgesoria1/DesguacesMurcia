import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';

interface RedsysData {
  formHtml: string;
  actionUrl: string;
  merchantParameters: string;
  signature: string;
  orderNumber: string;
  redsysOrderNumber?: string;
  amount: number;
  reference?: string;
  totalAmount?: number;
}

export default function RedsysRedirect() {
  const [, setLocation] = useLocation();
  const [redsysData, setRedsysData] = useState<RedsysData | null>(null);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitToRedsys = () => {
    if (!redsysData) return;
    
    setIsSubmitting(true);
    
    
    // 🔥 NUEVA ESTRATEGIA: Usar el HTML del formulario generado por el backend
    if (redsysData.formHtml) {
      
      // Crear un contenedor temporal para el HTML de forma segura
      const tempDiv = document.createElement('div');
      
      // Usar DOMParser para parsear HTML de forma segura (evita XSS)
      const parser = new DOMParser();
      const doc = parser.parseFromString(redsysData.formHtml, 'text/html');
      
      // Extraer solo el formulario del documento parseado
      const parsedForm = doc.querySelector('form');
      if (parsedForm) {
        tempDiv.appendChild(parsedForm.cloneNode(true));
      }
      
      // Buscar el formulario en el contenedor seguro
      const form = tempDiv.querySelector('form');
      if (form) {
        // Añadir el formulario al DOM
        form.style.display = 'none';
        document.body.appendChild(form);
        
        
        // Verificar campos específicos
        const dsSignatureVersion = form.querySelector('input[name="Ds_SignatureVersion"]') as HTMLInputElement;
        const dsMerchantParameters = form.querySelector('input[name="Ds_MerchantParameters"]') as HTMLInputElement;
        const dsSignature = form.querySelector('input[name="Ds_Signature"]') as HTMLInputElement;
        
        
        // Enviar formulario
        form.submit();
        
        // Limpiar sessionStorage después del envío
        sessionStorage.removeItem('redsysPaymentData');
        return;
      }
    }
    
    // FALLBACK: Crear formulario manualmente si no hay HTML del backend
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = redsysData.actionUrl;
    form.acceptCharset = 'UTF-8';
    form.enctype = 'application/x-www-form-urlencoded';
    form.style.display = 'none';
    
    // Campo versión de firma
    const signatureVersionInput = document.createElement('input');
    signatureVersionInput.type = 'hidden';
    signatureVersionInput.name = 'Ds_SignatureVersion';
    signatureVersionInput.value = 'HMAC_SHA256_V1';
    form.appendChild(signatureVersionInput);
    
    // Campo parámetros del comercio
    const merchantParametersInput = document.createElement('input');
    merchantParametersInput.type = 'hidden';
    merchantParametersInput.name = 'Ds_MerchantParameters';
    merchantParametersInput.value = redsysData.merchantParameters;
    form.appendChild(merchantParametersInput);
    
    // Campo firma
    const signatureInput = document.createElement('input');
    signatureInput.type = 'hidden';
    signatureInput.name = 'Ds_Signature';
    signatureInput.value = redsysData.signature;
    form.appendChild(signatureInput);
    
    // Añadir al DOM y enviar inmediatamente
    document.body.appendChild(form);
    
    
    // Enviar formulario
    form.submit();
    
    // Limpiar sessionStorage después del envío
    sessionStorage.removeItem('redsysPaymentData');
  };

  useEffect(() => {
    // Obtener datos de sessionStorage
    const storedData = sessionStorage.getItem('redsysPaymentData');
    if (!storedData) {
      setError('No se encontraron datos de pago. Redirigiendo al checkout...');
      setTimeout(() => setLocation('/checkout'), 3000);
      return;
    }

    try {
      const data = JSON.parse(storedData);
      setRedsysData(data);
      
      // Log de debugging
      
      // Automáticamente enviar a Redsys después de un breve delay
      setTimeout(() => {
        handleSubmitToRedsys();
      }, 1500); // 1.5 segundos para mostrar la página intermedia
      
    } catch (err) {
      setError('Error al procesar los datos de pago');
    }
  }, [setLocation]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error en el proceso de pago</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => setLocation('/checkout')}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Volver al checkout
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!redsysData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Preparando el pago...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Redirigiendo al pago seguro</h2>
          <p className="text-gray-600 mb-4">
            Estás siendo redirigido a la pasarela de pago segura de Redsys para completar tu compra.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="text-sm text-gray-600 mb-2">
              <div className="flex justify-between">
                <span>Pedido:</span>
                <span className="font-medium">{redsysData.reference || redsysData.orderNumber || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>Importe:</span>
                <span className="font-medium">{redsysData.totalAmount ? redsysData.totalAmount.toFixed(2) : (redsysData.amount ? (redsysData.amount / 100).toFixed(2) : '0.00')}€</span>
              </div>
            </div>
          </div>
          
          {!isSubmitting ? (
            <button
              onClick={handleSubmitToRedsys}
              className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Continuar con el pago en Redsys
            </button>
          ) : (
            <div className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Redirigiendo a Redsys...
              </div>
            </div>
          )}
          
          <p className="text-xs text-gray-500 mt-4">
            Si no eres redirigido automáticamente, haz clic en el botón de arriba.
          </p>
        </div>
      </div>
    </div>
  );
}