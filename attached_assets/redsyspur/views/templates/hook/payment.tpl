{*
* NOTA SOBRE LA LICENCIA DE USO DEL SOFTWARE
* 
* El uso de este software est� sujeto a las Condiciones de uso de software que
* se incluyen en el paquete en el documento "Aviso Legal.pdf". Tambi�n puede
* obtener una copia en la siguiente url:
* http://www.redsys.es/wps/portal/redsys/publica/areadeserviciosweb/descargaDeDocumentacionYEjecutables
* 
* Redsys es titular de todos los derechos de propiedad intelectual e industrial
* del software.
* 
* Quedan expresamente prohibidas la reproducci�n, la distribuci�n y la
* comunicaci�n p�blica, incluida su modalidad de puesta a disposici�n con fines
* distintos a los descritos en las Condiciones de uso.
* 
* Redsys se reserva la posibilidad de ejercer las acciones legales que le
* correspondan para hacer valer sus derechos frente a cualquier infracci�n de
* los derechos de propiedad intelectual y/o industrial.
* 
* Redsys Servicios de Procesamiento, S.L., CIF B85955367
*}

{foreach $payment_options as $idForm => $paymentOption}
	{if ($paymentOption['button_href'])}
		{$button_href = $paymentOption['button_href']}
	{else}
		{$button_href = "javascript:$('#{$idForm}').submit();"}
	{/if}
	{if $smarty.const._PS_VERSION_ >= 1.6}
	<div class="row">
		<div class="col-xs-12">
			<p class="payment_module">
				<a class="bankwire" href="{$button_href}">
					<img src="{$paymentOption['logo']}" height="48" />
					{$paymentOption['cta_text']}
				</a>
			</p>
		</div>
	</div>
	{else}
	<p class="payment_module">
		<a class="bankwire" href="{$button_href}">
			<img src="{$paymentOption['logo']}" height="48" />
			{$paymentOption['cta_text']}
		</a>
	</p>
	{/if}

	{if $paymentOption['additionalInformation']}
		{$paymentOption['additionalInformation']}
  	{/if}

    <div class="payment_option_form">
        {if $paymentOption['form']}
            {$paymentOption['form']}
        {else}
            <form id="{$idForm}" method="{if $paymentOption['method']}{$paymentOption['method']}{else}POST{/if}" action="{$paymentOption['action']}">
                {if $paymentOption['inputs']}
                    {foreach $paymentOption['inputs'] as $input}
                        <input type="hidden" name="{$input['name']}" value="{$input['value']}">
                    {/foreach}
                {/if}
            </form>
        {/if}
    </div>
{/foreach}
