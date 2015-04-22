var GraphApp = GraphApp || {};

GraphApp.GraphView = ( function( $ ) {

	var LayoutType = {
		VERTICAL : 0,
		HORIZONTAL : 1,
		EDIT : 2,
		CUSTOM : 3
	};
	
	var layoutType = LayoutType.VERTICAL;
	var layoutIconClasses = [ "ui-icon-my-panels-v" , "ui-icon-my-panels-h" , "ui-icon-edit" , "ui-icon-user" ];
	
	var groupQueryInfo = null;
	var groupID = null;
	var graphs = null;
	
	var panels = null;
	var focusedPanel = null;
	
	var dragInfo = null;
	var snapEnabled = true;
	var snapSize = 0.05;
	var keepAspectRatio = false;
	
	function SetSnapSize( newSize ) { snapSize = newSize; }
	
	function GraphPageCreate( event )
	{
		$( "#graphPageBack" ).on( "click" , BackButtonClick );
		$( "#graphPagePause" ).on( "click" , GraphPagePauseButtonClick );
		$( "#graphPageLayoutPopup button" ).on( "click" , LayoutButtonsClick );
		$( "#graphPageLayoutSnap" ).on( "click" , LayoutSnapClick );
		$( "#graphPageLayoutRatio" ).on( "click" , LayoutRatioClick );
		$( "#graphPageLayoutDone" ).on( "click" , LayoutDoneClick );
		
		var hopt = {
			preventDefault : false,
			dragMinDistance : 1
		};
		
		$( document ).hammer( hopt ).on( "dragstart" , "#graphPage .editablePanel, #graphPage .resizer" , PanelDragStart );
		$( document ).hammer( hopt ).on( "dragend" , function() { dragInfo = null; } );
		$( document ).hammer( hopt ).on( "drag" , PanelDrag );
		
		window.addEventListener( "resize" , ResizePage );
	}
	
	function Graph( id )
	{
		CleanUp();
		$.mobile.navigate( "#graphPage" );
		
		var menu = GraphApp.Menu.GetMenu();
		
		if( menu.IsGroup( id ) )
		{
			groupID = id;
			var groups = menu.GetGroups( id );
			var queryGroups = [];
			
			for( var i = 0; i < groups.length; i++ )
				if( groups[i].config && groups[i].config.queries )
					queryGroups.push( groups[i] );
			
			groupQueryInfo = {
				needed : queryGroups.length,
				current : 0,
				graphs : menu.GetGraphsRecursive( id )
			};
			
			if( queryGroups.length > 0 )
			{
				var queries = GraphApp.Queries.GetQueries();
				for( var i = 0; i < queryGroups.length; i++ )
				{
					var query = queries[ queryGroups[i].config.queries[0].queryid.$oid ];
					GraphApp.DB.SQLQuery( { 
						sql : query.query,
						db : GraphApp.HostMgr.GetHost( query.hostid.$oid ),
						success : GroupQueryCallback.bind( queryGroups[i] ),
						limit : queryGroups[i].config.limit
					} );
				}
			}
			else RenderGraphPage( groupQueryInfo.graphs );
			
		}
		else
		{
			groupID = null;
			RenderGraphPage( [ menu.menu[id] ] );
		}
	}
	
	function CleanUp()
	{
		$( "#graphContent" ).empty();
	}
	
	function GroupQueryCallback( data , status , xhr )
	{
		if( !groupQueryInfo ) return;
		
		if( !data || data.length < 1 )
		{
			groupQueryInfo = null;
			$.mobile.navigate( "#menuPage" );
			return;
		}
		
		this._queryParams = data;
		
		groupQueryInfo.current++;
		if( groupQueryInfo.current >= groupQueryInfo.needed )
		{
			RenderGraphPage( groupQueryInfo.graphs );
			groupQueryInfo = null;
		}
	}
	
	function RenderGraphPage( viewGraphs )
	{
		var menu = GraphApp.Menu.GetMenu();
		
		$( "#graphPagePause" ).hide();
		$( "#graphPagePause" ).removeClass( "ui-icon-my-pause ui-icon-my-play" );
		$( "#graphPagePause" ).addClass( "ui-icon-my-pause" );
		
		if( viewGraphs.length > 1 )
		{
			layoutType = LayoutType.VERTICAL;
			$( "#graphPageLayout" ).removeClass( layoutIconClasses.join( " " ) );
			$( "#graphPageLayout" ).addClass( "ui-icon-my-panels-v" );
			$( "#graphPageLayout" ).show();
		}
		else
		{
			$( "#graphPageLayout" ).hide();
		}
		
		var useLayout = ( viewGraphs.length > 1 && groupID != null && menu.menu[ groupID ].layout !== undefined && menu.menu[ groupID ].layout.length >= viewGraphs.length );
		if( useLayout )
		{
			SetLayout( LayoutType.CUSTOM );
			$( "#graphPageLayoutCustom" ).show();
		}
		else $( "#graphPageLayoutCustom" ).hide();
		
		snapEnabled = true;
		keepAspectRatio = false;
		if( $( "#graphPageLayoutSnap" ).hasClass( "ui-icon-my-snap-off" ) ) $( "#graphPageLayoutSnap" ).toggleClass( "ui-icon-my-snap-off ui-icon-my-snap-on" );
		if( $( "#graphPageLayoutRatio" ).hasClass( "ui-icon-my-ratio-on" ) ) $( "#graphPageLayoutRatio" ).toggleClass( "ui-icon-my-ratio-off ui-icon-my-ratio-on" );
		$( "#graphPageLayoutSnap" ).hide();
		$( "#graphPageLayoutRatio" ).hide();
		$( "#graphPageLayoutDone" ).hide();
		
		var queryParams = null;
		
		graphs = [];
		panels = [];
		
		var graphHeight = 1.0 / viewGraphs.length;
		for( var i = 0; i < viewGraphs.length; i++ )
		{
			queryParams = [{}];
			if( groupID != null && menu.menu[ viewGraphs[i].parent ].hasOwnProperty( "_queryParams" ) )
				queryParams = menu.menu[ viewGraphs[i].parent ]._queryParams;
			
			var renderTransform = {
				x : 0,
				y : graphHeight * i,
				w : 1.0,
				h : graphHeight
			};
			
			if( useLayout )
				renderTransform = menu.menu[ groupID ].layout[i];
			
			var panel = new GraphApp.CPanel( "panel_" + i , renderTransform );
			panel.title = viewGraphs[i].name;
			
			$( "#graphContent" ).append( panel.node );
			panels.push( panel );
			
			if( viewGraphs[i].type == GraphApp.Graphs.ItemType.GRAPH || viewGraphs[i].type == GraphApp.Graphs.ItemType.AREAGRAPH )
			{
				var graphData = {
					title : viewGraphs[i].name,
					xTitle : "",
					yTitle : "",
					xScale : {
						start : 0,
						end : viewGraphs[i].config.maxPoints,
						max : viewGraphs[i].config.maxPoints
					},
					yScale : {
						start : viewGraphs[i].config.miny === undefined ? null : viewGraphs[i].config.miny,
						end : viewGraphs[i].config.maxy === undefined ? null : viewGraphs[i].config.maxy,
						drawInterval : 1
					},
					tickInterval : viewGraphs[i].config.interval,
					smoothStepInterval : 50,
					pollInterval : Math.floor( viewGraphs[i].config.interval * 0.85 ),
					renderTransform : renderTransform,
					isAreaGraph : ( viewGraphs[i].type == GraphApp.Graphs.ItemType.GRAPH ? false : true )
				};
				
				if( viewGraphs[i].config.threshold !== undefined )
					graphData.yScale.threshold = viewGraphs[i].config.threshold;
				
				var newGraph = new CGraph( "#panel_" + i , graphData );
				graphs.push( newGraph );
				panel.graphs.push( newGraph );
				
				var queries = GraphApp.Queries.GetQueries();
				
				for( var j = 0; j < queryParams.length; j++ )
				{
					for( var k = 0; k < viewGraphs[i].config.queries.length; k++ )
					{
						var query = queries[ viewGraphs[i].config.queries[k].queryid.$oid ];
						var isStatic = ( query.cfg & 1 > 0 );
						
						// console.log( query );
						newGraph.AddGraph( FormatString( query.name , queryParams[j] ) , [] , null , query.timeoffset , isStatic );
						newGraph.graphs[ k + j * viewGraphs[i].config.queries.length ].Init( query.initQuery , query.mainQuery , queryParams[j] , GraphApp.HostMgr.GetHost( query.hostid.$oid ) );
					}
				}
				
				newGraph.Enable();
				
				$( "#graphPagePause" ).show();
			}
			else if( viewGraphs[i].type == GraphApp.Graphs.ItemType.MAP )
			{
				var graphData = {
					title : viewGraphs[i].name,
					elementCount : viewGraphs[i].config.elems,
					renderTransform : renderTransform
				};
				
				var newGraph = new CMap( "#panel_" + i , graphData );
				graphs.push( newGraph );
				panel.graphs.push( newGraph );
				
				var query = GraphApp.Queries.GetQueries()[ viewGraphs[i].config.queries[0].queryid.$oid ];
				
				newGraph.Init( query.query , null , GraphApp.HostMgr.GetHost( query.hostid.$oid ) );
			}
			else
			{
				for( var j = 0; j < queryParams.length; j++ )
				{
					var innerWidth = 1.0 / queryParams.length;
					var innerRT = {
						x : j * innerWidth,
						y : 0,
						w : innerWidth,
						h : 1.0
					};
					
					var innerPanel = new GraphApp.CPanel( "panel_" + i + "_" + j , innerRT , panel );
					
					panel.node.append( innerPanel.node );
					panel.children.push( innerPanel );
					
					if( viewGraphs[i].type == GraphApp.Graphs.ItemType.BARGRAPH )
					{
						var graphData = {
							title : FormatString( viewGraphs[i].name , queryParams[j] ),
							elementCount : viewGraphs[i].config.elems,
							origin : viewGraphs[i].config.origin || 0,
							yScale : {
								start : ( viewGraphs[i].config.low === undefined ? null : viewGraphs[i].config.low ),
								end : ( viewGraphs[i].config.high === undefined ? null : viewGraphs[i].config.high )
							},
							renderTransform : renderTransform
						};
						
						var newGraph = new CBarGraph( "#panel_" + i + "_" + j , graphData );
						graphs.push( newGraph );
						innerPanel.graphs.push( newGraph );
						var query = GraphApp.Queries.GetQueries()[ viewGraphs[i].config.queries[0].queryid.$oid ];
						newGraph.Init( query.query , queryParams[j] , GraphApp.HostMgr.GetHost( query.hostid.$oid ) );
					}
					else if( viewGraphs[i].type == GraphApp.Graphs.ItemType.PIEGRAPH )
					{
						var graphData = {
							title : FormatString( viewGraphs[i].name , queryParams[j] ),
							elementCount : viewGraphs[i].config.elems,
							renderTransform : renderTransform
						};
						
						var newGraph = new CPieGraph( "#panel_" + i + "_" + j , graphData );
						graphs.push( newGraph );
						innerPanel.graphs.push( newGraph );
						var query = GraphApp.Queries.GetQueries()[ viewGraphs[i].config.queries[0].queryid.$oid ];
						newGraph.Init( query.query , queryParams[j] , GraphApp.HostMgr.GetHost( query.hostid.$oid ) );
					}
					else if( viewGraphs[i].type == GraphApp.Graphs.ItemType.DATASHEET )
					{
						var graphData = {
							title : FormatString( viewGraphs[i].name , queryParams[j] ),
							elementCount : viewGraphs[i].config.elems || null,
							renderTransform : renderTransform
						};
						
						var newGraph = new CDataSheet( "#panel_" + i + "_" + j , graphData );
						graphs.push( newGraph );
						innerPanel.graphs.push( newGraph );
						var query = GraphApp.Queries.GetQueries()[ viewGraphs[i].config.queries[0].queryid.$oid ];
						newGraph.Init( query.query , queryParams[j] , GraphApp.HostMgr.GetHost( query.hostid.$oid ) );
					}
					else if( viewGraphs[i].type == GraphApp.Graphs.ItemType.GAUGE )
					{
						var query = GraphApp.Queries.GetQueries()[ viewGraphs[i].config.queries[0].queryid.$oid ];
						
						var graphData = {
							title : FormatString( viewGraphs[i].name , queryParams[j] ),
							renderTransform : renderTransform,
							units : query.units,
							tickInterval : viewGraphs[i].config.interval * 1000,
							min : viewGraphs[i].config.min,
							max : viewGraphs[i].config.max,
							lowThreshold : viewGraphs[i].config.lowThreshold,
							highThreshold : viewGraphs[i].config.highThreshold,
						};
						
						if( viewGraphs[i].config.action !== undefined && viewGraphs[i].config.actionAlways !== undefined )
						{
							graphData.action = {
								url : viewGraphs[i].config.action,
								always : viewGraphs[i].config.actionAlways
							};
						}
						
						var newGraph = new CGauge( "#panel_" + i + "_" + j , graphData );
						graphs.push( newGraph );
						innerPanel.graphs.push( newGraph );
						
						newGraph.Init( query.query , queryParams[j] , GraphApp.HostMgr.GetHost( query.hostid.$oid ) );
					}
				}
			}
		}
		
		ResizePage();
	}
	
	function BackButtonClick()
	{
		if( focusedPanel )
		{
			for( var i = 0; i < panels.length; i++ )
				panels[i].node.show();
			
			$( "#graphPageLayout" ).show();
			
			focusedPanel.Unfocus();
			focusedPanel = null;
		}
		else $.mobile.navigate( "#menuPage" );
	}
	
	function GraphPagePauseButtonClick()
	{
		var resume = graphs[0].isPaused;
		$( this ).removeClass( "ui-icon-my-pause ui-icon-my-play" );
		if( resume )
		{
			$( this ).text( "Pause" );
			$( this ).addClass( "ui-icon-my-pause" );
		}
		else
		{
			$( this ).text( "Resume" );
			$( this ).addClass( "ui-icon-my-play" );
		}
	
		for( var i = 0; i < graphs.length; i++ )
		{
			if( !( graphs[i] instanceof CGraph ) ) continue;
		
			if( resume ) graphs[i].Resume();
			else graphs[i].Pause();
		}
	}
	
	function LayoutButtonsClick( event )
	{
		var newLayout = $( "#graphPageLayoutPopup button" ).index( $( this ) );
		
		$( "#graphPageLayoutPopup" ).popup( "close" );
		if( layoutType == newLayout ) return;
		
		SetLayout( newLayout );
		
		if( layoutType == LayoutType.VERTICAL )
		{
			for( var i = 0; i < panels.length; i++ )
			{
				var panelHeight = 1.0 / panels.length;
				panels[i].renderTransform = {
					x : 0,
					y : i * panelHeight,
					w : 1.0,
					h : panelHeight
				};
			}
		}
		else if( layoutType == LayoutType.HORIZONTAL )
		{
			for( var i = 0; i < panels.length; i++ )
			{
				var panelWidth = 1.0 / panels.length;
				panels[i].renderTransform = {
					x : i * panelWidth,
					y : 0.0,
					w : panelWidth,
					h : 1.0
				};
			}
		}
		else if( layoutType == LayoutType.EDIT )
		{
			$( "#graphPage .CGraph > div" ).hide();
			
			for( var i = 0; i < panels.length; i++ )
			{
				$( panels[i].node ).append( '<div class="editablePanel" data-gid="' + i + '">' + panels[i].title + '<div class="resizer"></div></div>' );
			}
			
			$( "#graphPageLayout" ).hide();
			$( "#graphPageLayoutSnap" ).show();
			$( "#graphPageLayoutRatio" ).show();
			$( "#graphPageLayoutDone" ).show();
		}
		else if( layoutType == LayoutType.CUSTOM )
		{
			var menu = GraphApp.Menu.GetMenu();
			for( var i = 0; i < panels.length; i++ )
			{
				panels[i].renderTransform = menu.menu[ groupID ].layout[i]; 
			}
		}
		
		if( layoutType != LayoutType.EDIT ) ResizePage();
	}
	
	function LayoutSnapClick()
	{
		snapEnabled = !snapEnabled;
		$( "#graphPageLayoutSnap" ).toggleClass( "ui-icon-my-snap-off ui-icon-my-snap-on" );
	}
	
	function LayoutRatioClick()
	{
		keepAspectRatio = !keepAspectRatio;
		$( "#graphPageLayoutRatio" ).toggleClass( "ui-icon-my-ratio-off ui-icon-my-ratio-on" );
	}
	
	function LayoutDoneClick( event )
	{
		dragInfo = null;
		SetLayout( LayoutType.CUSTOM );
		
		$( "#graphPage .CGraph > div" ).show();
		$( "#graphPage .editablePanel" ).remove();
		$( "#graphPageLayout" ).show();
		$( "#graphPageLayoutSnap" ).hide();
		$( "#graphPageLayoutRatio" ).hide();
		$( "#graphPageLayoutDone" ).hide();
		
		ResizePage();
		
		SaveCurrentLayout();
	}
	
	function PanelDragStart( event )
	{
		if( event.gesture === undefined ) return;
		
		dragInfo = {
			target : null,
			x : 0,
			y : 0,
			w : 0,
			h : 0,
			resize : $( this ).hasClass( "resizer" )
		};
		
		if( dragInfo.resize ) dragInfo.target = panels[ parseInt( $( this ).parents( ".editablePanel" ).attr( "data-gid" ) ) ];
		else dragInfo.target = panels[ parseInt( $( this ).attr( "data-gid" ) ) ];
		
		if( dragInfo.target === null ) return;
		
		$( "#graphPage .CGraph" ).css( "z-index" , "auto" );
		$( dragInfo.target.node ).css( "z-index" , "50" );
		
		dragInfo.x = dragInfo.target.renderTransform.x;
		dragInfo.y = dragInfo.target.renderTransform.y;
		dragInfo.w = dragInfo.target.renderTransform.w;
		dragInfo.h = dragInfo.target.renderTransform.h;
		
		event.stopPropagation();
	}
	
	function PanelDrag( event )
	{
		if( !dragInfo || dragInfo.target == null ) return;
		if( event.gesture === undefined ) return;
		
		if( dragInfo.resize )
		{
			var w = dragInfo.w + event.gesture.deltaX / window.innerWidth; 
			if( snapEnabled ) w = Math.round( w / snapSize ) * snapSize;
			if( w < 0.05 ) w = 0.05;
			else if( w > 1.0 - dragInfo.x ) w = 1.0 - dragInfo.x;
			var h = dragInfo.h + event.gesture.deltaY / window.innerHeight;
			if( snapEnabled ) h = Math.round( h / snapSize ) * snapSize;
			if( h < 0.05 ) h = 0.05;
			else if( h > 1.0 - dragInfo.y ) h = 1.0 - dragInfo.y;
			
			var aspectRatio = dragInfo.target.GetAspectRatio();
			//console.log( "Aspect: " + aspectRatio );
			if( keepAspectRatio && aspectRatio != 0 )
			{
				aspectRatio *= window.innerHeight / window.innerWidth;
				if( w / h > aspectRatio ) w = h * aspectRatio;
				else h = w / aspectRatio;
			}
			
			dragInfo.target.renderTransform.w = w;
			dragInfo.target.renderTransform.h = h;
		}
		else
		{
			var x = dragInfo.x + event.gesture.deltaX / window.innerWidth; 
			if( snapEnabled ) x = Math.round( x / snapSize ) * snapSize;
			if( x < 0 ) x = 0;
			else if( x > 1.0 - dragInfo.w ) x = 1.0 - dragInfo.w;
			var y = dragInfo.y + event.gesture.deltaY / window.innerHeight; 
			if( snapEnabled ) y = Math.round( y / snapSize ) * snapSize;
			if( y < 0 ) y = 0;
			else if( y > 1.0 - dragInfo.h ) y = 1.0 - dragInfo.h;
			
			dragInfo.target.renderTransform.x = x;
			dragInfo.target.renderTransform.y = y;
		}
		
		dragInfo.target.Resize();
		
		event.stopPropagation();
	}
	
	function GraphPageDisableGraphs()
	{
		if( !graphs ) return;
		for( var i = 0; i < graphs.length; i++ )
			if( graphs[i].Disable !== undefined )
				graphs[i].Disable();
	}
	
	function SetLayout( newLayout )
	{
		$( "#graphPageLayout" ).removeClass( layoutIconClasses[ layoutType ] );
		layoutType = newLayout;
		$( "#graphPageLayout" ).addClass( layoutIconClasses[ layoutType ] );
	}
	
	function SaveCurrentLayout()
	{
		var layoutData = [];
		for( var i = 0; i < panels.length; i++ )
			layoutData.push( panels[i].renderTransform );
		
		var menu = GraphApp.Menu.GetMenu();
		menu.menu[ groupID ].layout = layoutData;
		
		GraphApp.DB.DoREST( "graphs" , "PUT" , 'query={"_id":{"$oid":"' + groupID + '"}}' , '{"$set":{"layout":' + JSON.stringify( layoutData ) + '}}' , null );
		
		$( "#graphPageLayoutCustom" ).show();
	}
	
	function ResizePage()
	{
		if( !panels ) return;
		if( GraphApp.Main.GetCurrentPage() != "graphPage" ) return;
		
		for( var i = 0; i < panels.length; i++ )
			panels[i].Resize();
	}
	
	function FocusPanel( panel )
	{
		if( focusedPanel !== null ) return;
		if( panels.length < 2 ) return;
		if( layoutType == LayoutType.EDIT ) return;
		
		for( var i = 0; i < panels.length; i++ )
			if( panels[i] !== panel ) panels[i].node.hide();
		
		panel.Focus();
		focusedPanel = panel;
		
		$( "#graphPageLayout" ).hide();
	}
	
	return {
		SetSnapSize : SetSnapSize,
		GraphPageCreate : GraphPageCreate,
		GraphPageDisableGraphs : GraphPageDisableGraphs,
		Graph : Graph,
		ResizePage : ResizePage,
		
		FocusPanel : FocusPanel
	};
	
} )( jQuery );

GraphApp.CPanel = function( id , renderTransform , parent ) {
	
	this.title = "";
	this.parent = parent || null;
	this.node = $( '<div class="CGraph" id="' + id + '"></div>' );
	this.renderTransform = renderTransform;
	
	this.children = [];
	this.graphs = [];
	
	if( !this.parent )
	{
		this.node.on( "doubletap" , this.OnDoubleTap.bind( this ) );
	}
};

GraphApp.CPanel.prototype.Resize = function() {
	
	var wWidth = this.parent ? this.parent.node.width() : window.innerWidth;
	var wHeight = this.parent ? this.parent.node.height() : window.innerHeight;
	
	this.node.css( "width" , ( this.renderTransform.w * wWidth ) + "px" );
	this.node.css( "height" , ( this.renderTransform.h * wHeight ) + "px" );
	this.node.css( "left" , ( this.renderTransform.x * wWidth ) + "px" );
	this.node.css( "top" , ( this.renderTransform.y * wHeight ) + "px" );
	
	for( var i = 0; i < this.children.length; i++ )
		this.children[i].Resize();
	
	for( var i = 0; i < this.graphs.length; i++ )
		this.graphs[i].Resize();
};

GraphApp.CPanel.prototype.OnDoubleTap = function( event ) {
	
	GraphApp.GraphView.FocusPanel( this );
};

GraphApp.CPanel.prototype.Focus = function() {
	
	this.originalRenderTransform = this.renderTransform;
	this.renderTransform = { x:0 , y:0 , w:1 , h:1 };
	
	this.Resize();
};

GraphApp.CPanel.prototype.Unfocus = function() {
	
	this.renderTransform = this.originalRenderTransform;
	this.Resize();
};

GraphApp.CPanel.prototype.GetAspectRatio = function() {
	if( this.children.length == 0 ) return this.graphs[0].aspectRatio;
	else return this.children[0].graphs[0].aspectRatio * this.children.length;
};