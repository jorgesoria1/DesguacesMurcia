<?php

require_once dirname ( __FILE__ ) . '/../../redsyspur.php';



class RedsysDiagnosticoController extends AdminController {

    public function __construct()
    {
        $this->bootstrap = true;
        parent::__construct();
        $this->errors = [];
    }

	public function initContent()
	{
        parent::initContent();
        $redsyspur = new Redsyspur();

        $ch = curl_init("https://sis-t.redsys.es:25443/sis/rest/status/check");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        $result = curl_exec($ch);
        $httpStatusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        $connectionRedsys = $httpStatusCode == 200 ? "OK" : "KO";
        $connectionRedsysMark = $httpStatusCode == 200 ? "done" : "close";
        $connectionRedsysColor = $httpStatusCode == 200 ? "green" : "red";

        $smartyVars = array();
		$smartyVars['connectionRedsys'] = $connectionRedsys;
        $smartyVars['connectionRedsysMark'] = $connectionRedsysMark;
        $smartyVars['connectionRedsysColor'] = $connectionRedsysColor;
        $smartyVars['phpVersion'] = phpversion();
        $smartyVars['serverVersion'] = $_SERVER["SERVER_SOFTWARE"];
        $smartyVars['redsysVersion'] = $redsyspur->version;
        $smartyVars['prestashopVersion'] = _PS_VERSION_;

		$this->context->smarty->assign($smartyVars);
		$content = $this->context->smarty->fetch(_PS_MODULE_DIR_ . $redsyspur->name . '/views/templates/admin/diagnostico.tpl');
 
        $this->context->smarty->assign(
            array(
                'content' => $content,
            )
        );
	}

    public function viewAccess($disable = false)
	{
		return true;
	}
}