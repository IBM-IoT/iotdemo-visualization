
function CMap( parent , options )
{
	this.aspectRatio = 0;
	this.options = options;
	
	this.container = $( parent );
	this.innerContainer = $( '<div class="mainContainer" style="width:100%;height:100%"></div>' );
	this.container.append( this.innerContainer );
	
	this.innerContainer.append( '<div class="mapTitle">' + this.options.title + '</div>' );
	
	this.mapContainer = $( '<div style="width:100%;height:90%"></div>' );
	this.innerContainer.append( this.mapContainer );
	
	this.innerContainer = this.innerContainer[0];
	this.mapContainer = this.mapContainer[0];
	
	this.data = null;
	this.map = null;
	this.mapInitDone = false;
	this.mapCenter = null;
	this.mapBounds = null;
	
	if( window.google && window.google.maps ) this.InitMap();
	else
	{
		CMap.GMapQueue.push( this );
		
		if( !CMap.GMapRequested )
		{
			CMap.GMapRequested = true;
			$( "head" ).append( '<script type="text/javascript" src="https://maps.googleapis.com/maps/api/js?v=3.exp&sensor=false&callback=CMap.GMapCallback"></script>' );
		}
	}
}

CMap.prototype.Disable = function() {
	
	if( this.map == null ) return;
	
	console.log( "CMap :: Disable" );
	
	this.map.setOptions( {
		scrollwheel : false
	} );
};

CMap.prototype.Resize = function() {
	
	if( this.mapInitDone )
	{
		google.maps.event.trigger( this.map , "resize" );
	}
	
	var cWidth = this.container.width(), cHeight = this.container.height();
	var title = $( this.innerContainer ).find( ".mapTitle" );
	
	title.css( "font-size" , Math.floor( cHeight / 15 ) + "px" );
};

CMap.prototype.InitMap = function() {
	
	var mapOptions = {
	    zoom: 13,
	    center: new google.maps.LatLng(38.92525,-94.77046),
	    disableDefaultUI: true,
	    draggable: true,
	    disableDoubleClickZoom: true
	};
	
	this.map = new google.maps.Map( this.mapContainer , mapOptions );
	
	// Can't believe I have to do this...
	setTimeout( ( function() { 
		google.maps.event.trigger( this.map , "resize" );
		this.CenterMap();
	} ).bind( this ) , 1000 );
	
	this.mapInitDone = true;
	if( this.data ) this.PlaceMarkers();
};

CMap.prototype.Init = function( query , queryParams , queryDB ) {
	
	this.data = null;
	
	GraphApp.DB.SQLQuery( {
		sql : GraphApp.DB.BuildQuery( query , queryParams ),
		success : this.RecvData.bind( this ),
		db : queryDB,
		limit : this.options.elementCount
	} );
};

CMap.prototype.RecvData = function( data , status , xhr ) {
	
	this.data = data;
	
	if( this.mapInitDone ) this.PlaceMarkers();
};

CMap.prototype.PlaceMarkers = function() {
	
	if( this.data.length < 1 ) return;
	
	this.mapBounds = new google.maps.LatLngBounds();
	
	for( var i = 0; i < this.data.length; i++ )
	{
		var latlng = new google.maps.LatLng( this.data[i].latitude , this.data[i].longitude );
		
		new google.maps.Marker( {
			position : latlng,
			map : this.map
		} );
		
		this.mapBounds.extend( latlng );
	}
	
	this.mapCenter = this.mapBounds.getCenter();
	this.CenterMap();
};

CMap.prototype.CenterMap = function() {
	if( !this.mapCenter ) return;
	
	this.map.setCenter( this.mapCenter );
	this.map.fitBounds( this.mapBounds );
};

CMap.GMapQueue = [];
CMap.GMapRequested = false;
CMap.GMapCallback = function() {
	
	for( var i = 0; i < CMap.GMapQueue.length; i++ )
		CMap.GMapQueue[i].InitMap();
};
