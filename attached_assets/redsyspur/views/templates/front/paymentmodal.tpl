<link rel="stylesheet" type="text/css"
	href="{$this_path|escape:'htmlall'}/views/templates/front/css/estilos.css" />
<script src="{$url_modal}"></script>

<script>
    if (typeof OPC !== typeof undefined) {
        prestashop.on('opc-payment-getPaymentList-complete', () => initRedsysModal());
    } else if (typeof AppOPC !== typeof undefined) {
        $(document).on('opc-load-payment:completed', () => initRedsysModal());
    }

    window.addEventListener('load', function() {
        initRedsysModal();
    });

    function initRedsysModal(){
        $('form[action=tarjetaModal]').off('submit').on('submit', function(e){
            var requestParams = {
                FormData: {
                    Ds_SignatureVersion: '{$Ds_SignatureVersion}',
                    Ds_MerchantParameters: '{$Ds_MerchantParameters}',
                    Ds_Signature: '{$Ds_Signature}'
                },
                ReturnFunction: 'getPaymentResponse',
                Environment : '{$environment_modal}'
            };
            initPayment(requestParams);

            $('div.kill_box > img').on('click', function(){
                window.location.href = '{$url_ko}'.replaceAll("&amp;", "&");
            });

            return false;
        });

        window.addEventListener('message', function(event) {
            parsePaymentResponse(event);
        });
    }

    function getPaymentResponse(response){
        window.location.href = response.ReturnURL;
    }
</script>