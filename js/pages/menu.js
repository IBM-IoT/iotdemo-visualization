var GraphApp = GraphApp || {};

GraphApp.TILES_PER_PAGE = 6;

GraphApp.Menu = ( function( $ ) {

	var menu = null;
	var menuCurrentPage = 0;
	var menuPageCount = 0;
	var deleteID = null;

	function GetMenu() { return menu; }
	function UnloadMenu() { menu = null; }
	
	function LoadMenuFromDB()
	{
		menu = new GraphApp.Model.Menu( GraphApp.Main.GetUserInfo().uuid , LoadMenuFromDBCallback );
		$.mobile.loading( "show" );
	}
	
	function LoadMenuFromDBCallback( data , status , xhr )
	{
		menuCurrentPage = 0;
		if( GraphApp.Main.GetCurrentPage() == "menuPage" ) RenderMenu();
		GraphApp.Queries.LoadQueriesFromDB();
	}
	
	function Create( event )
	{
		var menuItems = [ GraphApp.Graphs.ItemType.GROUP , GraphApp.Graphs.ItemType.AREAGRAPH , GraphApp.Graphs.ItemType.GRAPH , 
		                  GraphApp.Graphs.ItemType.BARGRAPH , GraphApp.Graphs.ItemType.PIEGRAPH , GraphApp.Graphs.ItemType.DATASHEET ,
		                  GraphApp.Graphs.ItemType.MAP , GraphApp.Graphs.ItemType.GAUGE ];
		var fset = $( '<fieldset data-role="controlgroup"></fieldset>' );
		for( var i in menuItems )
			fset.append( '<button data-itemid="' + menuItems[i] + '">' + GraphApp.Graphs.itemNames[ menuItems[i] ] + '</button>' );
		
		fset.controlgroup();
		$( "#menuAddPopup" ).append( fset );
		
		$( "#menuBack" ).on( "click" , BackButtonClick );
		$( "#menuSwitchUser" ).on( "click" , GraphApp.Main.LogOut );
		$( "#menuPrev" ).on( "click" , PrevButtonClick );
		$( "#menuNext" ).on( "click" , NextButtonClick );
		$( "#menuDeleteConfirm" ).on( "click" , GridItemDeleteConfirm );
		$( "#menuAddPopup button" ).on( "click" , AddPopupButtonClick );
		
		$( "#menuPage" ).hammer( { preventDefault:false } ).on( "swiperight" , MenuPrevPage );
		$( "#menuPage" ).hammer( { preventDefault:false } ).on( "swipeleft" , MenuNextPage );
		
		var d = $( document );
		
		d.on( "tap" , "#menuPage .gridItem" , GridItemTap );
		d.on( "taphold" , "#menuPage .gridItem" , GridItemTapHold );
		
		d.on( "tap" , "#menuPage .smIconGrid" , GridItemGridClick );
		d.on( "tap" , "#menuPage .smIconEdit" , GridItemEditClick );
		d.on( "tap" , "#menuPage .smIconDelete" , GridItemDeleteClick );
		
		$( "#menuPagePanelQueryMgr" ).on( "click" , function() {
			GraphApp.Queries.ManagerOpenView();
		} );
		
		$( "#menuPagePanelHostMgr" ).on( "click" , function() {
			GraphApp.HostMgr.ManageHosts();
		} );
	}
	
	function BackButtonClick()
	{
		MenuNavigateTo( menu.menu[ menu.currentGroup ].parent );
	}
	
	function GridItemTap( event )
	{
		if( event.target.id == "menuAddGraph" )
		{
			return;
		}
		
		var id = $( this ).attr( "data-menuid" );
		if( menu.menu[ id ].type != GraphApp.Graphs.ItemType.GROUP )
		{
			GraphApp.GraphView.Graph( id );
		}
		else
		{
			MenuNavigateTo( id );
			event.preventDefault();
		}
	}
	
	function GridItemTapHold( event )
	{
		var target = $( this ).find( ".slidingMenu" );
		target.removeClass( "slideDown" );
		target.addClass( "slideUp" );
		
		setTimeout( function() {
			this.removeClass( "slideUp" );
			this.addClass( "slideDown" );
		}.bind( target ) , 3000 );
		
		event.preventDefault();
	}
	
	function GridItemGridClick( event )
	{
		GraphApp.GraphView.Graph( $( this ).parents( ".gridItem" ).attr( "data-menuid" ) );
	
		event.stopPropagation();
		event.preventDefault();
	}
	
	function GridItemEditClick( event )
	{
		var id = $( this ).parents( ".gridItem" ).attr( "data-menuid" );
		
		GraphApp.Graphs.PopulateForm( id );
		$.mobile.navigate( "#addGraphPage" );
		
		event.stopPropagation();
		event.preventDefault();
	}
	
	function GridItemDeleteClick( event )
	{
		deleteID = $( this ).parents( ".gridItem" ).attr( "data-menuid" );
		var popup = $( "#menuDeletePopup" );
		
		popup.find( "p" ).text( "Delete " + ( menu.IsGroup( deleteID ) ? menu.menu[ deleteID ].name : menu.FindGraphByID( deleteID ).name ) + "?" );
		popup.popup( "open" , { positionTo: "window" } );
		
		event.stopPropagation();
		event.preventDefault();
	}
	
	function GridItemDeleteConfirm()
	{
		$.mobile.loading( "show" );
		if( menu.IsGroup( deleteID ) )
		{
			var groups = menu.GetGroups( deleteID );
			var groupIDs = [];
			for( var i = 0; i < groups.length; i++ )
			{
				groupIDs.push( '{"$oid":"' + groups[i].id + '"}' );
				delete menu.menu[ groups[i].id ];
			}
			
			GraphApp.DB.DoREST( "graphs" , "DELETE" , 'query={"$or":[{"parentid":{"$in":[' + groupIDs.join(",") + ']}},{"_id":{"$oid":"' + deleteID + '"}}]}' , null , GridItemDeleteComplete );
		}
		else
		{
			
			GraphApp.DB.DoREST( "graphs" , "DELETE" , 'query={"_id":{"$oid":"' + deleteID + '"}}' , null , GridItemDeleteComplete );
		}
	}
	
	function GridItemDeleteComplete()
	{
		menu.LoadGroup( GraphApp.Main.GetUserInfo().uuid , menu.currentGroup , function() {
			$.mobile.loading( "hide" );
			RenderMenu();
		} );
	}
	
	function AddPopupButtonClick( event )
	{
		GraphApp.Graphs.SetItemType( parseInt( $( this ).attr( "data-itemid" ) ) );
		GraphApp.Graphs.ResetForm();
		$.mobile.navigate( "#addGraphPage" );
	}
	
	function PrevButtonClick( event )
	{
		event.preventDefault();
		MenuPrevPage();
	}
	
	function NextButtonClick( event )
	{
		event.preventDefault();
		MenuNextPage();
	}
	
	function MenuPrevPage()
	{
		if( menuCurrentPage == 0 ) return;
		
		var pages = $( "#menuPage .gridMenu .menuPage" );
		$( pages[ menuCurrentPage ] ).addClass( "menuPageRight" );
		$( pages[ menuCurrentPage - 1 ] ).removeClass( "menuPageLeft" );
		menuCurrentPage--;
		
		$( "#menuNext" )[0].style.visibility = "visible";
		if( menuCurrentPage == 0 ) $( "#menuPrev" )[0].style.visibility = "hidden";
	}
	
	function MenuNextPage()
	{
		if( menuCurrentPage == menuPageCount - 1 ) return;
		
		var pages = $( "#menuPage .gridMenu .menuPage" );
		$( pages[ menuCurrentPage ] ).addClass( "menuPageLeft" );
		$( pages[ menuCurrentPage + 1 ] ).removeClass( "menuPageRight" );
		menuCurrentPage++;
		
		$( "#menuPrev" )[0].style.visibility = "visible";
		if( menuCurrentPage == menuPageCount - 1 ) $( "#menuNext" )[0].style.visibility = "hidden";
	}
	
	function MenuNavigateTo( id )
	{
		// console.log( "Navigating to: " + id );
		menuCurrentPage = 0;
		menu.currentGroup = id;
		$( "body" ).pagecontainer( "change" , "#menuPage" , { allowSamePageTransition : true, transition: "none" } );
	}
	
	function RenderMenu()
	{
		if( !menu || !menu.menu ) return;
		
		if( menu.currentGroup == "root" ) $( "#menuBack" ).hide();
		else $( "#menuBack" ).show();
	
		// console.log( "RenderMenu:" , navCurrentGroup );
		var container = $( "#menuPage .gridMenu" );
		
		var current = menu.menu[ menu.currentGroup ];
		console.log( current );	
		$( "#menuPageTitle" ).text( current.name === undefined ? "Menu" : "Menu - " + current.name );
		
		container.empty();
		
		menuPageCount = Math.ceil( ( current.groups.length + current.graphs.length + 1 ) / GraphApp.TILES_PER_PAGE );
		for( var i = 0; i < menuPageCount; i++ )
		{
			var addClass = "";
			if( i > menuCurrentPage ) addClass = " menuPageRight";
			else if( i < menuCurrentPage ) addClass = " menuPageLeft";
			container.append( '<div class="menuPage' + addClass + '"> </div>' );
		}
		
		var pages = container.find( ".menuPage" );
		var itemIndex = 0;
		
		for( var i in current.groups )
		{
			var appendHTML = '<div class="gridContainer"><div data-menuid="' + current.groups[i].id + '" class="gridItem"><div class="title">' + current.groups[i].name + '</div><div class="graphIcon graphIcon-group"> </div><div class="slidingMenu';
			if( menu.IsGroupGraphable( current.groups[i].id ) )
				appendHTML += ' smGroup"><a href="#" class="smIconGrid"></a>';
			else appendHTML += '">';
			appendHTML += '<a href="#" class="smIconEdit"></a><a href="#" class="smIconDelete"></div></div></div>';
			$( pages[ Math.floor( itemIndex / GraphApp.TILES_PER_PAGE ) ] ).append( appendHTML );
			itemIndex++;
		}
		for( var i in current.graphs )
		{
			var icons = [ "" , "" , "graphIcon-line" , "graphIcon-bar" , "graphIcon-pie" , "graphIcon-ds" , "graphIcon-map" , "graphIcon-gauge" , "graphIcon-areagraph" ];
			$( pages[ Math.floor( itemIndex / GraphApp.TILES_PER_PAGE ) ] ).append( '<div class="gridContainer"><div data-menuid="' + current.graphs[i].id + '" class="gridItem"><div class="title">' + current.graphs[i].name + '</div><div class="graphIcon ' + icons[ current.graphs[i].type ] + '"> </div>'
			                                                + '<div class="slidingMenu"><a href="#" class="smIconEdit"></a><a href="#" class="smIconDelete"></a></div></div></div>' );
			itemIndex++;
		}
		
		// Add Button
		$( pages[ Math.floor( itemIndex / GraphApp.TILES_PER_PAGE ) ] ).append( '<div class="gridContainer"><a class="ui-btn ui-btn-icon-notext ui-icon-plus gridItem" href="#menuAddPopup" id="menuAddGraph" data-rel="popup" data-position-to="window"> </a></div>' );
		
		container.enhanceWithin();
		
		if( menuCurrentPage < menuPageCount - 1 ) $( "#menuPage #menuNext" )[0].style.visibility = "visible";
		else $( "#menuPage #menuNext" )[0].style.visibility = "hidden";
		if( menuCurrentPage > 0 ) $( "#menuPage #menuPrev" )[0].style.visibility = "visible";
		else $( "#menuPage #menuPrev" )[0].style.visibility = "hidden";
	}
	
	return {
		GetMenu : GetMenu,
		UnloadMenu : UnloadMenu,
		LoadMenuFromDB : LoadMenuFromDB,
		Create : Create,
		RenderMenu : RenderMenu
	};
	
} )( jQuery );