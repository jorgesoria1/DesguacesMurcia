<link rel="stylesheet" type="text/css"
	href="{$this_path|escape:'htmlall'}/views/templates/front/css/estilos.css" />
<script src="{$redsys_domain}"></script>
<script>
	window.addEventListener('load', function() {
        $('form[action=tarjetaInsiteReference]').off('submit').on('submit', function(e){
			redsysPayRef();
			return false;
		});
    });

	function redsysPayRef(){
	    $.ajax({
	        url: "{$ref_url}".replaceAll("&amp;", "&"),
	        type: "POST",
	        data: {
		    	"idCart":"{$idCart}",
				"merchant_order":"{$merchant_order}",
				"valores3DS":cargaValoresBrowser3DS()
	    	},
	        dataType: 'json',
	        success: function (data) {
	            if(data.redir==true)
	            	window.location.href=data.url;
	            else{
	            	$('<iframe id="redsysModalDialog" src="'+data.url+'" frameborder="no" />').dialog({
            		   title: "{l s='Autenticación de titular' mod='redsys'}",
            		   autoOpen: true,
            		   minWidth: 900,
            		   minHeight: 600,
            		   modal: true,
            		   draggable: false,
            		   resizable: false,
            		   close: function(event, ui) { $(this).remove();},
            		   overlay: {
            		       opacity: 0.6,
            		       background: "black"}
            		}).width(860).height(580);

		            $('#redsysModalDialog').siblings('div.ui-dialog-titlebar').css("text-align","center");
		            $('#redsysModalDialog').siblings('div.ui-dialog-titlebar').css("background-image","none");
		            $('#redsysModalDialog').siblings('div.ui-dialog-titlebar').css("background","none");
		            $('#redsysModalDialog').siblings('div.ui-dialog-titlebar').css("border","none");
		            $('#redsysModalDialog').siblings('div.ui-dialog-titlebar').children("button").remove();
	            }
	        },
	        error: function (request, status, error){
	        	window.location.href="{$url_ko}".replaceAll("&amp;", "&");
	        }
	    });
    }

	function cargaValoresBrowser3DS() {

		var valores3DS = new Object();

		//browserJavaEnabled
		valores3DS.browserJavaEnabled = navigator.javaEnabled();
		
		//browserJavascriptEnabled
		valores3DS.browserJavascriptEnabled = true;

		//browserLanguage
		var userLang = navigator.language || navigator.userLanguage;
		valores3DS.browserLanguage = userLang;

		//browserColorDepth
		valores3DS.browserColorDepth = screen.colorDepth;

		//browserScreenHeight
		//browserScreenWidth
		var myWidth = 0,
			myHeight = 0;
		if (typeof window.innerWidth == "number") {
			//Non-IE
			myWidth = window.innerWidth;
			myHeight = window.innerHeight;
		} else if (
			document.documentElement &&
			(document.documentElement.clientWidth ||
			document.documentElement.clientHeight)
		) {
			//IE 6+ in 'standards compliant mode'
			myWidth = document.documentElement.clientWidth;
			myHeight = document.documentElement.clientHeight;
		} else if (
			document.body &&
			(document.body.clientWidth || document.body.clientHeight)
		) {
			//IE 4 compatible
			myWidth = document.body.clientWidth;
			myHeight = document.body.clientHeight;
		}
		valores3DS.browserScreenHeight = myHeight;
		valores3DS.browserScreenWidth = myWidth;

		//browserTZ
		var d = new Date();
		valores3DS.browserTZ = d.getTimezoneOffset();

		//browserUserAgent
		valores3DS.browserUserAgent = navigator.userAgent;

		var valores3DSstring = JSON.stringify(valores3DS);

		return valores3DSstring;
	}
</script>