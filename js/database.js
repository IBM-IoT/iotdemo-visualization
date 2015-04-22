
var GraphApp = GraphApp || {};

GraphApp.DB = ( function() {

	var dbInfo = {};
	var sqlQueue = [];
	var sqlIsExecuting = false;
	
	function SetDBInfo( newDBInfo )
	{
		dbInfo = newDBInfo;
	}

	function SQLQuery( args )
	{
		args.success = args.success || null;
		args.error = args.error || null;
		args.useQueue = args.useQueue || false;
	
		if( args.db === undefined ) args.db = dbInfo;
		else
		{
			args.db.host = args.db.host || dbInfo.host;
			args.db.port = args.db.port || dbInfo.port;
			args.db.db = args.db.db || dbInfo.db;
		}
	
		var obj = {
			url : "http://" + args.db.host + ":" + args.db.port + "/" + args.db.db + "/system.sql",
			contentType : "text/plain; charset=UTF-8",
			dataType : "json",
			success : args.success,
			error : [ AJAXError , args.error ],
			xhrFields: {
				withCredentials: true
			}
		};
		
		if( args.sql !== undefined )
		{
			obj.url += '?query={"$sql":"' + args.sql + '"}';
			if( args.limit !== undefined )
				obj.url += "&limit=" + args.limit;
		}
		else if( args.cursorId !== undefined )
		{
			obj.headers = { "cursorId" : args.cursorId };
		}
		else
		{
			console.error( "SQLQuery :: sql and cursorId can't be undefined" );
			return;
		}
		
		if( args.useQueue === true )
		{
			obj.success = [ SQLQueueCallback , args.success ];
			if( sqlIsExecuting == true )
			{
				console.log( "Adding to queue." );
				sqlQueue.unshift( obj );
				return;
			}
			
			sqlIsExecuting = true;
		}
		
		$.ajax( obj );
	}
	
	function SQLQueueCallback()
	{
		if( sqlQueue.length == 0 )
		{
			console.log( "Queue empty." );
			sqlIsExecuting = false;
		}
		else
		{
			$.ajax( sqlQueue.pop() );
		}
	}

	function AJAXError( xhr , status , error )
	{
		console.error( "AJAX Error:" , status , error );
	}

	function BuildTSQuery( queryFormat , params , startDate , endDate )
	{
		var query = queryFormat;

		query = query.replace( /%start/g , startDate == undefined ? "NULL::datetime year to fraction(5)" : "'" + startDate + "'::datetime year to fraction(5)" )
					 .replace( /%end/g , endDate == undefined ? "NULL::datetime year to fraction(5)" : "'" + endDate + "'::datetime year to fraction(5)" );
		
		return BuildQuery( query , params );
	}
	
	function BuildQuery( queryFormat , params )
	{
		for( var i in params )
			queryFormat = queryFormat.replace( new RegExp( "%" + i , "g" ) , params[i] );
			
		return queryFormat;
	}

	function DoREST( collection , type , params , data , callback )
	{
		type = type || "GET";
		if( params === undefined || params === null ) params = "";
		else params = "?" + params;

		$.ajax( {
			url : "http://" + dbInfo.host + ":" + dbInfo.port + "/" + dbInfo.db + "/" + collection + "/" + params,
			type : type,
			data : data,
			contentType : "text/plain; charset=UTF-8",
			dataType : "json",
			success : callback,
			error : AJAXError,
			xhrFields: {
				withCredentials: true
			}
		} );
	}
	
	return {
		SetDBInfo : SetDBInfo,
		SQLQuery : SQLQuery,
		BuildTSQuery : BuildTSQuery,
		BuildQuery : BuildQuery,
		DoREST : DoREST
	};

} )();
