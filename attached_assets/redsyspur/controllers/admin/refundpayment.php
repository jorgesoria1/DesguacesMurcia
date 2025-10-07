<?php

require_once dirname ( __FILE__ ) . '/../../redsyspur.php';



class RefundPaymentController extends AdminController {

	public function initContent()
	{   
        $order = new Order($_POST['orderId']);

        $shipmentRefund = filter_var($_POST['shipmentRefund'], FILTER_VALIDATE_BOOLEAN);
        $shippingRefunded = filter_var($_POST['shippingPaid'], FILTER_VALIDATE_BOOLEAN);

        $orderDetails = Redsys_Order::getOrderDetails($_POST['orderId']);
        $redsyspur = new Redsyspur();
        $gatewayParameters = $redsyspur->getGatewayParameters($orderDetails['method']);
        $amount = floatval($_POST['amount']);

        if ($shipmentRefund)
            $amount += floatval($_POST['shippingAmount']);

        $shipmentPaid = Redsys_Order::checkShipmentPaid($shipmentRefund, $shippingRefunded);

        $response = Redsys_Order::refund($gatewayParameters, $_POST['orderId'], $amount, null, $shipmentPaid);

        die(json_encode($response));
	}

    public function viewAccess($disable = false)
	{
		return true;
	}
}