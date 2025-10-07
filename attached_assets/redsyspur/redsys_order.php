<?php

require_once dirname ( __FILE__ ) . '/ApiRedsysREST/initRedsysApi.php';

class Redsys_Order {

    const ORDER_TABLE_NAME = _DB_PREFIX_."redsys_order";
    const ORDER_CONFIRMATION_TABLE_NAME = _DB_PREFIX_."redsys_order_confirmation";

    private static $_estado;

	public static function confirmation($gateway, $idOrder, $amount, $dataCapture = null){
		return self::transaction($gateway, $idOrder, RESTConstants::$CONFIRMATION, $amount, $dataCapture);
    }

	public static function refund($gateway, $idOrder, $amount, $idLog = null, $shipmentRefund = null){
        $orderDetails = self::getOrderDetails($idOrder);
        if($orderDetails['transaction_type'] == RESTConstants::$PREAUTHORIZATION){
            $orderConfirmationDetails = self::getOrderConfirmationDetails($idOrder);

            $amount = (int) round(($amount * 100), 0);

            if(!$orderConfirmationDetails){
                return array(
                    'result' => 0,
                    'error' => 'No se ha encontrado detalles de la orden sobre la que se quiere realizar la devolución.'
                );
            
            } else if (!self::refundAmountValidation($idOrder, $orderConfirmationDetails, $amount)) {
                return array(
                    'result' => 0,
                    'error' => 'El importe es incorrecto.'
                );
            }

            $amountRefunded = false;
            foreach($orderConfirmationDetails as $orderConfirmationDetail){
                $rts = $orderConfirmationDetail['rts'];
                $amountToRefund = min($amount, $orderConfirmationDetail['confirmation_amount'] - $orderConfirmationDetail['refund_amount']);
                if($amountToRefund){
                    $response = self::transaction($gateway, $idOrder, RESTConstants::$REFUND, $amountToRefund/pow(10, 2), null, $rts, $idLog, $shipmentRefund);

                    if($response['result']){
                        Db::getInstance(_PS_USE_SQL_SLAVE_)->execute("UPDATE `" . self::ORDER_CONFIRMATION_TABLE_NAME . "` SET refund_amount = '" . ($orderConfirmationDetail['refund_amount'] + $amountToRefund) . "' WHERE id_order = " . $idOrder . " AND rts = '" . $rts . "';");
                        $amount -= $amountToRefund;
                        $amountRefunded = true;
                        if(!$amount){
                            return $response;
                        }
                    }else{
                        if($amountRefunded){
                            $response['error'] = "Se ha realizado una devolución parcial correctamente pero ha fallado otra | " . $response['error'];
                        }
                        return $response;
                    }
                }else{
                    $response = array(
                        'result' => 1,
                        'error' => 'El importe a devolver es 0, es posible que se tenga que rotar el RTS y esto no sea necesariamente un error.'
                    );
                }
            }
            return $response;
        }else{
            return self::transaction($gateway, $idOrder, RESTConstants::$REFUND, $amount, null, null, null, $shipmentRefund);
        }
    }

	public static function cancellation($gateway, $idOrder, $amount, $dataCapture = null){
        return self::transaction($gateway, $idOrder, RESTConstants::$CANCELLATION, $amount, $dataCapture);
    }

	private static function transaction($gateway, $idOrder, $transactionType, $amount = null, $dataCapture = null, $rts = null, $idLog = null, $shipmentRefund = null){
        $orderDetails = self::getOrderDetails($idOrder);

        $logLevel  = Configuration::get( 'REDSYS_LOG' );
        $logString = Configuration::get( 'REDSYS_LOG_STRING' );
        $idLog = generateIdLog($logLevel, $logString, $orderDetails['redsys_order']);

        if(!$orderDetails){
            escribirLog("ERROR", $idLog, "No supero las validaciones al no encontrar la orden registrada");
            return array(
                'result' => 0,
                'error' => 'No se encuentra la orden registrada'
            );
        }

        if(!$amount){
            $amount = $orderDetails['grand_total'];
        }

        $amount = (int) round(($amount * 100), 0);
        
		$request = new RestOperationMessage();

        if($transactionType == RESTConstants::$CANCELLATION){
            //Anulacion de Pago (45) o Anulacion de Preautorizacion (9)
            $transactionType = $orderDetails['transaction_type'] == RESTConstants::$AUTHORIZATION? RESTConstants::$PAYMENT_CANCELLATION : RESTConstants::$CANCELLATION;
        }

        if($transactionType == RESTConstants::$CONFIRMATION){
            //Si es una confirmacion parcial, utilizamos el tipo de operacion 48
            if($amount < $orderDetails['grand_total']){
                $transactionType = RESTConstants::$PARTIAL_CONFIRMATION;
            }
        }
        
        escribirLog("DEBUG", $idLog, "Se va a realizar una " . self::getTransactionTypeString($transactionType) . " para el pedido " . $orderDetails['redsys_order']);

        if(!self::amountValidation($idOrder, $transactionType, $amount)){
            escribirLog("ERROR", $idLog, "No supero las validaciones del importe");
            return array(
                'result' => 0,
                'error' => 'El importe es incorrecto'
            );
        }

        try{
            $redsyspur = new Redsyspur();
            $merchantModule = "PR-PURv" . $redsyspur->version;

            $cart = Cart::getCartByOrderId($idOrder);
            $currency = new Currency($cart->id_currency);

            // ISO Moneda
            if (empty ($gateway['moneda']) ){
                $moneda = $currency->iso_code_num;
            }else{
                $moneda = $gateway['moneda'];
            }

            $request->setAmount( $amount );
            $request->setCurrency( $moneda );
            $request->setMerchant( $gateway['fuc'] );
            $request->setTerminal( $gateway['terminal'] );
            $request->setOrder( $orderDetails['redsys_order'] );
            $request->setTransactionType( $transactionType );
            $request->addParameter( "Ds_Merchant_Module", $merchantModule );

            $requestArray = array(
                'DS_MERCHANT_ORDER' => $orderDetails['redsys_order'],
                'DS_MERCHANT_MERCHANTCODE' => $gateway['fuc'],
                'DS_MERCHANT_TERMINAL' => $gateway['terminal'],
                'DS_MERCHANT_TRANSACTIONTYPE' => $transactionType,
                'DS_MERCHANT_CURRENCY' => $moneda,
                'DS_MERCHANT_AMOUNT' => $amount,
                'DS_MERCHANT_MODULE' => $merchantModule,
            );

            if(!is_null($rts) and $rts > 0){
                escribirLog("DEBUG", $idLog, "La operación se va a realizar usando el RTS " . $rts);
                $request->addParameter( "Ds_Merchant_Rts", $rts );
                $requestArray += [ 'DS_MERCHANT_RTS' => $rts ];
            }

            $requestXML = new SimpleXMLElement("<DS_MERCHANTPARAMETERS></DS_MERCHANTPARAMETERS>");
            array_to_xml($requestArray,$requestXML);            
            escribirLog("DEBUG", $idLog, str_replace( array("\r", "\n", "<?xml version=\"1.0\"?>"), '', $requestXML->asXML() ) );   

            $service = new RESTOperationService ( $gateway['clave'], $gateway['entorno'] );
            $result = $service->sendOperation ( $request, $idLog );
        }catch(Exception $e){
            return array(
                'result' => 0,
                'error' => $e->getMessage()
            );
        }

        if($result->getResult () == RESTConstants::$RESP_LITERAL_OK){
            escribirLog("DEBUG", $idLog, "La " . self::getTransactionTypeString($transactionType) . " se ha procesado correctamente, $shipmentRefund");

            if(!is_null($shipmentRefund))
                Db::getInstance(_PS_USE_SQL_SLAVE_)->execute("UPDATE `" . self::ORDER_TABLE_NAME . "` SET shipping_paid = " . pSQL($shipmentRefund) . " WHERE id_order = " . $idOrder . ";");

            $rts = null;
            if($transactionType == RESTConstants::$PARTIAL_CONFIRMATION)
                $rts = $result->getOperation()->getRts();
            else if ($transactionType == RESTConstants::$CONFIRMATION) 
                $rts = -1;
            

            self::updateOrderAmount($idOrder, $transactionType, $amount, $rts);
        }else{
            escribirLog("DEBUG", $idLog, "Ha habido un problema al procesar la " . self::getTransactionTypeString($transactionType) . ", contacte con su entidad o revise el Portal de Administracion del TPV Virtual");
        }

        $response = array(
            'result' => $result->getResult () == RESTConstants::$RESP_LITERAL_OK ? 1 : 0,
            'error' => '',
        );

        if(!$response['result']){
            /** Análisis de respuesta del SIS. */
            $respuesta = $result->getApiCode();

            $erroresSIS = array();
            $errorBackofficeSIS = "";

            include 'controllers/front/erroresSIS.php';

            if (array_key_exists($respuesta, $erroresSIS)) {
                
                $errorBackofficeSIS  = $respuesta;
                $errorBackofficeSIS .= ' - '.$erroresSIS[$respuesta] . '.';
            
            } else {

                $errorBackofficeSIS = "Código de respuesta " . $respuesta . " no registrado en el módulo. Consulte el Portal de Administración del TPV Virtual.";
            }
            $response['error'] = $errorBackofficeSIS;
        }

		return $response;
    }

    private static function getTransactionTypeString($transactionType){
        switch($transactionType){
            case RESTConstants::$CONFIRMATION:
                return "confirmación";
            case RESTConstants::$PARTIAL_CONFIRMATION:
                return "confirmación parcial";
            case RESTConstants::$REFUND:
                return "devolución";
            case RESTConstants::$PAYMENT_CANCELLATION:
            case RESTConstants::$CANCELLATION:
                return "anulación";
        }
        return "transacción desconocida";
    }

    private static function updateOrderAmount($idOrder, $transactionType, $amount, $rts = null){
		$orderDetails = self::getOrderDetails($idOrder);
            
        $data = array();
        switch($transactionType){
            case RESTConstants::$CONFIRMATION:
            case RESTConstants::$PARTIAL_CONFIRMATION:
                $confirmationAmount = $orderDetails['confirmation_amount'] + $amount;
                Db::getInstance(_PS_USE_SQL_SLAVE_)->execute("UPDATE `" . self::ORDER_TABLE_NAME . "` SET confirmation_amount = '" . $confirmationAmount . "' WHERE id_order = " . $idOrder . ";");
                break;
            case RESTConstants::$REFUND:
                $refundAmount = $orderDetails['refund_amount'] + $amount;
                Db::getInstance(_PS_USE_SQL_SLAVE_)->execute("UPDATE `" . self::ORDER_TABLE_NAME . "` SET refund_amount = '" . $refundAmount . "' WHERE id_order = " . $idOrder . ";");
                break;
            case RESTConstants::$PAYMENT_CANCELLATION:
            case RESTConstants::$CANCELLATION:
                $cancellationAmount = $orderDetails['cancellation_amount'] + $amount;
                Db::getInstance(_PS_USE_SQL_SLAVE_)->execute("UPDATE `" . self::ORDER_TABLE_NAME . "` SET cancellation_amount = '" . $cancellationAmount . "' WHERE id_order = " . $idOrder . ";");
                break;
        }

        if($rts != 0){
            Db::getInstance(_PS_USE_SQL_SLAVE_)->execute("INSERT INTO `" . self::ORDER_CONFIRMATION_TABLE_NAME . "` (id_order, rts, confirmation_amount, refund_amount) VALUES (" . $idOrder . ", '" . $rts . "', '" . $amount . "', 0);");
        }

//        self::updateOrderStatus($idOrder);
    }

    public static function setEstado($estado){
        self::$_estado = $estado;
    }

    private static function updateOrderStatus($idOrder){
        $orderDetails = self::getOrderDetails($idOrder);

        if($orderDetails['transaction_type'] == RESTConstants::$AUTHORIZATION){
            if($orderDetails['refund_amount'] == $orderDetails['grand_total']){
                $estado = "devuelta";
            }else if($orderDetails['refund_amount'] && $orderDetails['refund_amount'] < $orderDetails['grand_total']){
                $estado = "devuelta-parcial";
            }else{
                $estado = self::$_estado;
            }
        }else{
            if($orderDetails['refund_amount'] == $orderDetails['grand_total']){
                $estado = "devuelta";
            }else if($orderDetails['cancellation_amount'] == $orderDetails['grand_total']){
                $estado = "anulada";
            }else if($orderDetails['confirmation_amount'] + $orderDetails['cancellation_amount'] == $orderDetails['grand_total']){
                $estado = self::$_estado;
            }else if($orderDetails['cancellation_amount'] && $orderDetails['cancellation_amount'] < $orderDetails['grand_total']){
                if($orderDetails['confirmation_amount'] == 0){
                    $estado = "anulada-parcial";
                }else{
                    $estado = "conf-parcial";
                }
            }else if($orderDetails['confirmation_amount'] && $orderDetails['confirmation_amount'] < $orderDetails['grand_total']){
                $estado = "conf-parcial";
            }else{
                $estado = "preautorizada";
            }
        }
        
        if($estado != self::$_estado){
            $redsyspur = new Redsyspur();
            $estado = $redsyspur->getOrderState($estado);
            $estado = $estado->id;
        }
        $order = new Order($idOrder);
        $order->setCurrentState($estado);
    }

    private static function amountValidation($idOrder, $transactionType, $amount){
        $orderDetails = self::getOrderDetails($idOrder);

        switch($transactionType){
            case RESTConstants::$CONFIRMATION:
            case RESTConstants::$PARTIAL_CONFIRMATION:
            case RESTConstants::$PAYMENT_CANCELLATION:
            case RESTConstants::$CANCELLATION:
                $amountNotConfirmed = $orderDetails['grand_total'] - $orderDetails['confirmation_amount'] - $orderDetails['cancellation_amount'];
                if($amount > $amountNotConfirmed){
                    return false;
                }
                break;
            case RESTConstants::$REFUND:
                if($amount > $orderDetails['confirmation_amount'] - $orderDetails['refund_amount']){
                    return false;
                }
                break;
        }

        return true;
    }

    private static function refundAmountValidation($idOrder, $orderConfirmationDetails, $amount){
        $amountToRefund = 0;

        foreach($orderConfirmationDetails as $orderConfirmationDetail){
            $amountToRefund += $orderConfirmationDetail['confirmation_amount'] - $orderConfirmationDetail['refund_amount'];
        }

        return $amountToRefund >= $amount;
    }

    private static function removeEmptyFields($array){
        foreach ($array as $key => & $value) {
            if (is_array($value)) {
                $value = self::removeEmptyFields($value);
            }else{
                if ( $value == '') {
                    unset($array[$key]);
                }
            }
        }
        unset($value);
    
        return $array;
    }

    public static function saveOrderDetails($idOrder, $redsysOrder, $method, $transactionType, $amount, $shippingPaid = 0){
        if($idOrder!=null && self::checkOrderTable()){
            $oldRedsysOrder=self::getRedsysOrder($idOrder);

            $confirmationAmount = $transactionType == RESTConstants::$AUTHORIZATION ? $amount : 0;
            $query = null;
            if($oldRedsysOrder==null){
                $query = "INSERT INTO `" . self::ORDER_TABLE_NAME . "` (id_order, redsys_order, method, transaction_type, grand_total, confirmation_amount, shipping_paid) VALUES (" . pSQL($idOrder) . ", '" . pSQL(substr($redsysOrder, 0, 20)) . "', '" . pSQL(substr($method, 0, 20)) . "', '" .pSQL($transactionType) . "', '" . pSQL($amount) . "', '" . pSQL($confirmationAmount) . "', " . pSQL($shippingPaid) . ");";
            }else{
                $query = "UPDATE `" . self::ORDER_TABLE_NAME . "` SET redsys_order = '" . pSQL(substr($redsysOrder, 0, 20)) . "', method = '" . pSQL(substr($method, 0, 20)) . "', transaction_type = '" . pSQL($transactionType) . "', grand_total = '" . pSQL($amount) . "', confirmation_amount = '" . pSQL($confirmationAmount) . "', shipping_paid = " . pSQL($shippingPaid) . " WHERE id_order = " . $idOrder . ";";
            }

            if ($query!=null) {
                Db::getInstance(_PS_USE_SQL_SLAVE_)->execute($query);
            }
        }
    }

    public static function getOrderId($redsysOrder){
		if(self::checkOrderTable()){
			$orders=Db::getInstance(_PS_USE_SQL_SLAVE_)->executeS("SELECT * FROM ".self::ORDER_TABLE_NAME." WHERE redsys_order='".$redsysOrder."';");
			foreach($orders as $order)
				return $order["id_order"];
		}
		return null;
    }

    public static function getRedsysOrder($idOrder){
		if(self::checkOrderTable()){
			$orders=Db::getInstance(_PS_USE_SQL_SLAVE_)->executeS("SELECT * FROM ".self::ORDER_TABLE_NAME." WHERE id_order=".$idOrder.";");
			foreach($orders as $order)
				return $order["redsys_order"];
		}
		return null;
    }

    public static function getOrderDetails($idOrder){
		if(self::checkOrderTable()){
			$orders=Db::getInstance(_PS_USE_SQL_SLAVE_)->executeS("SELECT * FROM ".self::ORDER_TABLE_NAME." WHERE id_order=".$idOrder.";");
			foreach($orders as $order)
				return $order;
		}
		return null;
    }

    public static function getOrderConfirmationDetails($idOrder){
		if(self::checkOrderConfirmationTable()){
			$orders=Db::getInstance(_PS_USE_SQL_SLAVE_)->executeS("SELECT * FROM ".self::ORDER_CONFIRMATION_TABLE_NAME." WHERE id_order=".$idOrder.";");
			if(sizeof($orders)>0)
				return $orders;
		}
		return null;
    }

    public static function checkShipmentPaid($checkboxStatus, $shipmentOldStatus = false, $capture = false) {

        if($capture)
            if (!is_null($checkboxStatus) && floatval($checkboxStatus) > 0.00)
                return 1;
            else if ($shipmentOldStatus)
                return 1;
            else
                return 0;
                   
        if ($checkboxStatus)
            return 0;
        else if ($shipmentOldStatus)
            return 0;
        else
            return 1;
    }

	public static function checkOrderTable(){
        $tablas=Db::getInstance(_PS_USE_SQL_SLAVE_)->executeS("SELECT 1 FROM information_schema.columns WHERE table_name = '".self::ORDER_TABLE_NAME."' AND column_name = 'grand_total';");

        $exists = sizeof($tablas) > 0;
        if(!$exists){
            self::createOrderTable();
            $tablas=Db::getInstance(_PS_USE_SQL_SLAVE_)->executeS("SELECT 1 FROM information_schema.columns WHERE table_name = '".self::ORDER_TABLE_NAME."' AND column_name = 'grand_total';");
            $exists = sizeof($tablas) > 0;
        }

        return $exists && self::checkOrderConfirmationTable();
	}

	public static function checkOrderConfirmationTable(){
        $tablas=Db::getInstance(_PS_USE_SQL_SLAVE_)->executeS("SELECT 1 FROM information_schema.columns WHERE table_name = '".self::ORDER_CONFIRMATION_TABLE_NAME."' AND column_name = 'confirmation_amount';");

        $exists = sizeof($tablas) > 0;
        if(!$exists){
            self::createOrderConfirmationTable();
            $tablas=Db::getInstance(_PS_USE_SQL_SLAVE_)->executeS("SELECT 1 FROM information_schema.columns WHERE table_name = '".self::ORDER_CONFIRMATION_TABLE_NAME."' AND column_name = 'confirmation_amount';");
            $exists = sizeof($tablas) > 0;
        }

        return $exists;
	}

	public static function createOrderTable(){

        $query ='CREATE TABLE IF NOT EXISTS `'.self::ORDER_TABLE_NAME.'` (
                    `id_order` INT NOT NULL PRIMARY KEY, 
                    `redsys_order` VARCHAR(20) NOT NULL,
                    `method` VARCHAR(20) NOT NULL,
                    `transaction_type` INT NOT NULL,
                    `grand_total` float NOT NULL DEFAULT 0,
                    `confirmation_amount` float NOT NULL DEFAULT 0,
                    `refund_amount` float NOT NULL DEFAULT 0,
                    `cancellation_amount` float NOT NULL DEFAULT 0,
                    `shipping_paid` bit NOT NULL DEFAULT 0,
                    INDEX (`id_order`) 
                ) ENGINE = '._MYSQL_ENGINE_.' CHARACTER SET utf8 COLLATE utf8_general_ci';

        if( !(Db::getInstance(_PS_USE_SQL_SLAVE_)->execute($query)) ) {
            Db::getInstance(_PS_USE_SQL_SLAVE_)->execute('ALTER TABLE `'.self::ORDER_TABLE_NAME.'`
                ADD COLUMN `transaction_type` INT NOT NULL,
                ADD COLUMN `grand_total` float NOT NULL DEFAULT 0,
                ADD COLUMN `confirmation_amount` float NOT NULL DEFAULT 0,
                ADD COLUMN `refund_amount` float NOT NULL DEFAULT 0,
                ADD COLUMN `cancellation_amount` float NOT NULL DEFAULT 0,
                ADD COLUMN `shipping_paid` bit NOT NULL DEFAULT 0'
            );
        }
    }

	public static function createOrderConfirmationTable(){
        Db::getInstance(_PS_USE_SQL_SLAVE_)->execute('CREATE TABLE IF NOT EXISTS `'.self::ORDER_CONFIRMATION_TABLE_NAME.'` (
                `id_order` INT NOT NULL,
                `rts` VARCHAR(40) NOT NULL,
                `confirmation_amount` float NOT NULL DEFAULT 0,
                `refund_amount` float NOT NULL DEFAULT 0,
                PRIMARY KEY (`id_order`, `rts`),
                INDEX (`id_order`, `rts`)
            ) ENGINE = '._MYSQL_ENGINE_.' CHARACTER SET utf8 COLLATE utf8_general_ci'
        );
    }

	public static function dropOrderTable(){
        Db::getInstance(_PS_USE_SQL_SLAVE_)->execute('DROP TABLE `'.self::ORDER_TABLE_NAME.'`');
	}

	public static function dropOrderConfirmationTable(){
        Db::getInstance(_PS_USE_SQL_SLAVE_)->execute('DROP TABLE `'.self::ORDER_CONFIRMATION_TABLE_NAME.'`');
	}
}