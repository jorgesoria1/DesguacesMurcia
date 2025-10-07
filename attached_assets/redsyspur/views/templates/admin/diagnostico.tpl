<div class="card">
	<div class="card-body">
		Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
		<br>
		<table class="table" cellspacing="0">
			<thead>
				<tr>
					<th colspan="2"></th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>Conexión Redsys:</td>
					<td style="color: {$connectionRedsysColor};">
						<i style="font-size: 14px" class="material-icons mi-{$connectionRedsysMark}">{$connectionRedsysMark}</i>  {$connectionRedsys}
					</td>
				</tr>
				<tr>
					<td>Version PHP:</td>
					<td>{$phpVersion}</td>
				</tr>
				<tr>
					<td>Version del servidor:</td>
					<td>{$serverVersion}</td>
				</tr>
				<tr>
					<td>Version del modulo Redsys:</td>
					<td>{$redsysVersion}</td>
				</tr>
				<tr>
					<td>Version Prestashop:</td>
					<td>{$prestashopVersion}</td>
				</tr>
			</tbody>
		</table>
	</div>
</div>