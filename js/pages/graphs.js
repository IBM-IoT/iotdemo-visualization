var GraphApp = GraphApp || {};

GraphApp.Graphs = ( function( $ ) {

	var ItemType = {
		GROUP : 1,
		GRAPH : 2,
		BARGRAPH : 3,
		PIEGRAPH : 4,
		DATASHEET : 5,
		MAP : 6,
		GAUGE : 7,
		AREAGRAPH : 8
	};

	var itemType = ItemType.GROUP;
	var itemNames = [ "" , "Group" , "Line Graph" , "Bar Graph" , "Pie Chart" , "Data Sheet" , "Google Map" , "Gauge" , "Area Line Graph" ];
	var editingGraph = null;
	var editingQuery = -1;
	
	function SetItemType( newItemType ) { itemType = newItemType; }
	
	function PageCreate()
	{
		$( "#addGraphGaugeActionAlways" ).slider();
		
		$( "#addItemAdd" ).on( "tap" , AddButtonClick );
		$( document ).on( "tap" , "#addGraphGraphs fieldset a:nth-of-type(1)" , SelectQuery );
		$( document ).on( "tap" , "#addGraphGraphs fieldset a:nth-of-type(2)" , DeleteQuery );
		$( "#addGraphAddAnother" ).on( "tap" , AddAnotherButtonClick );
		
		ResetForm();
	}
	
	function ResetForm()
	{
		// console.log( "Reset form." );
		editingGraph = null;
		
		$( "#addGraphError" ).hide();
		$( "#addGraphName" ).val( "" );
		
		$( "#addGraphAddAnother" ).parents( "div.ui-field-contain" ).hide();
		
		if( itemType == ItemType.GROUP )
		{
			$( "#addGraphGroupQueryLimit" ).val( "" );
		}
		if( itemType == ItemType.GRAPH || itemType == ItemType.AREAGRAPH )
		{
			$( "#addGraphAddAnother" ).parents( "div.ui-field-contain" ).show();
			$( "#addGraphMaxPoints" ).val( "1000" );
			$( "#addGraphInterval" ).val( "5" );
			$( "#addGraphMinY" ).val( "" );
			$( "#addGraphMaxY" ).val( "" );
			$( "#addGraphThreshold" ).val( "" );
		}
		else if( itemType == ItemType.BARGRAPH )
		{
			$( "#addGraphBarElemCount" ).val( "" );
			$( "#addGraphBarOrigin" ).val( "" );
			$( "#addGraphBarLow" ).val( "" );
			$( "#addGraphBarHigh" ).val( "" );
		}
		else if( itemType == ItemType.PIEGRAPH )
		{
			$( "#addGraphPieElemCount" ).val( "" );
		}
		else if( itemType == ItemType.DATASHEET )
		{
			$( "#addGraphDSElemCount" ).val( "" );
		}
		else if( itemType == ItemType.MAP )
		{
			$( "#addGraphMapElemCount" ).val( "" );
		}
		else if( itemType == ItemType.GAUGE )
		{
			$( "#addGraphGaugeInterval" ).val( "" );
			$( "#addGraphGaugeMin" ).val( "" );
			$( "#addGraphGaugeMax" ).val( "" );
			$( "#addGraphGaugeLowThreshold" ).val( "" );
			$( "#addGraphGaugeHighThreshold" ).val( "" );
			$( "#addGraphGaugeAction" ).val( "" );
			
			$( "#addGraphGaugeActionAlways" ).val( "no" );
			$( "#addGraphGaugeActionAlways" ).slider( "refresh" );
		}
		
		$( "#addGraphGraphs" ).empty();
		AddAnotherQuery();
		$( "#addGraphGraphs" ).enhanceWithin();
		$( "#addGraphDSContainer" ).show();
		
		$( "#addItemSettings > div" ).hide();
		var selectors = [ null , "#addItemGroup" , "#addItemGraph" , "#addItemBarGraph" , "#addItemPieChart" , "#addItemDataSheet" , "#addItemMap" , "#addItemGauge" , "#addItemGraph" ];
		if( selectors[ itemType ] )
		{
			$( selectors[ itemType ] ).show();
		}
			
		$( "#addItemTitle" ).text( "Add " + itemNames[ itemType ] );
		$( "#addItemAdd" ).text( "Add " + itemNames[ itemType ] );
	}
	
	function PopulateForm( graphID )
	{	
		var menu = GraphApp.Menu.GetMenu();
		var graph;
		if( menu.IsGroup( graphID ) ) itemType = ItemType.GROUP;
		else
		{
			graph = menu.FindGraphByID( graphID );
			itemType = graph.type;
		}
	
		ResetForm();
		editingGraph = graphID;
		
		if( itemType == ItemType.GROUP )
		{
			$( "#addGraphName" ).val( menu.menu[ graphID ].name );
			if( menu.menu[ graphID ].config )
			{
				$( "#addGraphGroupQueryLimit" ).val( menu.menu[ graphID ].config.limit || "" );
				SetQuery( 0 , menu.menu[ graphID ].config.queries[0].queryid.$oid , GraphApp.Queries.GetQueries()[ menu.menu[ graphID ].config.queries[0].queryid.$oid ].name );
			}
		}
		else
		{
			$( "#addGraphName" ).val( graph.name );
			
			if( graph.type == ItemType.GRAPH || graph.type == ItemType.AREAGRAPH )
			{
				$( "#addGraphMaxPoints" ).val( graph.config.maxPoints );
				$( "#addGraphInterval" ).val( graph.config.interval / 1000 );
				$( "#addGraphMinY" ).val( graph.config.miny === undefined ? "" : graph.config.miny );
				$( "#addGraphMaxY" ).val( graph.config.maxy === undefined ? "" : graph.config.maxy );
				$( "#addGraphThreshold" ).val( graph.config.threshold === undefined ? "" : graph.config.threshold );
			}
			else if( graph.type == ItemType.BARGRAPH )
			{
				$( "#addGraphBarElemCount" ).val( graph.config.elems );
				$( "#addGraphBarOrigin" ).val( graph.config.origin === undefined ? "" : graph.config.origin );
				$( "#addGraphBarLow" ).val( graph.config.low === undefined ? "" : graph.config.low );
				$( "#addGraphBarHigh" ).val( graph.config.high === undefined ? "" : graph.config.high );
			}
			else if( graph.type == ItemType.PIEGRAPH )
			{
				$( "#addGraphPieElemCount" ).val( graph.config.elems );
			}
			else if( graph.type == ItemType.DATASHEET )
			{
				$( "#addGraphDSElemCount" ).val( graph.config.elems || "" );
			}
			else if( graph.type == ItemType.MAP )
			{
				$( "#addGraphMapElemCount" ).val( graph.config.elems || "" );
			}
			else if( graph.type == ItemType.GAUGE )
			{
				$( "#addGraphGaugeInterval" ).val( graph.config.interval );
				$( "#addGraphGaugeMin" ).val( graph.config.min );
				$( "#addGraphGaugeMax" ).val( graph.config.max );
				$( "#addGraphGaugeLowThreshold" ).val( graph.config.lowThreshold === undefined ? "" : graph.config.lowThreshold );
				$( "#addGraphGaugeHighThreshold" ).val( graph.config.highThreshold === undefined ? "" : graph.config.highThreshold );
				$( "#addGraphGaugeAction" ).val( graph.config.action || "" );
				
				$( "#addGraphGaugeActionAlways" ).val( ( graph.config.actionAlways !== undefined && graph.config.actionAlways == true ) ? "yes" : "no" );
				$( "#addGraphGaugeActionAlways" ).slider( "refresh" );
			}
			
			$( "#addGraphGraphs" ).empty();
			for( var i = 0; i < graph.config.queries.length; i++ )
			{
				AddAnotherQuery();
				SetQuery( i , graph.config.queries[i].queryid.$oid , GraphApp.Queries.GetQueries()[ graph.config.queries[i].queryid.$oid ].name );
			}
			$( "#addGraphGraphs" ).enhanceWithin();
		}
		
		$( "#addItemTitle" ).text( "Edit " + itemNames[ itemType ] );
		
		$( "#addItemAdd" ).text( "Save Changes" );
	}
	
	function AddAnotherQuery()
	{
		var count = $( "#addGraphGraphs fieldset" ).length;
		var legend = " ";
		if( count == 0 )
		{
			legend = "Data Series: ";
			if( itemType != ItemType.GROUP )
				legend = '<span class="req">*</span> ' + legend;
		}
		$( "#addGraphGraphs" ).append( '<div class="ui-field-contain"><fieldset data-role="controlgroup" data-type="horizontal">' +
		                               '<legend>' + legend + '</legend><a href="#selectQueryPage" class="ui-btn ui-btn-icon-left ui-icon-bars addGraphSelect">Select</a>' +
									   '<a href="#" class="ui-btn ui-btn-icon-notext ui-icon-delete">Delete</a></fieldset></div>' );
	}
	
	function AddButtonClick()
	{
		var inputErrors = [];
	
		var name = $( "#addGraphName" ).val().trim();
		var graphConfig = "";
		
		if( name.length < 1 ) inputErrors.push( "Please enter a name." ); 
		
		var graphData = $( "#addGraphGraphs a.addGraphSelect" );
		var graphInserts = [];
		
		for( var i = 0; i < graphData.length; i++ )
		{
			var qid = $( graphData[i] ).attr( "data-qid" );
			if( !qid )
			{
				if( itemType != ItemType.GROUP ) inputErrors.push( "Data Series #" + ( i + 1 ) + " needs to be selected or created." );
			}
			else graphInserts.push( '{"queryid":{"$oid":"' + qid + '"}}' );
		}
		
		if( graphInserts.length > 0 )
			graphConfig = ',"config":{"queries":[' + graphInserts.join( "," ) + ']';
	
		if( itemType == ItemType.GROUP )
		{
			var queryLimit = parseInt( $( "#addGraphGroupQueryLimit" ).val().trim() );
			
			if( graphInserts.length > 0 )
			{
				if( isNaN( queryLimit ) ) inputErrors.push( "Please insert a limit." );
				else
				{
					if( queryLimit < 1 ) inputErrors.push( "Please insert a valid limit." );
					else if( queryLimit > 5 ) inputErrors.push( "Are you insane?" );
					
					graphConfig += ',"limit":' + queryLimit;
				}
			}
		}
		else if( itemType == ItemType.GRAPH || itemType == ItemType.AREAGRAPH )
		{
			var maxPoints = parseInt( $( "#addGraphMaxPoints" ).val() );
			var interval = parseInt( $( "#addGraphInterval" ).val() );
			var miny = parseFloat( $( "#addGraphMinY" ).val() );
			var maxy = parseFloat( $( "#addGraphMaxY" ).val() );
			var threshold = $( "#addGraphThreshold" ).val().trim();
			if( threshold.length > 0 ) threshold = parseInt( threshold );
			else threshold = null;
			
			if( isNaN( maxPoints ) || maxPoints < 3 ) inputErrors.push( "Graph requires at least 3 data points." );
			if( isNaN( interval ) || interval < 1 ) inputErrors.push( "Please enter an interval greater than 0s." );
			
			if( !isNaN( miny ) )
			{
				if( !isNaN( maxy ) && maxy <= miny ) inputErrors.push( "Maximum Y cannot be lower or equal to the Minimum Y." );
			}
			
			if( threshold != null && isNaN( threshold ) ) inputErrors.push( "Invalid threshold." );
			
			graphConfig += ',"maxPoints":' + maxPoints + ',"interval":' + ( interval * 1000 );
			if( !isNaN( miny ) ) graphConfig += ',"miny":' + miny;
			if( !isNaN( maxy ) ) graphConfig += ',"maxy":' + maxy;
			if( threshold !== null ) graphConfig += ',"threshold":' + threshold;
		}
		else if( itemType == ItemType.BARGRAPH )
		{
			var elementCount = parseInt( $( "#addGraphBarElemCount" ).val().trim() );
			var origin = parseInt( $( "#addGraphBarOrigin" ).val() );
			var low = parseInt( $( "#addGraphBarLow" ).val() );
			var high = parseInt( $( "#addGraphBarHigh" ).val() );
			
			if( isNaN( elementCount ) ) inputErrors.push( "Please enter a valid number of elements." );
			else if( elementCount < 1 ) inputErrors.push( "A bar graph requires at least 1 element." );
			
			if( !isNaN( origin ) ) graphConfig += ',"origin":' + origin;
			else origin = 0;
			if( !isNaN( low ) && low > origin ) inputErrors.push( "Low must be less than or equal to the origin ( " + origin + " )" );
			if( !isNaN( high ) && high < origin ) inputErrors.push( "High must be greater than or equal to the origin ( " + origin + " )" );
			if( !isNaN( low ) && !isNaN( high ) && high <= low ) inputErrors.push( "High cannot be lower than or equal the Low." );
			
			graphConfig += ',"elems":' + elementCount;
			if( !isNaN( low ) ) graphConfig += ',"low":' + low;
			if( !isNaN( high ) ) graphConfig += ',"high":' + high;
		}
		else if( itemType == ItemType.PIEGRAPH )
		{
			var elementCount = parseInt( $( "#addGraphPieElemCount" ).val().trim() );
			
			if( isNaN( elementCount ) ) inputErrors.push( "Please enter a valid number of elements." );
			else if( elementCount < 2 ) inputErrors.push( "A pie chart requires at least 2 elements." );
			
			graphConfig += ',"elems":' + elementCount;
		}
		else if( itemType == ItemType.DATASHEET )
		{
			var elementCount = parseInt( $( "#addGraphDSElemCount" ).val().trim() );
			
			if( !isNaN( elementCount ) )
			{
				if( elementCount < 1 ) inputErrors.push( "Number of elements can't be lower than 1." );
				graphConfig += ',"elems":' + elementCount;
			}
		}
		else if( itemType == ItemType.MAP )
		{
			var elementCount = parseInt( $( "#addGraphMapElemCount" ).val().trim() );
			
			if( !isNaN( elementCount ) )
			{
				if( elementCount < 1 ) inputErrors.push( "A map requires at least 1 element." );
				graphConfig += ',"elems":' + elementCount;
			}
		}
		else if( itemType == ItemType.GAUGE )
		{
			var interval = parseInt( $( "#addGraphGaugeInterval" ).val() );
			var min = parseInt( $( "#addGraphGaugeMin" ).val() );
			var max = parseInt( $( "#addGraphGaugeMax" ).val() );
			var lowThreshold = parseInt( $( "#addGraphGaugeLowThreshold" ).val() );
			var highThreshold = parseInt( $( "#addGraphGaugeHighThreshold" ).val() );
			var action = $( "#addGraphGaugeAction" ).val().trim();
			var actionAlways = ( $( "#addGraphGaugeActionAlways" )[0].selectedIndex == 1 );
			
			if( isNaN( interval ) ) inputErrors.push( "Please enter an interval." );
			else if( interval < 1 ) inputErrors.push( "Minimum interval is 1 second." );
			
			if( isNaN( min ) ) inputErrors.push( "Please enter a minimum value." );
			if( isNaN( max ) ) inputErrors.push( "Please enter a maximum value. ");
			else if( max <= min ) inputErrors.push( "The maximum value cannot be lower than or equal to the minimum value." );
			
			if( !isNaN( lowThreshold ) && !isNaN( highThreshold ) && highThreshold <= lowThreshold )
				inputErrors.push( "The high threshold cannot be lower than or equal to the low threhsold." );
			
			graphConfig += ',"interval":' + interval + ',"min":' + min + ',"max":' + max;
			if( !isNaN( lowThreshold ) ) graphConfig += ',"lowThreshold":' + lowThreshold;
			if( !isNaN( highThreshold ) ) graphConfig += ',"highThreshold":' + highThreshold;
			
			if( action.length > 0 )
			{
				graphConfig += ',"action":"' + action + '","actionAlways":' + ( actionAlways ? "true" : "false" );
			}
		}
		
		graphConfig += '}';
		
		if( inputErrors.length > 0 )
		{
			GraphApp.Main.DisplaySlidingError( "#addGraphError" , inputErrors.join( "<br>" ) );
			return;
		}
	
		var insertData = '{"userid":{"$oid":"' + GraphApp.Main.GetUserInfo().uuid + '"},"name":"' + name + '","type":' + itemType;
		var menu = GraphApp.Menu.GetMenu();
		if( menu.currentGroup != "root" ) insertData += ',"parentid":{"$oid":"' + menu.currentGroup + '"}';
		insertData += graphConfig + '}';
		
//		console.log( insertData );
		if( editingGraph ) GraphApp.DB.DoREST( "graphs" , "PUT" , 'query={"_id":{"$oid":"' + editingGraph + '"}}' , insertData , Callback );
		else GraphApp.DB.DoREST( "graphs" , "POST" , null , insertData , Callback );
		$.mobile.loading( "show" );
	}
	
	function Callback( data , status , xhr )
	{
		if( data && data.ok === true ) // Success
		{
			var menu = GraphApp.Menu.GetMenu();
			menu.LoadGroup( GraphApp.Main.GetUserInfo().uuid , menu.currentGroup , Done );
		}
		else
		{
			// error
			$.mobile.loading( "hide" );
		}
	}
	
	function Done()
	{
		$.mobile.loading( "hide" );
		$.mobile.navigate( "#menuPage" );
	}
	
	function SelectQuery()
	{
		editingQuery = $( "#addGraphGraphs fieldset" ).index( $( this ).parents( "fieldset" ) );
		var id = $( this ).attr( "data-qid" ) || null;
		GraphApp.Queries.ManagerOpenSelect( GraphApp.Queries.itemQueryTypes[ itemType ] , SelectQueryCallback , id );
	}
	
	function SelectQueryCallback( id , query )
	{
		if( id ) SetQuery( editingQuery , id , query.name );
		$.mobile.navigate( "#addGraphPage" );
	}
	
	function DeleteQuery()
	{
		console.log( "Deleting...", $( "#addGraphGraphs fieldset" ).length );
		if( $( "#addGraphGraphs fieldset" ).length < 2 ) return;
		$( this ).parents( ".ui-field-contain" ).remove();
	}
	
	function AddAnotherButtonClick()
	{
		AddAnotherQuery();
		$( "#addGraphGraphs" ).enhanceWithin();
	}
	
	function SetQuery( id , qid , name )
	{
		if( id === null ) id = editingQuery;
	
		var anchor = $( "#addGraphGraphs fieldset:eq(" + id + ") a.addGraphSelect" );
		anchor.attr( "data-qid" , qid );
		anchor.text( name );
	}
	
	return {
		ItemType : ItemType,
		itemNames : itemNames,
	
		SetItemType : SetItemType,
		PageCreate : PageCreate,
		ResetForm : ResetForm,
		PopulateForm : PopulateForm,
		SetQuery : SetQuery
	};

} )( jQuery );