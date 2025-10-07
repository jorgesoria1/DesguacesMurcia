<?php

require_once dirname ( __FILE__ ) . '/ApiRedsysREST/initRedsysApi.php';

class Redsys_Refund {

    const REFUND_TABLE = _DB_PREFIX_."redsys_order";

	public static function refund($gateway_params, $orderId, $amount, $reason = '', $idLog = null, $merchantModule = "PR-PUR"){
        
        if (!Configuration::get('REDSYS_ACTIVAR_DEVOLUCIONES')) {
            
            escribirLog("INFO ", $idLog, "Devoluciones online desactivadas. Se va a realizar una DEVOLUCIÓN OFFLINE para el pedido " . $orderId);
            return 1;
        }
        
        $request = new RestOperationMessage();

        $request->setAmount( $amount );
        $request->setCurrency( $gateway_params['moneda'] );
        $request->setMerchant( $gateway_params['fuc'] );
        $request->setTerminal( $gateway_params['terminal'] );
        $request->setOrder( $orderId );
        $request->setTransactionType( RESTConstants::$REFUND );
        $request->addParameter( "DS_MERCHANT_PRODUCTDESCRIPTION", $reason );
        $request->addParameter( "DS_MERCHANT_MODULE", $merchantModule);

        escribirLog("INFO ", $idLog, "Se va a realizar una DEVOLUCION para el pedido " . $orderId);
        escribirLog("DEBUG", $idLog, "Total: " . $amount);
        escribirLog("DEBUG", $idLog, "Moneda: " . $gateway_params['moneda']);
        escribirLog("DEBUG", $idLog, "Comercio: " . $gateway_params['fuc']);
        escribirLog("DEBUG", $idLog, "Terminal: " . $gateway_params['terminal']);

        $service = new RESTOperationService ( $gateway_params['clave'], $gateway_params['entorno'] );
        $result = $service->sendOperation ( $request, $idLog );

        if($result->getResult () == RESTConstants::$RESP_LITERAL_OK){
            escribirLog("INFO ", $idLog, "La devolucion se ha procesado correctamente");
        }else{
            escribirLog("ERROR", $idLog, "Ha habido un problema al procesar la devolucion, contacte con su entidad o revise el Portal de Administracion del TPV Virtual");
        }

        return $result->getResult () == RESTConstants::$RESP_LITERAL_OK;
    }

	public static function cancellation($gateway_params, $orderId, $amount, $isAuthorization, $idLog = null, $merchantModule = "PR-PUR"){

        if (!Configuration::get('REDSYS_ACTIVAR_ANULACIONES'))
            return 0;

        $request = new RestOperationMessage();

        $transactionType = $isAuthorization ? RESTConstants::$PAYMENT_CANCELLATION : RESTConstants::$CANCELLATION;

        $request->setAmount( $amount );
        $request->setCurrency( $gateway_params['moneda'] );
        $request->setMerchant( $gateway_params['fuc'] );
        $request->setTerminal( $gateway_params['terminal'] );
        $request->setOrder( $orderId );
        $request->setTransactionType( $transactionType );
        $request->addParameter( "DS_MERCHANT_MODULE", $merchantModule);

        escribirLog("INFO ", $idLog, "Se va a realizar una ANULACION para el pedido " . $orderId);
        escribirLog("DEBUG", $idLog, "Total: " . $amount);
        escribirLog("DEBUG", $idLog, "Moneda: " . $gateway_params['moneda']);
        escribirLog("DEBUG", $idLog, "Comercio: " . $gateway_params['fuc']);
        escribirLog("DEBUG", $idLog, "Terminal: " . $gateway_params['terminal']);
        escribirLog("DEBUG", $idLog, "TransactionType: " . $transactionType);

        $service = new RESTOperationService ( $gateway_params['clave'], $gateway_params['entorno'] );
        $result = $service->sendOperation ( $request, $idLog );

        if($result->getResult () == RESTConstants::$RESP_LITERAL_OK)
            escribirLog("INFO ", $idLog, "La anulacion se ha procesado correctamente");
        else
            escribirLog("ERROR", $idLog, "Ha habido un problema al procesar la anulacion, contacte con su entidad o revise el Portal de Administracion del TPV Virtual");

        return $result->getResult () == RESTConstants::$RESP_LITERAL_OK;
    }

    public static function saveOrderId($idOrder, $redsysOrder, $method){
        if($idOrder!=null && Redsys_Refund::checkOrderTable()){
            $oldRedsysOrder=Redsys_Refund::getOrderId($idOrder);
            
            if($oldRedsysOrder==null){
                Db::getInstance(_PS_USE_SQL_SLAVE_)->execute("INSERT INTO ".self::REFUND_TABLE." VALUES(".$idOrder.", '".substr($redsysOrder, 0, 20)."', '".substr($method, 0, 20)."')");
            }else{
                Db::getInstance(_PS_USE_SQL_SLAVE_)->execute("UPDATE ".self::REFUND_TABLE." SET redsys_order='".substr($redsysOrder, 0, 20)."', method='".substr($method, 0, 20)."' where id_order=".$idOrder);
            }
        }
    }

    public static function getOrderId($idOrder){
		if(Redsys_Refund::checkOrderTable()){
			$orders=Db::getInstance(_PS_USE_SQL_SLAVE_)->executeS("SELECT * FROM ".self::REFUND_TABLE." WHERE id_order=".$idOrder.";");
			foreach($orders as $order)
				return $order;
		}
		return null;
    }

	public static function checkOrderTable(){
        $tablas=Db::getInstance(_PS_USE_SQL_SLAVE_)->executeS("SHOW TABLES LIKE '".self::REFUND_TABLE."'");
        if(sizeof($tablas)<=0)
            Redsys_Refund::createOrderTable();

        $tablas=Db::getInstance(_PS_USE_SQL_SLAVE_)->executeS("SHOW TABLES LIKE '".self::REFUND_TABLE."'");
        return sizeof($tablas)>0;
	}

	public static function createOrderTable(){
        Db::getInstance(_PS_USE_SQL_SLAVE_)->execute('CREATE TABLE IF NOT EXISTS `'.self::REFUND_TABLE.'` (
                `id_order` INT NOT NULL PRIMARY KEY, 
				`redsys_order` VARCHAR(20) NOT NULL,
                `method` VARCHAR(20) NOT NULL,
                INDEX (`id_order`) 
            ) ENGINE = '._MYSQL_ENGINE_.' CHARACTER SET utf8 COLLATE utf8_general_ci'
        );
    }

	public static function dropOrderTable(){
        Db::getInstance(_PS_USE_SQL_SLAVE_)->execute('DROP TABLE `'.self::REFUND_TABLE.'`');
	}
}