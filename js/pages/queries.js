var GraphApp = GraphApp || {};

GraphApp.Queries = ( function( $ ) {

	var CFG_STATIC = 1;
	
	var QueryType = {
		LINEGRAPH : 1,
		BARGRAPH : 2,
		GROUP : 3,
		MAP : 4,
		DATASHEET : 5,
		GAUGE : 6
	};

	var itemQueryTypes = [ 0 , QueryType.GROUP , QueryType.LINEGRAPH , QueryType.BARGRAPH , QueryType.BARGRAPH , QueryType.DATASHEET , QueryType.MAP , QueryType.GAUGE , QueryType.LINEGRAPH ];
	var createQueryLast = null;
	var queryType = QueryType.LINEGRAPH;
	var editingQuery = null;
	var queries = null;
	
	function LoadQueriesFromDB()
	{
		GraphApp.DB.DoREST( "queries" , "GET" , 'query={"userid":{"$oid":"' + GraphApp.Main.GetUserInfo().uuid + '"}}' , null , LoadQueriesCallback );
	}
	
	function LoadQueriesCallback( data , status , xhr )
	{
		queries = {};
		for( var i in data )
		{
			queries[ data[i]._id.$oid ] = data[i];
			delete queries[ data[i]._id.$oid ]._id;
		}
		
		console.log( "Queries loaded." );
		console.log( queries );
		
		$.mobile.loading( "hide" );
		if( GraphApp.Main.GetCurrentPage() == "selectQueryPage" ) ManagerRenderList();
		
		GraphApp.HostMgr.LoadHostsFromDB();
	}
	
	function GetQueries() { return queries; }

	function CreateQueryPageCreate()
	{
		$( "#createQueryHost" ).on( "tap" , CreateQueryHostButtonClick );
		$( "#createQueryCreate" ).on( "tap" , CreateQueryCreateButtonClick );
		$( "#createQuerySave" ).on( "click" , CreateQuerySaveButtonClick );
		$( "#createQueryCopyExisting" ).on( "tap" , CreateQueryCopyExistingButtonClick );
		$( "#createQueryIsStatic" ).on( "change" , CreateQueryIsStaticChange );
		
		$( "#createQueryInit" ).textinput();
		$( "#createQueryIsStatic" ).slider();
	}
		
	function CreateQueryResetForm()
	{
		$( "#createQueryError" ).hide();
		$( "#createQueryHost" ).attr( "data-hid" , "" );
		$( "#createQueryHost" ).text( "Select" );
		$( "#createQueryName" ).val( "" );
		
		if( queryType == QueryType.LINEGRAPH )
		{
			$( "#createQueryInit" ).val( "" );
			$( "#createQueryInit" ).textinput( "enable" );
			$( "#createQueryMain" ).val( "" );
			$( "#createQueryIsStatic" ).val( "no" );
			$( "#createQueryIsStatic" ).slider( "refresh" );
			$( "#createQueryTimeOffset" ).val( "" );
		}
		else if( queryType == QueryType.BARGRAPH )
		{
			$( "#createQueryBGMain" ).val( "" );
		}
		else if( queryType == QueryType.GROUP )
		{
			$( "#createQueryGroupMain" ).val( "" );
		}
		else if( queryType == QueryType.MAP )
		{
			$( "#createQueryMapMain" ).val( "" );
		}
		else if( queryType == QueryType.DATASHEET )
		{
			$( "#createQueryDSMain" ).val( "" );
		}
		else if( queryType == QueryType.GAUGE )
		{
			$( "#createQueryGaugeMain" ).val( "" );
			$( "#createQueryGaugeUnits" ).val( "" );
		}
		
		$( "#createQuerySettings > div" ).hide();
		var selectors = [ null , "#createQueryLineGraph" , "#createQueryBarGraph" , "#createQueryGroup" , "#createQueryMap" , "#createQueryDS" , "#createQueryGauge" ];
		if( selectors[ queryType ] != null ) $( selectors[ queryType ] ).show();
		
		$( "#createQueryPage h3" ).text( "Create Data Series" );
		$( "#createQueryCreate" ).show();
		$( "#createQuerySave" ).hide();
	}
	
	function CreateQueryPopulateForm( query , isEditing )
	{
		if( isEditing === undefined ) isEditing = false;
		
		queryType = query.type;
		CreateQueryResetForm();
		
		var queryHost = GraphApp.HostMgr.GetHost( query.hostid.$oid );
		
		$( "#createQueryHost" ).attr( "data-hid" , query.hostid.$oid );
		$( "#createQueryHost" ).text( queryHost.name );
		$( "#createQueryName" ).val( query.name );
		
		if( queryType == QueryType.LINEGRAPH )
		{
			$( "#createQueryInit" ).val( query.initQuery );
			$( "#createQueryMain" ).val( query.mainQuery );
			
			if( query.cfg & CFG_STATIC > 0 )
			{
				$( "#createQueryIsStatic" ).val( "yes" );
				$( "#createQueryIsStatic" ).slider( "refresh" );
				$( "#createQueryInit" ).textinput( "disable" );
			}
			if( query.timeoffset !== undefined )
			$( "#createQueryTimeOffset" ).val( query.timeoffset / 1000 );
		}
		else if( queryType == QueryType.BARGRAPH )
		{
			$( "#createQueryBGMain" ).val( query.query );
		}
		else if( queryType == QueryType.GROUP )
		{
			$( "#createQueryGroupMain" ).val( query.query );
		}
		else if( queryType == QueryType.MAP )
		{
			$( "#createQueryMapMain" ).val( query.query );
		}
		else if( queryType == QueryType.DATASHEET )
		{
			$( "#createQueryDSMain" ).val( query.query );
		}
		else if( queryType == QueryType.GAUGE )
		{
			$( "#createQueryGaugeMain" ).val( query.query );
			$( "#createQueryGaugeUnits" ).val( query.units );
		}
		
		if( isEditing )
		{
			$( "#createQueryCreate" ).hide();
			$( "#createQuerySave" ).show();
			$( "#createQueryPage h3" ).text( "Edit Data Series" );
		}
	}
	
	function CreateQueryHostButtonClick()
	{
		GraphApp.HostMgr.SelectHost( CreateQueryHostCallback );
	}
	
	function CreateQueryHostCallback( id , name )
	{
		$( "#createQueryHost" ).attr( "data-hid" , id );
		$( "#createQueryHost" ).text( name );
		$.mobile.navigate( "#createQueryPage" );
	}
	
	function CreateQueryGetQueryFromForm()
	{
		var inputErrors = [];
		
		var hostid = $( "#createQueryHost" ).attr( "data-hid" );
		var name = $( "#createQueryName" ).val().trim();
		
		var querySettings = 0;		
		
		var query = {};
		
		if( !hostid ) inputErrors.push( "Please select a host." );
		if( name.length < 1 ) inputErrors.push( "Please enter a name." );
		
		if( queryType == QueryType.LINEGRAPH )
		{
			var initQuery = $( "#createQueryInit" ).val().trim();
			var mainQuery = $( "#createQueryMain" ).val().trim();
			var isStatic = ( $( "#createQueryIsStatic" )[0].selectedIndex == 1 );
			var timeOffset = $( "#createQueryTimeOffset" ).val().trim();
			
			if( isStatic ) querySettings += CFG_STATIC;

			if( !isStatic && initQuery.length < 1 ) inputErrors.push( "Please enter an init query." );
			if( mainQuery.length < 1 ) inputErrors.push( "Please enter a main query." );
			if( timeOffset.length > 0 )
			{
				timeOffset = parseInt( timeOffset ) * 1000;
				if( isNaN( timeOffset ) || timeOffset < 0 ) inputErrors.push( "Invalid time offset." );
			}
			else timeOffset = null;
			
			query.mainQuery = mainQuery;			
			if( !isStatic ) query.initQuery = initQuery;
			if( timeOffset !== null ) query.timeoffset = timeOffset;
		}
		else if( queryType == QueryType.BARGRAPH )
		{
			var bgQuery = $( "#createQueryBGMain" ).val().trim();
			
			if( bgQuery.length < 1 ) inputErrors.push( "Please enter a query." );
			
			query.query = bgQuery;
		}
		else if( queryType == QueryType.GROUP )
		{
			var mainQuery = $( "#createQueryGroupMain" ).val().trim();
			
			if( mainQuery.length < 1 ) inputErrors.push( "Please enter a query." );
			
			query.query = mainQuery;
		}
		else if( queryType == QueryType.MAP )
		{
			var mainQuery = $( "#createQueryMapMain" ).val().trim();
			
			if( mainQuery.length < 1 ) inputErrors.push( "Please enter a query." );
			
			query.query = mainQuery;
		}
		else if( queryType == QueryType.DATASHEET )
		{
			var mainQuery = $( "#createQueryDSMain" ).val().trim();
			
			if( mainQuery.length < 1 ) inputErrors.push( "Please enter a query." );
			
			query.query = mainQuery;
		}
		else if( queryType == QueryType.GAUGE )
		{
			var mainQuery = $( "#createQueryGaugeMain" ).val().trim();
			var units = $( "#createQueryGaugeUnits" ).val().trim();
			
			if( mainQuery.length < 1 ) inputErrors.push( "Please enter a query." );
			
			query.query = mainQuery;
			query.units = units || "";
		}
		
		if( inputErrors.length > 0 )
		{
			GraphApp.Main.DisplaySlidingError( "#createQueryError" , inputErrors.join( "<br>" ) );
			return null;
		}
		
		query.userid = { $oid : GraphApp.Main.GetUserInfo().uuid };
		query.hostid = { $oid : hostid };
		query.name = name;
		query.cfg = querySettings;
		query.type = queryType;
		
		return query;
	}
	
	function CreateQueryCreateButtonClick()
	{
		var query = CreateQueryGetQueryFromForm();
		if( !query ) return;
		
//		console.log( JSON.stringify( query ) );
		GraphApp.DB.DoREST( "queries" , "POST" , null , JSON.stringify( query ) , CreateQueryCreateCallback.bind( query ) );
		$.mobile.loading( "show" );
	}
	
	function CreateQuerySaveButtonClick()
	{
		var query = CreateQueryGetQueryFromForm();
		
		GraphApp.DB.DoREST( "queries" , "PUT" , 'query={"_id":{"$oid":"' + editingQuery + '"}}' , JSON.stringify( query ) , CreateQueryCreateCallback.bind( query ) );
		$.mobile.loading( "show" );
	}
	
	function CreateQueryCreateCallback( data , status , xhr )
	{
		$.mobile.loading( "hide" );
		
		if( data && data.hasOwnProperty( "ok" ) && data.ok == true )
		{
			if( data.hasOwnProperty( "id" ) ) queries[ data.id.$oid ] = this;
			else if( data.hasOwnProperty( "n" ) && data.n > 0 ) queries[ editingQuery ] = this;
			
			$.mobile.navigate( "#queryMgrPage" );
		}
		else alert( "Error creating query." );
	}
	
	function CreateQueryCopyExistingButtonClick()
	{
		ManagerOpenSelect( queryType , CreateQueryCopyExistingCallback );
	}
	
	function CreateQueryCopyExistingCallback( id , query )
	{
		console.log( query );
		if( id ) CreateQueryPopulateForm( query );
		$.mobile.navigate( "#createQueryPage" );
	}
	
	function CreateQueryIsStaticChange()
	{
		$( "#createQueryInit" ).textinput( $( this )[0].selectedIndex == 1 ? "disable" : "enable" ); 
	}
	
	var managerSelectCallback = null;
	var managerQueryType = null;
	var managerCurrentSelected = null;
	
	function ManagerInit()
	{
		var menuItems = [ GraphApp.Graphs.ItemType.GROUP , GraphApp.Graphs.ItemType.AREAGRAPH , GraphApp.Graphs.ItemType.GRAPH , 
		                  GraphApp.Graphs.ItemType.BARGRAPH , GraphApp.Graphs.ItemType.PIEGRAPH , GraphApp.Graphs.ItemType.DATASHEET ,
		                  GraphApp.Graphs.ItemType.MAP , GraphApp.Graphs.ItemType.GAUGE ];
		var fset = $( '<fieldset data-role="controlgroup"></fieldset>' );
		for( var i in menuItems )
			fset.append( '<button data-itemid="' + menuItems[i] + '">' + GraphApp.Graphs.itemNames[ menuItems[i] ] + '</button>' );
		
		fset.controlgroup();
		$( "#queryMgrAddPopup" ).append( fset );
		$( "#queryMgrAddPopup button" ).on( "click" , ManagerAddPopupButtonClick );
		
		$( "#queryMgrBack" ).on( "click" , ManagerBackButtonClick );
		$( "#queryMgrAdd" ).on( "click" , ManagerAddButtonClick );
		$( "#queryMgrList" ).on( "click" , "li a:nth-of-type(1)" , ManagerListMainClick );
		$( "#queryMgrList" ).on( "click" , "li a:nth-of-type(2)" , ManagerListSideClick );
	}
	
	function ManagerBackButtonClick()
	{
		if( managerSelectCallback ) managerSelectCallback( null );
		else $.mobile.navigate( "#menuPage" );
		managerSelectCallback = null;
	}
	
	function ManagerAddButtonClick()
	{
		if( managerSelectCallback != null && managerQueryType != null )
		{
			queryType = managerQueryType;
			CreateQueryResetForm();
			$.mobile.navigate( "#createQueryPage" );
		}
		else $( "#queryMgrAddPopup" ).popup( "open" );
	}
	
	function ManagerAddPopupButtonClick()
	{
		var itemid = $( this ).attr( "data-itemid" );
		queryType = itemQueryTypes[ itemid ];
		CreateQueryResetForm();
		$.mobile.navigate( "#createQueryPage" );
	}
	
	function ManagerListMainClick()
	{
		var id = $( this ).parents( "li" ).attr( "data-qid" );
		
		if( managerSelectCallback )
		{
			managerSelectCallback( id , queries[ id ] );
			managerSelectCallback = null;
		}
		else
		{
			ManagerEditItem( id );
		}
	}
	
	function ManagerListSideClick()
	{
		var id = $( this ).parents( "li" ).attr( "data-qid" );
		
		if( managerSelectCallback == null )
		{
			if( GraphApp.Menu.GetMenu().CheckReferenceToQuery( id ) )
			{
				$( "#queryMgrDeleteError" ).popup( "open" );
			}
			else
			{
				delete queries[ id ];
				ManagerRenderList();
				GraphApp.DB.DoREST( "queries" , "DELETE" , 'query={"_id":{"$oid":"' + id + '"}}' , null , null );
			}
		}
		else
		{
			ManagerEditItem( id );
		}
	}
	
	function ManagerEditItem( id )
	{
		CreateQueryPopulateForm( queries[id] , true );
		editingQuery = id;
		$.mobile.navigate( "#createQueryPage" );
	}
	
	function ManagerRenderList()
	{
		if( !queries ) return;
	
		var list = $( "#queryMgrList" );
		list.empty();
		list.listview( "option" , "splitIcon" , managerSelectCallback == null ? "delete" : "edit" );
		
		var listContent = "";
		
		for( var i in queries )
		{
			if( managerQueryType == null || queries[i].type == managerQueryType )
			{
				var appendHTML = '<li data-qid="' + i + '"><a href="#">' + queries[i].name + '<p>';
				if( queries[i].type == QueryType.LINEGRAPH ) appendHTML += queries[i].mainQuery;
				else appendHTML += queries[i].query;
				appendHTML += '</p></a>';
				if( managerSelectCallback == null ) appendHTML += '<a href="#">Delete</a>';
				else appendHTML += '<a href="#">Edit</a>';
				appendHTML += '</li>';
				
				if( i == managerCurrentSelected )
				{
					appendHTML = '<li data-role="list-divider">Currently selected</li>' + appendHTML +
					             '<li data-role="list-divider"> </li>';
					listContent = appendHTML + listContent;
				}
				else listContent += appendHTML;
			}
		}
		
		list.append( listContent );
		list.listview( "refresh" );
	}
	
	function ManagerOpenView()
	{
		managerQueryType = null;
		managerSelectCallback = null;
		managerCurrentSelected = null;
		$.mobile.navigate( "#queryMgrPage" );
	}
	
	function ManagerOpenSelect( setQueryType , callback , currentSelected )
	{
		managerCurrentSelected = currentSelected || null;
		managerQueryType = setQueryType;
		managerSelectCallback = callback;
		$.mobile.navigate( "#queryMgrPage" );
	}
	
	return {
		QueryType : QueryType,
		itemQueryTypes : itemQueryTypes,
	
		LoadQueriesFromDB : LoadQueriesFromDB,
		GetQueries : GetQueries,
		CreateQueryPageCreate : CreateQueryPageCreate,
		CreateQueryResetForm : CreateQueryResetForm,
		
		ManagerInit : ManagerInit,
		ManagerRenderList : ManagerRenderList,
		ManagerOpenView : ManagerOpenView,
		ManagerOpenSelect : ManagerOpenSelect
	};

} )( jQuery );