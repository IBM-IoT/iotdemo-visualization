var GraphApp = GraphApp || {};

GraphApp.Version = "0.7.0.1";

GraphApp.Main = ( function( $ ) {

	var currentPage = null;
	var userInfo = null;
	var appLoaded = false;

	function Init()
	{
		$.mobile.navigate( "#loadingPage" );
		$.mobile.initializePage();
		$.mobile.loading( "show" );
		
		var b = $( "body" );
		
		b.on( "pagecontainerbeforetransition" , OnPageTransition );
		b.on( "pagecontainershow" , OnPageShow );
		
		$( document ).on( "pagecreate" , "#testPage" , TestPageCreate );
		
		$.ajax( {
			url : "config.json",
			dataType : "json",
			success : LoadConfigCallback,
			error : ( function() { alert( "Error loading config.json" ); } )
		} );
	}
	
	function LoadConfigCallback( data , status , xhr )
	{
		if( data.db === undefined )
		{
			alert( "'db' expected in config.json" );
			return;
		}
		GraphApp.DB.SetDBInfo( data.db );
		
		if( data.graphs !== undefined )
		{
			if( data.graphs.defaultColors !== undefined && $.isArray( data.graphs.defaultColors ) )
			{
				CGraph.defaultColors = CBarGraph.defaultColors = CPieGraph.defaultColors = data.graphs.defaultColors;
			}
		}
		
		if( data.graphView !== undefined )
		{
			if( data.graphView.snapSize !== undefined ) GraphApp.GraphView.SetSnapSize( data.graphView.snapSize );
		}
		
		$.mobile.loading( "hide" );
		
		if( $.jStorage.get( "username" ) )
			LogIn( $.jStorage.get( "username" ) , function() { GraphApp.Menu.LoadMenuFromDB(); ContinueInit(); } , ContinueInit );
		else
			ContinueInit();
	}
	
	function ContinueInit()
	{	
		var d = $( document );
		
		// d.on( "pagecreate" , "#menuPage" , GraphApp.Menu.Create );
		// d.on( "pagecreate" , "#graphPage", GraphApp.GraphView.GraphPageCreate );
		// d.on( "pagecreate" , "#addGraphPage" , GraphApp.Graphs.AddGraphPageCreate );
		// d.on( "pagecreate" , "#createQueryPage" , GraphApp.Queries.CreateQueryPageCreate );
		// d.on( "pagecreate" , "#selectQueryPage" , GraphApp.Queries.SelectQueryPageCreate );
		
		// jqm events seem pointless
		MainPageCreate();
		GraphApp.Menu.Create();
		GraphApp.GraphView.GraphPageCreate();
		GraphApp.Graphs.PageCreate();
		GraphApp.Queries.CreateQueryPageCreate();
		GraphApp.Queries.ManagerInit();
		GraphApp.DBQuery.Init();
		GraphApp.HostMgr.Init();
		
		d.on( "click" , ".slidingError" , function() { $( this ).slideUp( 200 ); } );
		
		window.addEventListener( "resize" , OnWindowResize );
		
		$( ".versionContainer" ).text( GraphApp.Version );
		
		// Thanks a lot, jqm
		setTimeout( function() {
			$.mobile.navigate( userInfo ? "#menuPage" : "#mainPage" );
		} , 250 );
	}
	
	function GetUserInfo() { return userInfo; }
	function GetCurrentPage() { return currentPage; }
	
	function LogIn( user , success , error )
	{
		var obj = {
			success : success,
			error : error
		};
		
		GraphApp.DB.DoREST( "users" , "GET" , 'query={"name":"' + user + '"}' , null , LogInCallback.bind( obj ) );
		$.mobile.loading( "show" );
	}
	
	function LogInCallback( data , status , xhr )
	{
		if( data.length > 0 )
		{
			userInfo = {
				uuid : data[0]._id.$oid,
				name : data[0].name
			};
			
			$.jStorage.set( "username" , userInfo.name );
			this.success();
		}
		else this.error();
		$.mobile.loading( "hide" );
	}
	
	function LogOut()
	{
		userInfo = {};
		GraphApp.Menu.UnloadMenu();
		
		$.jStorage.deleteKey( "username" );
		$.mobile.navigate( "#mainPage" );
		
		$( "#menuPage .gridMenu" ).empty();
	}
	
	function OnWindowResize()
	{
		var w = window.innerWidth;
		var h = window.innerHeight;
		
		if( currentPage == "menuPage" )
		{
			var container = $( "#menuPage .menuContainer" );
			container[0].style.height = ( h - 45 ) + "px";
			container.find( "#menuNext" )[0].style.marginLeft = ( w - 75 ) + "px";
		
			var nw = w - 80, nh = h - 50;
			var aspectRatio = 1.7;
			var div = $( "#menuPage .gridMenu" );
			
			if( nh > nw ) // Portrait
			{
				aspectRatio = 1.0 / 1.4;
				div.addClass( "portrait" );
			}
			else div.removeClass( "portrait" );
			
			if( nw / nh > aspectRatio ) nw = Math.floor( nh * aspectRatio );
			else nh = Math.floor( nw / aspectRatio );
			
			div = div[0];
			div.style.width = nw + "px";
			div.style.height = nh + "px";
			div.style.marginLeft = Math.floor( ( w - nw - 80 ) / 2 + 40 ) + "px";
			div.style.marginTop = Math.floor( ( h - nh - 50 ) / 2 ) + "px";
		}
	}
	
	function OnPageTransition( event , ui )
	{
		// console.log( "Transition:", ui.toPage[0].id );
		
		currentPage = ui.toPage[0].id;
		
		switch( ui.toPage[0].id )
		{
		case "menuPage":
			OnWindowResize();
			GraphApp.Menu.RenderMenu();
			break;
		case "graphPage":
			GraphApp.GraphView.ResizePage();
			break;
		case "createQueryPage":
			break;
		case "queryMgrPage":
			GraphApp.Queries.ManagerRenderList();
			break;
		case "dbQueryPage":
			GraphApp.DBQuery.Reset();
			break;
		case "hostMgrPage":
			GraphApp.HostMgr.RenderHostsList();
			break;
		default:
			break;
		}
	}
	
	function OnPageShow( event , ui )
	{	
		var prevPage = "";
		if( ui.prevPage.length > 0 ) prevPage = ui.prevPage[0].id;
		
		switch( prevPage )
		{
		case "mainPage":
			$( "#loginError" ).hide();
			break;
		case "graphPage":
			GraphApp.GraphView.GraphPageDisableGraphs();
			break;
		default:
			break;
		}
	}
	
	function DisplaySlidingError( sel , error )
	{
		$( sel ).hide();
		$( sel ).html( error );
		$( sel ).slideDown( 200 );
	}

	function MainPageCreate()
	{
		$( "#loginLogInButton" ).on( "click" , LogInButtonClick );
		$( "#createUserButton" ).on( "click" , CreateUserButtonClick );
		$( "#createUserPopup" ).on( "popupafterclose" , CreateUserPopupClose );
	}
	
	function LogInButtonClick()
	{
		var username = $( "#loginUsername" ).val().trim();
		
		if( username.length < 1 )
		{
			DisplaySlidingError( "#loginError" , "Please enter a username." );
			return;
		}
		
		LogIn( username , function() {
			GraphApp.Menu.LoadMenuFromDB();
			$.mobile.navigate( "#menuPage" );
		} , function() {
			DisplaySlidingError( "#loginError" , "Error logging in." );
		} );
	}
	
	function CreateUserButtonClick()
	{
		var username = $( "#createUserName" ).val().trim();
		
		if( username.length < 1 )
		{
			DisplaySlidingError( "#createUserError" , "Please enter a username." );
			return;
		}
		
		GraphApp.DB.DoREST( "users" , "GET" , 'query={"name":"' + username + '"}' , null , CheckUsernameCallback.bind( username ) );
		$.mobile.loading( "show" );
	}
	
	function CheckUsernameCallback( data , status , xhr )
	{
		if( data.length > 0 ) // User already exists
		{
			$.mobile.loading( "hide" );
			DisplaySlidingError( "#createUserError" , "User " + this + " already exists." );
		}
		else
		{
			GraphApp.DB.DoREST( "users" , "POST" , null , '{"name":"' + this + '"}' , CreateUserCallback.bind( this ) );
		}
	}
	
	function CreateUserCallback( data , status , xhr )
	{
		$.mobile.loading( "hide" );
		$( "#createUserPopup" ).popup( "close" );
		$( "#loginUsername" ).val( this );
	}
	
	function CreateUserPopupClose()
	{
		$( "#createUserName" ).val( "" );
		$( "#createUserError" ).hide();
	}

	function GenericError()
	{
		console.log( "Generic error" );
	}
	
	function TestPageCreate()
	{
		var test_graph = new CDataSheet( "#testPage" , "testGraph" , {
			title : "Test Data Sheet",
			elementCount : 500
		} );
		
		// var simData = [];
		// for( var i = 0; i < 5; i++ )
			// simData.push( { label : "Bar " + ( i + 1 ), data : Math.floor( Math.random() * 200 ) - 100 } );
		
		// bgraph.RecvData( simData );
		
		var db = {
			host : "50.23.106.210",
			port : 27018,
			db : "iot_demo"
		};
		
		test_graph.Init( "select neighborhood_id as label, sum( gallons_used ) as data from n_water_dayavg_vti group by 1 order by 2 desc" , db );
	}
	
	return {
		Init : Init,
		GetUserInfo : GetUserInfo,
		GetCurrentPage : GetCurrentPage,
		LogOut : LogOut,
		DisplaySlidingError : DisplaySlidingError
	};
	
} )( jQuery );

GraphApp.Main.Init();