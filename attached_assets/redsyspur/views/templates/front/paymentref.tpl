<input name="checkbox_save_ref" type="checkbox" onchange="onChangeSaveRef()"> Guardar tarjeta para futuras compras en esta tienda

<script type="text/javascript">
    const Ds_MerchantParameters_New = "{$Ds_MerchantParameters_New}";
    const Ds_Signature_New = "{$Ds_Signature_New}";
    const Ds_MerchantParameters_SaveRef = "{$Ds_MerchantParameters_SaveRef}";
    const Ds_Signature_SaveRef = "{$Ds_Signature_SaveRef}";
    var saveRef = false;

    window.document.onload = function(){ 
        onChangeParameters();
    }

    function onChangeSaveRef(){
        saveRef = $("input[type=checkbox][name=checkbox_save_ref]").is(":checked");
        onChangeParameters();
    }
    
    function onChangeParameters(){
        if(saveRef){
            $("input[type=hidden][name=PayNew]").closest("form").find("input[type=hidden][name=Ds_MerchantParameters]").val(Ds_MerchantParameters_SaveRef);
            $("input[type=hidden][name=PayNew]").closest("form").find("input[type=hidden][name=Ds_Signature]").val(Ds_Signature_SaveRef);
        }
        else
        {
            $("input[type=hidden][name=PayNew]").closest("form").find("input[type=hidden][name=Ds_MerchantParameters]").val(Ds_MerchantParameters_New);
            $("input[type=hidden][name=PayNew]").closest("form").find("input[type=hidden][name=Ds_Signature]").val(Ds_Signature_New);
        }
    }
</script>