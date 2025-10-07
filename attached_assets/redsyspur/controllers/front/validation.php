<?php
/**
 * NOTA SOBRE LA LICENCIA DE USO DEL SOFTWARE
 *
 * El uso de este software está sujeto a las Condiciones de uso de software que
 * se incluyen en el paquete en el documento "Aviso Legal.pdf". También puede
 * obtener una copia en la siguiente url:
 * http://www.redsys.es/wps/portal/redsys/publica/areadeserviciosweb/descargaDeDocumentacionYEjecutables
 *
 * Redsys es titular de todos los derechos de propiedad intelectual e industrial
 * del software.
 *
 * Quedan expresamente prohibidas la reproducción, la distribución y la
 * comunicación pública, incluida su modalidad de puesta a disposición con fines
 * distintos a los descritos en las Condiciones de uso.
 *
 * Redsys se reserva la posibilidad de ejercer las acciones legales que le
 * correspondan para hacer valer sus derechos frente a cualquier infracción de
 * los derechos de propiedad intelectual y/o industrial.
 *
 * Redsys Servicios de Procesamiento, S.L., CIF B85955367
 */

if(!class_exists("Redsys_Refund")) {
	require_once('redsys_refund.php');
}

class RedsyspurValidationModuleFrontController extends ModuleFrontController  {

    protected $order_method = 'redireccion';

    public function postProcess() {
        try{
            /** Identificamos que la petición ha llegado hasta el validador. */
            http_response_code(100);
            /** Se crean los objetos principales de la clase. */
            $miObj = new RedsyspurAPI;
            $redsys = new Redsyspur();
            /** Se obtiene el contexto principal. */
            $context = Context::getContext();

            /** Se recogen los datos de entrada. **/
            $dsSignatureVersion   = Tools::getValue('Ds_SignatureVersion', false);
            $dsMerchantParameters = Tools::getValue('Ds_MerchantParameters', false);
            $dsSignature          = Tools::getValue('Ds_Signature', false);

            /** Se comprueba si la URL ha entrado con parámetros. */
            if (!$dsMerchantParameters or !$dsSignature) {

                http_response_code(400);
                die ('La URL de notificación o del retorno de navegación no contiene parámetros válidos, por lo que no se puede redireccionar de nuevo a la tienda. Revisa tu historial de pedidos accediendo a la tienda de nuevo y en caso de duda contacta con el comercio.');
            }
        
            /** Se decodifican los datos enviados y se carga el array de datos **/
            $miObj->decodeMerchantParameters($dsMerchantParameters);

            /** Se inicializan los objetos necesarios para crear los registros de log. **/
            $logLevel  = Configuration::get('REDSYS_LOG');
            $logString = Configuration::get( 'REDSYS_LOG_STRING' );
            
            $pedido = $miObj->getParameter('Ds_Order');
            $idLog = generateIdLog($logLevel, $logString, $pedido);

            /** Se identifica la operacion en el registro. */
            if (!empty($_POST))
                escribirLog("INFO ", $idLog, "***** VALIDACIÓN DE LA NOTIFICACIÓN  ──  PEDIDO " . $pedido . " *****");
            else
                escribirLog("INFO ", $idLog, "***** RETORNO DE NAVEGACIÓN  ──  PEDIDO " . $pedido . " *****");

            /** Obtenemos los datos del TPV a partir del método de pago. **/
            $gateway_params = $redsys->getGatewayParameters($this->order_method);

            $claveComercio = $gateway_params['clave'];
            $codigoOrig = $gateway_params['fuc'];
            $metodo = $gateway_params['nombre'];

            if($this->order_method == 'redireccion' and $miObj->getParameter('Ds_ProcessedPayMethod') == 68)
                $metodo = "Redsys - Bizum SIS";
            
            escribirLog("DEBUG", $idLog, "Parámetros de la notificación : " . $dsMerchantParameters);
            escribirLog("DEBUG", $idLog, "Firma recibida del TPV Virtual: " . $dsSignature);
            
            /** Comprobacion de la firma y rechazo del procesamiento si no coinciden. */
            if (!RedsyspurValidationModuleFrontController::validarFirma($miObj, $dsMerchantParameters, $dsSignature, $claveComercio, $dsSignatureVersion, $idLog)) {
                
                http_response_code(403);
                escribirLog("ERROR", $idLog, "Las firmas no coinciden, la notificación se rechazará con error HTTP 403.");
                die ('La petición no puede ser atendida porque las firmas no coinciden.');
            }
            
            /** Se obtienen datos esenciales para el funcionamiento de procesamiento. */
            $merchantData = b64url_decode($miObj->getParameter('Ds_MerchantData'));
            $merchantData = json_decode( $merchantData );

            $cart = new Cart($merchantData->idCart);

            if ($cart->id_customer == 0)
                escribirLog("DEBUG", $idLog, "No se ha encontrado ningún cliente válido.");
            else if ($cart->id_guest == 0)
                escribirLog("DEBUG", $idLog, "No se ha encontrado ningún invitado válido.");

            /** Validamos Objeto cliente **/
            $customer = ($cart->id_customer != 0) ? new Customer((int)$cart->id_customer) : new Guest((int)$cart->id_guest);
            $address = new Address((int)$cart->id_address_invoice);

            /** Generamos los contextos necesarios */
            Context::getContext()->cart = $cart;
            Context::getContext()->customer = $customer;
            Context::getContext()->country = new Country((int)$address->id_country);
            Context::getContext()->language = new Language((int)$cart->id_lang);
            Context::getContext()->currency = new Currency((int)$cart->id_currency);

            if(Configuration::get('REDSYS_LOG_CART'))
                Redsyspur::imprimirCarritoComoJSON($cart, $idLog);

            if (!Validate::isLoadedObject($customer)) {

                escribirLog("ERROR", $idLog, "El objeto del cliente no es válido.");
                (empty($customer)) ? ($customerInfo = "El objeto del cliente está vacío.") : ($customerInfo = serialize($customer));

                if(Configuration::get('REDSYS_LOG_CART'))
                    escribirLog("INFO ", $idLog, "VALIDACION ─ CLIENTE SERIALIZADO: " . $customerInfo);
            }
                     
            if (!$cart->id_address_delivery)
                escribirLog("ERROR", $idLog, "La dirección de envío que llega en el carrito está vacía, ¿puede ser por un producto digital?");

            if (!$cart->id_address_invoice)
                escribirLog("ERROR", $idLog, "La dirección de facturación que llega en el carrito está vacía."); 

			if (!$cart->id_carrier)
                escribirLog("ERROR", $idLog, "El carrito no tiene un transportista válido."); 

            /** Se obtiene cuál es el estado configurado como "estado final" en la configuración del módulo. */
            $estadoFinal = Configuration::get("REDSYS_ESTADO_PEDIDO");
            
            /** Control de navegación en caso de que el cliente sea redirigido al validation. */
            /** Se accede sólo si el POST está vacío pero sí que tenemos merchantParameters. */
            if (empty($_POST) and $dsMerchantParameters) {
                                
                escribirLog("INFO ", $idLog, "Cliente redirigido al validador a través del retorno de navegación.");

                /** Se prepara el Link para poder redirigir al cliente. */
                $Linkobj = new Link();

                if (($cart->id_customer == 0))
                    $customer = new Guest((int)$cart->id_guest);
                else
                    $customer = new Customer((int)$cart->id_customer);

                $urlRedirect = $Linkobj->getPageLink('order-confirmation') . '?id_cart='.$cart->id.'&id_module='.$redsys->id.'&id_order='.Order::getOrderByCartId($cart->id).'&key='.$customer->secure_key;
                
                /** Se evalúa si se necesita procesar la notificación usando parámetros GET comprobando si getOrderByCartId nos devuelve un pedido. Si lo hiciera, el pedido existe y no hay que validar. */
                if (!Order::getOrderByCartId($merchantData->idCart) and Configuration::get('REDSYS_NOTIFICACION_GET')) {

                    escribirLog("INFO ", $idLog, "Se van utilizar los datos recibidos vía GET para validar el pedido " . $pedido . " porque REDSYS_NOTIFICACION_GET es " . Configuration::get('REDSYS_NOTIFICACION_GET'));

                    /** Si la validación sale mal, fijamos el checkout como la URL a la que redirigir. */
                    if (!RedsyspurValidationModuleFrontController::confirmarPedido($miObj, $redsys, $cart, $customer, $merchantData, $metodo, $pedido, $this->order_method, $estadoFinal, $idLog))
                        $urlRedirect = $Linkobj->getPageLink('order') . '?step=1';                    
                }
                
                escribirLog("DEBUG", $idLog, "Redireccionando cliente a: " . $urlRedirect);

                http_response_code(308);
                Tools::redirect($urlRedirect);

                exit();
            }

			/** Evaluamos si el pedido ya está creado, y si es así, registramos que no lo tenemos que tocar. */
            if (Order::getOrderByCartId($merchantData->idCart) and Configuration::get('REDSYS_NOTIFICACION_GET')) {
				
				http_response_code(422);
				escribirLog("ERROR", $idLog, "Se ha recibido una notificación pero la orden ya está creada.");
				
				die("Se ha recibido una notificación pero la orden ya está creada.");
            
			} else {

				/** Ejectuamos la lógica de confirmación del pedido. */
				RedsyspurValidationModuleFrontController::confirmarPedido($miObj, $redsys, $cart, $customer, $merchantData, $metodo, $pedido, $this->order_method, $estadoFinal, $idLog);
				
                exit();
			}
        
        } catch (Exception $e) {
            
            http_response_code(500);
            escribirLog("ERROR", "0000000000000000000000000ERROR", "Excepción en la validación: ".$e->getMessage());

            die("Excepcion en la validacion.");
        }
    }

    public static function validarFirma($miObj, $dsMerchantParameters, $dsSignature, $claveComercio, $dsSignatureVersion, $idLog = false) {
        
        $dsSignatureLOCAL = $miObj->createMerchantSignatureNotif($claveComercio,$dsMerchantParameters);
        
        escribirLog("DEBUG", $idLog, "Firma calculada notificación  : " . $dsSignatureLOCAL);
        escribirLog("DEBUG", $idLog, "Firma calculada usando la clave de encriptación [" . $dsSignatureVersion . "] " . substr($claveComercio, 0, 3) . "*");

        if ($dsSignature === $dsSignatureLOCAL)
            return true;
        else
            return false;
    }

    public static function confirmarPedido($miObj, $redsys, $cart, $customer, $merchantData, $metodo, $pedido, $order_method, $estadoFinal, $idLog = false) {

        /** Se extraen todos los datos de la notificación. **/
        $total            = (int)$miObj->getParameter('Ds_Amount');  
        $idCart           = $merchantData->idCart;
        $codigo           = (int)$miObj->getParameter('Ds_MerchantCode');
        $terminal         = (int)$miObj->getParameter('Ds_Terminal');
        $moneda           = (int)$miObj->getParameter('Ds_Currency');
        $respuesta        = $miObj->getParameter('Ds_Response');
        $authCode         = $miObj->getParameter('Ds_AuthorisationCode');
        $tipoTransaccion  = (int)$miObj->getParameter('Ds_TransactionType');

        $metodoOrder = "N/A";

        if ($respuesta < 101)
            $metodoOrder = "Autorizada " . $authCode;    
        else if ($respuesta >= 101)
            $metodoOrder = "Denegada " . $respuesta;

        /** Se escriben en el registro los datos recibidos. */
        escribirLog("DEBUG", $idLog, "ID del Carrito: " . $idCart);
        escribirLog("DEBUG", $idLog, "Codigo Comercio FUC: " . $codigo);
        escribirLog("DEBUG", $idLog, "Terminal: " . $terminal);
        escribirLog("DEBUG", $idLog, "Moneda: " . $moneda);
        escribirLog("DEBUG", $idLog, "Codigo de respuesta del SIS: " . $respuesta);
        escribirLog("DEBUG", $idLog, "Método de Pago: " . $metodo);
        escribirLog("DEBUG", $idLog, "Información adicional del módulo: " . $merchantData->moduleComent);

        /** Análisis de respuesta del SIS. */
        $erroresSIS = array();
        $errorBackofficeSIS = "";

        include 'erroresSIS.php';

        if (array_key_exists($respuesta, $erroresSIS)) {
            
            $errorBackofficeSIS  = $respuesta;
            $errorBackofficeSIS .= ' - '.$erroresSIS[$respuesta].'.';
        
        } else {

            $errorBackofficeSIS = "La operación ha finalizado con errores. Consulte el módulo de administración del TPV Virtual.";
        }
        
        $authCode = str_replace("+", "", $authCode);
        escribirLog("DEBUG", $idLog, "Código de Autorización: " . $authCode);
        
        /** Datos de la moneda y el total del carrito. */
        $currency = new Currency($cart->id_currency);
        $currency_decimals = is_array($currency) ? (int) $currency['decimals'] : (int) $currency->decimals;
        $decimals = $currency_decimals * $currency->precision;

        $totalPrestashop = $total / (10**$decimals);
        
        /** Se valida el pedido cuando la operación es genuina y válida. */
        if ((int)$respuesta < 101) {

            if ($tipoTransaccion == '0' && ($cart->getOrderTotal(true, Cart::ONLY_SHIPPING) > 0) )
                $shippingPaid = 1;
            else
                $shippingPaid = 0;

            escribirLog("DEBUG", $idLog, "Importe del envío: " . number_format($cart->getOrderTotal(true, Cart::ONLY_SHIPPING), 2) . " | ¿Envío pagado?: " . ($shippingPaid ? "SI" : "NO"));
   
            $redsys->validateOrder($cart->id, $estadoFinal, $totalPrestashop, $metodo, "[REDSYS] " . $errorBackofficeSIS, array('transaction_id' => $pedido), (int)$cart->id_currency, false, (property_exists($customer, "secure_key") && !is_null($customer->secure_key)) ? $customer->secure_key : false);

            /** Guardamos la referencia si en la notificación está incluida. */
            $merchantIdentifier = $miObj->getParameter('Ds_Merchant_Identifier');
            if (Configuration::get ( 'REDSYS_REFERENCIA' ) == 1 and ! $cart->isGuestCartByCartId ( $cart->id ) and $merchantIdentifier != null) {
                
                $cardNumber=$miObj->getParameter('Ds_Card_Number');
                $brand=$miObj->getParameter('Ds_Card_Brand');
                $cardType=$miObj->getParameter('Ds_Card_Type');
                $redsys->saveReference ( $customer->id, $merchantIdentifier, $cardNumber, $brand, $cardType);
            }

            /** Se guarda el ID para posteriores operaciones sobre la orden. */
            $order = Order::getByCartId($cart->id);

            Redsys_Order::saveOrderDetails($order->id, $pedido, $order_method, $miObj->getParameter('Ds_TransactionType'), $total, $shippingPaid);
            $redsys->addPaymentInfo($idCart, $pedido, $metodoOrder, $idLog, true);

            /** Imprimimos el resultado en el registro. */
            escribirLog("INFO ", $idLog, "El pedido con ID de carrito " . $cart->id . " (" . $pedido . ") es válido y se ha registrado correctamente.");
            escribirLog("INFO ", $idLog, $errorBackofficeSIS);
            
            echo "Pedido validado con éxito ── " . $errorBackofficeSIS;
            http_response_code(200);
            
            return(1);
            
        } else {

            /** Si el comercio NO quiere mantener el carrito, guaradmos la orden con el estado de cancelada en caso de fallo. */
            if (!Configuration::get('REDSYS_MANTENER_CARRITO')) {

                $redsys->validateOrder($idCart, _PS_OS_CANCELED_, 0, $metodo, "[REDSYS] " . $errorBackofficeSIS);
                $redsys->addPaymentInfo($idCart, $pedido, $metodoOrder, $idLog);
            }
        }

        /** E imprimimos en el registro que ha habido errores. */
        /** Fuera del IF para que si no se ha cumplido ninguna condición, se marque que ha habido error. */
        escribirLog("ERROR", $idLog, "El pedido con ID de carrito " . $idCart . " (" . $pedido . ") ha finalizado con errores.");
        escribirLog("ERROR", $idLog, $errorBackofficeSIS);
        
        echo "El pedido ha finalizado con errores ── " . $errorBackofficeSIS;
        http_response_code(200);
        
        return(0);
    }
}