{include file='header' pageTitle='wcf.acp.dataImport'}

<script data-relocate="true">
	//<![CDATA[
	$(function() {
		{if $queue|isset}
			WCF.Language.addObject({
				'wcf.acp.dataImport': '{lang}wcf.acp.dataImport{/lang}',
				'wcf.acp.dataImport.completed': '{lang}wcf.acp.dataImport.completed{/lang}',
				{implode from=$importers item=importer}'wcf.acp.dataImport.data.{@$importer}': '{lang}wcf.acp.dataImport.data.{@$importer}{/lang}'{/implode}
			});
			
			var $queues = [ {implode from=$queue item=item}'{@$item}'{/implode} ];
			new WCF.ACP.Import.Manager($queues, '{link controller='RebuildData'}{/link}');
		{/if}
		
		$('.jsImportSection').change(function(event) {
			var $section = $(event.currentTarget);
			
			if ($section.is(':checked')) {
				$section.parent().next().find('input[type=checkbox]').prop('checked', 'checked');
			}
			else {
				$section.parent().next().find('input[type=checkbox]').prop('checked', false);
			}
		});
		
		$('.jsImportItem').change(function(event) {
			var $item = $(event.currentTarget);
			if ($item.is(':checked')) {
				$item.parents('.jsImportCollection').find('.jsImportSection').prop('checked', 'checked');
			}
		});
	});
	//]]>
</script>

<header class="boxHeadline">
	<h1>{lang}wcf.acp.dataImport{/lang}</h1>
	{if $exporterName}
		<p>{lang}wcf.acp.dataImport.exporter.{@$exporterName}{/lang}</p>
	{/if}
</header>

{include file='formError'}

{if $showInnoDBWarning}
	<p class="warning">{lang}wcf.acp.index.innoDBWarning{/lang}</p>
{/if}

<div class="contentNavigation">
	{hascontent}
		<nav>
			<ul>
				{content}
					{event name='contentNavigationButtons'}
				{/content}
			</ul>
		</nav>
	{/hascontent}
</div>

{if !$exporterName}
	{if !$availableExporters|count}
		<p class="info">{lang}wcf.acp.dataImport.selectExporter.noExporters{/lang}</p>
	{else}
		{if $showMappingNotice}
			<p class="warning">{lang}wcf.acp.dataImport.existingMapping.notice{/lang}</p>
			<script data-relocate="true">
				//<![CDATA[
				$(function() {
					$('#deleteMapping').click(function() {
						WCF.System.Confirmation.show('{lang}wcf.acp.dataImport.existingMapping.confirmMessage{/lang}', function(action) {
							if (action === 'confirm') {
								new WCF.Action.Proxy({
									autoSend: true,
									data: {
										actionName: 'resetMapping',
										className: 'wcf\\system\\importer\\ImportHandler'
									},
									success: function() { window.location.reload(); },
									url: 'index.php/AJAXInvoke/?t=' + SECURITY_TOKEN + SID_ARG_2ND
								});
							}
						});
						
						return false;
					});
				});
				//]]>
			</script>
		{/if}
		
		<form method="get" action="{link controller='DataImport'}{/link}">
			<div class="container containerPadding marginTop">
				<fieldset>
					<legend>{lang}wcf.acp.dataImport.selectExporter{/lang}</legend>
					
					<dl{if $errorField == 'exporterName'} class="formError"{/if}>
						<dt><label for="exporterName">{lang}wcf.acp.dataImport.exporter{/lang}</label></dt>
						<dd>
							<select name="exporterName" id="exporterName">
								{foreach from=$availableExporters key=availableExporterName item=availableExporter}
									<option value="{@$availableExporterName}">{lang}wcf.acp.dataImport.exporter.{@$availableExporterName}{/lang}</option>
								{/foreach}
							</select>
							{if $errorField == 'exporterName'}
								<small class="innerError">
									{if $errorType == 'empty'}
										{lang}wcf.global.form.error.empty{/lang}
									{else}
										{lang}wcf.acp.dataImport.exporterName.error.{@$errorType}{/lang}
									{/if}
								</small>
							{/if}
						</dd>
					</dl>
					
					{event name='selectExporterFields'}
				</fieldset>
			</div>
			
			<div class="formSubmit">
				<input type="submit" value="{lang}wcf.global.button.submit{/lang}" accesskey="s" />
				{@SID_INPUT_TAG}
			</div>
		</form>
	{/if}
{else}
	<form method="post" action="{link controller='DataImport'}{/link}">
		<div class="container containerPadding marginTop">
			<fieldset>
				<legend>{lang}wcf.acp.dataImport.configure.data{/lang}</legend>
				
				<small>{lang}wcf.acp.dataImport.configure.data.description{/lang}</small>
				
				{foreach from=$supportedData key=objectTypeName item=objectTypes}
					<dl class="wide">
						<dd class="jsImportCollection">
							<label><input type="checkbox" name="selectedData[]" value="{@$objectTypeName}" class="jsImportSection"{if $objectTypeName|in_array:$selectedData}checked="checked" {/if}/> {lang}wcf.acp.dataImport.data.{@$objectTypeName}{/lang}</label>
							<p>
								{foreach from=$objectTypes item=objectTypeName}
									<label><input type="checkbox" name="selectedData[]" value="{@$objectTypeName}" class="jsImportItem"{if $objectTypeName|in_array:$selectedData}checked="checked" {/if}/> {lang}wcf.acp.dataImport.data.{@$objectTypeName}{/lang}</label>
								{/foreach}
							</p>
						</dd>
					</dl>
				{/foreach}
				
				{event name='dataFields'}
			</fieldset>
			
			<fieldset>
				<legend>{lang}wcf.acp.dataImport.configure.settings{/lang}</legend>
				
				<dl>
					<dt><label for="userMergeMode">{lang}wcf.acp.dataImport.configure.settings.userMergeMode{/lang}</label></dt>
					<dd>
						<label><input type="radio" id="userMergeMode" name="userMergeMode" value="1" {if $userMergeMode == 1}checked="checked" {/if}/> {lang}wcf.acp.dataImport.configure.settings.userMergeMode.1{/lang}</label>
						<label><input type="radio" name="userMergeMode" value="2" {if $userMergeMode == 2}checked="checked" {/if}/> {lang}wcf.acp.dataImport.configure.settings.userMergeMode.2{/lang}</label>
						<label><input type="radio" name="userMergeMode" value="3" {if $userMergeMode == 3}checked="checked" {/if}/> {lang}wcf.acp.dataImport.configure.settings.userMergeMode.3{/lang}</label>
						<label><input type="radio" name="userMergeMode" value="4" {if $userMergeMode == 4}checked="checked" {/if}/> {lang}wcf.acp.dataImport.configure.settings.userMergeMode.4{/lang}</label>
					</dd>
				</dl>
				
				{event name='settingFields'}
			</fieldset>
			
			<fieldset{if $errorField == 'database'} class="formError"{/if}>
				<legend>{lang}wcf.acp.dataImport.configure.database{/lang}</legend>
				
				<dl>
					<dt><label for="dbHost">{lang}wcf.acp.dataImport.configure.database.host{/lang}</label></dt>
					<dd>
						<input type="text" id="dbHost" name="dbHost" value="{$dbHost}" class="long" />
					</dd>
				</dl>
				
				<dl>
					<dt><label for="dbUser">{lang}wcf.acp.dataImport.configure.database.user{/lang}</label></dt>
					<dd>
						<input type="text" id="dbUser" name="dbUser" value="{$dbUser}" class="medium" />
					</dd>
				</dl>
				
				<dl>
					<dt><label for="dbPassword">{lang}wcf.acp.dataImport.configure.database.password{/lang}</label></dt>
					<dd>
						<input type="password" id="dbPassword" name="dbPassword" value="{$dbPassword}" class="medium" />
					</dd>
				</dl>
				
				<dl>
					<dt><label for="dbName">{lang}wcf.acp.dataImport.configure.database.name{/lang}</label></dt>
					<dd>
						<input type="text" id="dbName" name="dbName" value="{$dbName}" class="medium" />
					</dd>
				</dl>
				
				<dl>
					<dt><label for="dbPrefix">{lang}wcf.acp.dataImport.configure.database.prefix{/lang}</label></dt>
					<dd>
						<input type="text" id="dbPrefix" name="dbPrefix" value="{$dbPrefix}" class="short" />
						{if $errorField == 'database'}
							<small class="innerError">{lang}wcf.acp.dataImport.configure.database.error{/lang}</small>
						{/if}
					</dd>
				</dl>
				
				{event name='databaseFields'}
			</fieldset>
			
			<fieldset>
				<legend>{lang}wcf.acp.dataImport.configure.fileSystem{/lang}</legend>
				
				<dl{if $errorField == 'fileSystemPath'} class="formError"{/if}>
					<dt><label for="fileSystemPath">{lang}wcf.acp.dataImport.configure.fileSystem.path{/lang}</label></dt>
					<dd>
						<input type="text" id="fileSystemPath" name="fileSystemPath" value="{$fileSystemPath}" class="long" />
						{if $errorField == 'fileSystemPath'}
							<small class="innerError">{lang}wcf.acp.dataImport.configure.fileSystem.path.error{/lang}</small>
						{/if}
						<small>{lang}wcf.acp.dataImport.configure.fileSystem.path.description{/lang}</small>
					</dd>
				</dl>
				
				{event name='fileSystemFields'}
			</fieldset>
			
			{event name='fieldsets'}
		</div>
		
		<div class="formSubmit">
			<input type="hidden" name="exporterName" value="{$exporterName}" />
			<input type="submit" value="{lang}wcf.global.button.submit{/lang}" accesskey="s" />
			{@SECURITY_TOKEN_INPUT_TAG}
		</div>
	</form>
{/if}

{include file='footer'}
