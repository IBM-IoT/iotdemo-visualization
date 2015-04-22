	
var GraphApp = GraphApp || {};

GraphApp.DBQuery = ( function( $ ) {

	var defaultUsername = "";
	var defaultPassword = "";
	
	var runQueryFunc = null;
	
	function getHost() {
		return GraphApp.HostMgr.GetHostURL( GraphApp.HostMgr.GetHost( $( "#dbQueryHost" ).attr( "data-hid" ) ) );
	}
	
	function getUsername() {
		var value = $.jStorage.get("username", defaultUsername);
		return value;
	}
	
	function getPassword() {
		var value = $.jStorage.get("password", defaultPassword);
		return value;
	}
	
	
	function Init()
	{
		// configuration page
//		d.on( "pagecreate" , "#configurationPage" , configurationPageCreate );
//		$( "#saveConfigurationButton" ).click( saveConfiguration );
		
		$( "#dbQueryHost" ).on( "click" , SelectHostClick );
		$( "#dbQueryContinue" ).on( "click" , ContinueClick );
		$( "#dbQueryTabs" ).on( "tabsbeforeactivate" , OnTabChange );
		$( "#dbQueryShowForm" ).on( "click" , ShowForm );
		
		$( "#dbQueryRunSQL" ).on( "click" , runSqlQuery );
		$( "#dbQueryRunMongo" ).on( "click" , runMongoQuery );
	}
	
	function Reset()
	{
		$( "#dbQueryContinue" ).hide();
		$( "#dbQueryError" ).hide();
		$( "#dbQueryShowForm" ).hide();
		$( "#dbQueryTabs" ).show();
		$( "#dbQueryResult" ).hide();
	}
	
	function HideForm()
	{
		if( $( "#dbQueryShowForm" ).css( "display" ) != "none" ) return;
		
		$( "#dbQueryTabs" ).slideUp( 500 );
		$( "#dbQueryShowForm" ).show();
	}
	
	function ShowForm()
	{
		if( $( "#dbQueryShowForm" ).css( "display" ) == "none" ) return;
		
		$( "#dbQueryTabs" ).slideDown( 500 );
		$( "#dbQueryShowForm" ).hide();
	}
	
	function ShowContinueButton( hasCursor )
	{
		$( "#dbQueryContinue" ).removeClass( "ui-icon-carat-r ui-icon-refresh" );
		
		if( hasCursor )
		{
			$( "#dbQueryContinue" ).text( "Next Batch" );
			$( "#dbQueryContinue" ).addClass( "ui-icon-carat-r" );
		}
		else
		{
			$( "#dbQueryContinue" ).text( "Run Again" );
			$( "#dbQueryContinue" ).addClass( "ui-icon-refresh" );
		}
		
		$( "#dbQueryContinue" ).show();
	}
	
	function saveConfiguration()
	{
		$.jStorage.set("host", $('#hostText').val());
		$.jStorage.set("username", $('#usernameText').val());
		$.jStorage.set("password", $('#passwordText').val());
	}
	
	function runSqlQuery()
	{
		runQueryFunc = runSqlQuery;
		
		if( $( "#dbQueryHost" ).attr( "data-hid" ) === undefined )
		{
			GraphApp.Main.DisplaySlidingError( "#dbQueryError" , "Please select a host." );
			return;
		}
		
		var query = $('#sqlQueryText').val();
		var batchSize = $('#sqlBatchSizeText').val();
		var cursorId = $('#sqlCursorIdText').val();
		SQLQuery( query , batchSize , cursorId , processQueryResult , genericError );
		// SELECT r.tstamp, r.value AS data FROM TABLE( Transpose(( SELECT raw_reads FROM ts_data WHERE loc_esi_id='4727354321000111' ))) AS tab(r)
		// select tabid,tabname from systables where tabid>99
	}
	
	function SQLQuery( sql , batchSize, cursorId, success , error )
	{
		if (!validateString(sql, "Query", 1)) {
			return;
		}
	
		var query = '{"$sql":"' + sql + '"}';
		MongoQuery( "/system.sql", query, "", "", batchSize, cursorId, success, error);
	}
	
	function validateString(input, name, minimumLength) {
		if (input == undefined) {
			GraphApp.Main.DisplaySlidingError("#dbQueryError" , name + " must be defined");
			return false;
		} else if (typeof input === "string") {
			if (minimumLength != undefined && input.length < minimumLength) {
				GraphApp.Main.DisplaySlidingError("#dbQueryError" , name + " must be specified");
				return false;
			}
		} else {
			GraphApp.Main.DisplaySlidingError("#dbQueryError" , name + " must be a string");
			return false;
		}
		return true;
	}
	
	function runMongoQuery()
	{
		runQueryFunc = runMongoQuery;
		
		if( $( "#dbQueryHost" ).attr( "data-hid" ) === undefined )
		{
			GraphApp.Main.DisplaySlidingError( "#dbQueryError" , "Please select a host." );
			return;
		}
		
		var namespace = $('#mongoNamespaceText').val();
		var query = $('#mongoQueryText').val();
		var fields = $('#mongoFieldsText').val();
		var sort = $('#mongoSortText').val();
		var batchSize = $('#mongoBatchSizeText').val();
		var cursorId = $('#mongoCursorIdText').val();
		MongoQuery(namespace, query, fields, sort, batchSize, cursorId, processQueryResult, genericError );	
	}
	
	function MongoQuery(namespace, query, fields, sort, batchSize, cursorId, success, error )
	{
		if (!validateString(namespace, "Namespace", 0)) {
			return;
		}
		if (!validateString(fields, "Fields", 0)) {
			return;
		}
	
		var queryString = "";
		queryString = attachToQueryString(queryString, "query", query);
		queryString = attachToQueryString(queryString, "fields", fields);
		queryString = attachToQueryString(queryString, "sort", sort);
		queryString = attachToQueryString(queryString, "batchSize", batchSize);
		var url = getHost() + '/' + namespace + queryString;
	
		var ajaxObj = {
			url :  url,
			dataType : "json",
			success : success,
			error : error,
			xhrFields: {
				withCredentials: true
			}
		};
		
		if (cursorId != undefined && cursorId.length > 0)
			ajaxObj.headers = { "cursorId" : cursorId };
		
		$.ajax( ajaxObj );
		
		$.mobile.loading( "show" );
	}
	
	function attachToQueryString(queryString, key, value) {
		if (value != undefined && value.length > 0) {
			if (queryString.length > 0) {
				queryString += '&' + key + '=' + value;
			} else {
				queryString += '?' + key + '=' + value;
			}
		}
		return queryString;
	}
	
	function processQueryResult(data, status, xhr) {
		
		$( "#dbQueryError" ).hide();
		$( "#dbQueryResult" ).show();
		$.mobile.loading( "hide" );
		HideForm();
		
		if (data instanceof Array) {
			if (data[0] instanceof Object) {
				console.log("result is an array of objects");
				showQueryResults(data,status,xhr);
			} else {
				console.log("result is an array of strings");
				showArrayOfStrings(data,status,xhr);
			}
		} else if (data instanceof Object) {
			console.log("result is an object");
			showObject(data,status,xhr);
		} else {
			console.log("result is an unknown type");
		}
		
		updateCursorId(xhr);
	}
	
	function updateCursorId(xhr) {
		var cursorIdObject = getCursorIdObject();
		if (cursorIdObject == undefined) {
			return;
		}
		var cursorId = xhr.getResponseHeader( "cursorId" );
		if (cursorId != undefined && cursorId.length > 0) {
			cursorIdObject.val(cursorId);
			ShowContinueButton( true );
		} else {
			cursorIdObject.val("");
			ShowContinueButton( false );
		}	
	}
	
	function getQueryResultObject() {
		
		return $( "#dbQueryResult" );
	}
	
	function getCursorIdObject() {
		var cursor = undefined;
		switch( $( "#dbQueryTabs" ).tabs( "option" , "active" ) )
		{
		case 0:
			cursor = $( '#sqlCursorIdText' );
			break;
		case 1:
			cursor = $( '#mongoCursorIdText' );
			break;
		}
		return cursor;
	}
	
	function showObject( data , status , xhr ) {
		var queryResult = getQueryResultObject();
		queryResult.empty();
		if (data.hasOwnProperty("responseText")) {
			queryResult.append(data.responseText);
			queryResult.enhanceWithin();
		}
		else if( data.hasOwnProperty( "errmsg" ) ) {
			queryResult.append( data.errmsg );
		} else {
			queryResult.append( "Unknown error occured." );
		}
	}
	
	function showArrayOfStrings( data , status , xhr ) {
		var queryResult = getQueryResultObject();
		var headers = [""];
		var html = createHtmlTable(headers, data);
		
		queryResult.empty();
		queryResult.append(html);
		queryResult.enhanceWithin();
	}
	
	function showQueryResults( data , status , xhr )
	{
		var queryResult = getQueryResultObject();
	
		var headers = extractHeaders(data);
		var html = createHtmlTable(headers, data);
		
		queryResult.empty();
		queryResult.append(html);
		queryResult.enhanceWithin();
	}
	
	function extractHeaders(data) {
		var headers = [];
		if (data.length > 0) {
			for (var field in data[0]) {
				if (data[0].hasOwnProperty(field)) {
					headers.push(field);
				}
			}
		}
		return headers;
	}
	
	function createHtmlTable(headers, data) {
		var html = '';
		html += '<table data-role="table" id="my-table" data-mode="reflow" class="ui-responsive table-stroke">';
		html += '<thead><tr>';
		for (var i = 0, size = headers.length; i < size; i++) {
			html += '<th>' + headers[i] + '</th>';
		}
		html += '</tr></thead>';
	
		// ri = row index; ci = column index
		for (var ri = 0, size = data.length; ri < size; ri++) {
			html += '<tr>'; 
			for (var ci = 0; ci < headers.length; ci++) {
				var row = data[ri];
				html += '<td>';
				var column;
				if (headers[ci] == "") {
					column = row;
				} else {
					column = eval('row.'+headers[ci]);	
				}
				
				if (column instanceof Object) {
					if (column.hasOwnProperty("$date")) {
						html += getLocalDate(column.$date);
					} else if (column.hasOwnProperty("$oid")) {
						html += 'ObjectId('+ column.$oid +')';
					} else if (column.hasOwnProperty("$binary")) {
						html += 'Binary('+ column.$type +','+ column.$binary +')';
					} else {
						html += column;
					}
				} else {
					html += column;
				}
				html += '</td>';
			}
			html += '</tr>';
		}
		html += '</table>';
		return html;
	}
	
	function SelectHostClick()
	{
		GraphApp.HostMgr.SelectHost( SelectHostCallback );
	}
	
	function SelectHostCallback( id , name )
	{
		$( "#dbQueryHost" ).attr( "data-hid" , id );
		$( "#dbQueryHost" ).text( name );
		$.mobile.navigate( "#dbQueryPage" );
	}
	
	function ContinueClick()
	{
		if( runQueryFunc ) runQueryFunc();
	}
	
	function OnTabChange()
	{
		$( "#dbQueryError" ).hide();
	}
	
	function genericError(status, statusText)
	{
		$.mobile.loading( "hide" );
		
		console.log(status);
		var queryResult = getQueryResultObject();
		if (queryResult != undefined) {
			queryResult.empty();
			queryResult.append(status.statusText);
			queryResult.enhanceWithin();
		}
	}
	
	return {
		Init : Init,
		Reset : Reset
	};
	
} )( jQuery );
