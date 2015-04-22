
GraphApp = GraphApp || {};

GraphApp.HostMgr = ( function( $ ) { 
	
	var hosts = null;
	var editingHost = null;
	var deletingHost = null;
	var selectHostCallback = null;
	
	function LoadHostsFromDB()
	{
		GraphApp.DB.DoREST( "hosts" , "GET" , 'query={"userid":{"$oid":"' + GraphApp.Main.GetUserInfo().uuid + '"}}' , null , LoadHostsCallback );
		$.mobile.loading( "show" );
	}
	
	function LoadHostsCallback( data , status , xhr )
	{
		$.mobile.loading( "hide" );
		
		hosts = {};
		for( var i in data )
		{
			hosts[ data[i]._id.$oid ] = data[i];
			delete hosts[ data[i]._id.$oid ]._id;
		}
		
		if( GraphApp.Main.GetCurrentPage() == "hostMgrPage" ) RenderHostsList();
	}
	
	function GetHost( id ) { return hosts[id]; };
	function GetHosts() { return hosts; }
	
	function GetHostURL( host )
	{
		return "http://" + host.host + ":" + host.port + "/" + host.db;
	}
	
	function Init()
	{
		$( "#hostMgrAdd" ).on( "click" , AddButtonClick );
		$( document ).on( "click" , "#hostMgrList li a:nth-of-type(1)" , HostEditClick );
		$( document ).on( "click" , "#hostMgrList li a:nth-of-type(2)" , HostDeleteClick );
		
		$( "#hostMgrFormAdd" ).on( "click" , FormAddButtonClick );
		$( "#hostMgrFormSave" ).on( "click" , FormSaveButtonClick );
	}
	
	function AddButtonClick()
	{		
		ResetForm();
		$( "#hostMgrFormAdd" ).show();
		$( "#hostMgrFormSave" ).hide();
		$( "#hostMgrFormPopup" ).popup( "open" );
	}
	
	function HostEditClick()
	{
		editingHost = $( this ).parents( "li" ).attr( "data-hid" );
		
		if( selectHostCallback )
		{
			selectHostCallback( editingHost , hosts[ editingHost ].name );
			return;
		}
		
		PopulateForm( editingHost );
		$( "#hostMgrFormAdd" ).hide();
		$( "#hostMgrFormSave" ).show();
		$( "#hostMgrFormPopup" ).popup( "open" );
	}
	
	function HostDeleteClick()
	{
		deletingHost = $( this ).parents( "li" ).attr( "data-hid" );
		GraphApp.DB.DoREST( "queries" , "GET" , 'query={"hostid":{"$oid":"' + deletingHost + '"}}&limit=1' , null , HostReferenceCallback );
		$.mobile.loading( "show" );
	}
	
	function HostReferenceCallback( data , status , xhr )
	{
		$.mobile.loading( "hide" );
		
		if( data && data.length > 0 )
		{
			$( "#hostMgrDeleteError" ).popup( "open" );
			return;
		}
		
		delete hosts[ deletingHost ];
		RenderHostsList();
		GraphApp.DB.DoREST( "hosts" , "DELETE" , 'query={"_id":{"$oid":"' + deletingHost + '"}}' , null , null );
	}
	
	function ResetForm()
	{
		$( "#hostMgrFormError" ).hide();
		$( "#hostMgrFormPopup input" ).val( "" );
	}
	
	function PopulateForm( hostid )
	{
		var h = hosts[ hostid ];
		if( !h ) return;
		
		ResetForm();
		
		$( "#hostMgrFormName" ).val( h.name || "" );
		$( "#hostMgrFormHost" ).val( h.host );
		$( "#hostMgrFormPort" ).val( h.port );
		$( "#hostMgrFormDB" ).val( h.db );
	}
	
	function RenderHostsList()
	{
		if( !hosts ) return;
		
		var list = $( "#hostMgrList" );
		list.empty();
		
		var output = "";
		for( var i in hosts )
		{
			var name = hosts[i].host + ":" + hosts[i].port + "/" + hosts[i].db;
			if( hosts[i].name ) name = hosts[i].name + " (" + name + ")";
			output += '<li data-hid="' + i + '"><a href="#">' + name + '</a>';
			if( !selectHostCallback ) output += '<a href="#">Delete</a>';
			output += '</li>';
		}
		
		list.append( output );
		list.listview( "refresh" );
	}
	
	function GetHostObjectFromForm()
	{
		var errors = [];
		
		var name = $( "#hostMgrFormName" ).val().trim();
		var host = $( "#hostMgrFormHost" ).val().trim();
		var port = parseInt( $( "#hostMgrFormPort" ).val().trim() );
		var db = $( "#hostMgrFormDB" ).val().trim();
		
		if( host.length < 1 ) errors.push( "Please enter a host." );
		if( isNaN( port ) || port < 1 || port > 65535 ) errors.push( "Please enter a valid port." );
		if( db.length < 1 ) errors.push( "Please enter a database." );
		
		if( errors.length > 0 )
		{
			GraphApp.Main.DisplaySlidingError( "#hostMgrFormError" , errors.join( "<br>" ) );
			return null;
		}
		
		var obj = {
			host : host,
			port : port,
			db : db,
			userid : { $oid : GraphApp.Main.GetUserInfo().uuid }
		};
		if( name.length > 0 ) obj.name = name;
		
		return obj;
	}
	
	function FormAddButtonClick()
	{
		var newHost = GetHostObjectFromForm();
		if( !newHost ) return;
		
		GraphApp.DB.DoREST( "hosts" , "POST" , null , JSON.stringify( newHost ) , FormDone.bind( newHost ) );
		$.mobile.loading( "show" );
	}
	
	function FormSaveButtonClick()
	{
		var newHost = GetHostObjectFromForm();
		if( !newHost ) return;
		
		GraphApp.DB.DoREST( "hosts" , "PUT" , 'query={"_id":{"$oid":"' + editingHost + '"}}' , JSON.stringify( newHost ) , FormDone.bind( newHost ) );
		$.mobile.loading( "show" );
	}
	
	function FormDone( data , status , xhr )
	{
		$.mobile.loading( "hide" );
		
		if( data )
		{
			if( data.hasOwnProperty( "id" ) ) hosts[ data.id.$oid ] = this;
			else if( data.hasOwnProperty( "n" ) && data.n > 0 ) hosts[ editingHost ] = this;
		}
		
		RenderHostsList();
		$( "#hostMgrFormPopup" ).popup( "close" );
	}
	
	function ManageHosts()
	{
		selectHostCallback = null;
		$.mobile.navigate( "#hostMgrPage" );
	}
	
	function SelectHost( callback )
	{
		selectHostCallback = callback;
		$.mobile.navigate( "#hostMgrPage" );
	}
	
	return {
		LoadHostsFromDB : LoadHostsFromDB,
		GetHost : GetHost,
		GetHosts : GetHosts,
		GetHostURL : GetHostURL,
		
		Init : Init,
		RenderHostsList : RenderHostsList,
		ManageHosts : ManageHosts,
		SelectHost : SelectHost
	};
	
} )( jQuery );