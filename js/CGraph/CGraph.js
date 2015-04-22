
function CGraph( parent , options )
{
	this.enabled = false;
	this.aspectRatio = 2.5;
	
//	Graph options
//	{
// 		title : Main Title,
//		xTitle : X-axis Title,
//		yTitle : Y-axis Title,
//		xScale : {
//			start : X scale start,
//			end : X scale end
//		},
//		yScale: {
//			start : Y scale start,
//			end : Y scale end,
//			drawInterval : Y scale interval lines
//		},
//		tickInterval : Expected graph interval
//		smoothStepInterval : Smooth animation interval ( default: 50 ),
//		pollInterval: The interval to poll the database for new data at
//
//		Specify the area to render the graph in using a normalized coordinate system
//		( 0,0 - top-left corner 1,1 - bottom-right corner )
//		renderTransform : {
//			x : ...,
//			y : ...,
//			w : ...,
//			h : ...
//		},
//	
//		isAreaGraph : True if this graph is an area line graph
//	}
	this.options = options;
	
	// Create container
	this.container = $( parent );
	this.innerContainer = $( '<div class="mainContainer"></div>' );
	this.container.append( this.innerContainer );
	
	// Create canvas and get context
	this.canvas = $( '<canvas width="100" height="100">' );
	this.innerContainer.append( this.canvas );
	
	// Create scale slider
	this.slider = $( '<div data-role="rangeslider" data-mini="true" style="width: 85%">' + 
					 '<input type="range" min="0" max="' + this.options.xScale.max + '" value="' + this.options.xScale.start + '" style="display:none">' +
					 '<input type="range" min="0" max="' + this.options.xScale.max + '" value="' + this.options.xScale.end + '" style="display:none"></div>' );
	
	this.innerContainer.append( this.slider );
	this.innerContainer.enhanceWithin();
	
	var findResult = this.slider.find( "input" );
	this.scaleSliderStart = $( findResult[0] );
	this.scaleSliderEnd = $( findResult[1] );
	
	this.canvas = this.canvas[0];
	this.innerContainer = this.innerContainer[0];
	
	this.ctx = this.canvas.getContext( "2d" );
	
	this.w = this.h = 100;
	
	this.isRendering = true;
	this.isPaused = false;
	this.isStatic = true;
	
	// Background image data
	// The background is only rendered at init/resize and stored in this buffer
	// for efficient? redraw
	this.bgBuffer = null;
	
	// Graph data array
	this.graphInitCount = 0;
	this.graphs = [];
	// Graph data array's maximum size
	this.graphDataMax = this.options.xScale.max + 2;
	this.newDataAvailable = 0;
	this.graphEndTimestamp = 0;
	
	this.CalculateRenderTSInterval();
	this.CalculateYInterval();
	
	// Smooth animation
	this.smoothStepInterval = ( this.options.smoothStepInterval === undefined ? 50 : this.options.smoothStepInterval );
	this.smoothStepMax = Math.floor( this.options.tickInterval / this.smoothStepInterval ) - 1;
	this.smoothStep = 0;
	this.smoothStepTimer = 0;
	this.graphTickTimer = 0;
	
	this.pollTimer = 0;
	
	this.gesture = {
		graphSize : 0,
		dragCenter : 0,
		dragSize : 0,
		isDragging : false,
		pinchLastTS : 0,
		pinchCenter : 0,
		pinchSize : 0
	};
	
	this.RenderLoading();
	
	// window.addEventListener( "onorientationchange" , this.Resize.bind( this ) );
	
	var gt = $( this.canvas );
	var hopt = {
		// dragMinDistance: 0,
		preventDefault: true
	};
	
	gt.hammer( hopt ).on( "dragstart" , this.GestureDragStart.bind( this ) );
	gt.hammer( hopt ).on( "dragleft dragright" , this.GestureHorizontalDrag.bind( this ) );
	gt.hammer( hopt ).on( "pinch" , this.GesturePinch.bind( this ) );
	// gt.hammer( hopt ).on( "dragright", this.GestureDragRight.bind( this ) );
}

CGraph.prototype.Disable = function() {
	
	if( !this.enabled ) return;
	clearInterval( this.interval_SmoothStep );
	this.smoothStep = 0;
	this.enabled = false;
};

CGraph.prototype.Enable = function() {
	
	if( this.enabled ) return;
	this.interval_SmoothStep = setInterval( this.DoSmoothStep.bind( this ) , this.smoothStepInterval );
	this.smoothStepTimer = ( new Date() ).getTime();
	this.enabled = true;
};

CGraph.prototype.Pause = function() { this.isPaused = true; };
CGraph.prototype.Resume = function() { this.isPaused = false; };

CGraph.prototype.Resize = function() {
	
	// Get new width and height
	var cWidth = this.container.width(), newWidth = cWidth;
	var cHeight = this.container.height(), newHeight = cHeight;
	
	// Force aspect ratio
	if( newWidth / newHeight > this.aspectRatio )
		newWidth = newHeight * this.aspectRatio;
	else
		newHeight = newWidth / this.aspectRatio;
	
	newWidth = Math.floor( newWidth );
	newHeight = Math.floor( newHeight );
	
	// Set internal canvas resolution
	this.canvas.width = newWidth;
	this.canvas.height = newHeight - 50;
	this.canvas.style.width = newWidth + "px";
	this.canvas.style.height = ( newHeight - 50 ) + "px";
	
	// Set container's style properties to position/scale it
	this.innerContainer.style.width = newWidth + "px";
	this.innerContainer.style.height = newHeight + "px";
	this.innerContainer.style.marginLeft = ( ( cWidth - newWidth ) / 2 ) + "px";
	this.innerContainer.style.marginTop = ( ( cHeight - newHeight ) / 2 ) + "px";
	
	// Shortcuts for width and height
	this.w = this.canvas.width;
	this.h = this.canvas.height;
	
	this.gesture.graphSize = this.w * 0.6;
	
	// Force background render
	this.bgBuffer = null;
	this.Render();
};

CGraph.prototype.RenderLoading = function() {

	this.ctx.textAlign = "center";
	this.ctx.textBaseline = "middle";
	this.ctx.font = ( this.canvas.width / 30 ) + "px Arial";
	this.ctx.fillStyle = "#777777";
	
	this.ctx.fillText( "Loading..." , 0.5 * this.w , 0.5 * this.h );
};

CGraph.prototype.RenderBG = function() {
	
	if( this.bgBuffer != null ) // If buffer available, use it
	{
		this.ctx.putImageData( this.bgBuffer , 0 , 0 );
		return;
	}
	
	this.ctx.clearRect( 0 , 0 , this.canvas.width , this.canvas.height );
	
	// Y interval lines/values
	if( this.options.yScale.start !== null && this.options.yScale.end !== null )
	{
		this.ctx.textAlign = "right";
		this.ctx.textBaseline = "middle";
		this.ctx.font = ( this.canvas.width / 70 ) + "px Arial";
		
		var interval = 0.8 / ( ( this.options.yScale.end - this.options.yScale.start ) / this.options.yScale.drawInterval );
		this.ctx.lineWidth = 1;
		this.ctx.strokeStyle = this.ctx.fillStyle = "#CCCCCC";
		this.ctx.beginPath();
		for( var i = 0.9 - interval, j = this.options.yScale.start + this.options.yScale.drawInterval; j < this.options.yScale.end; i -= interval, j += this.options.yScale.drawInterval )
		{
			this.ctx.moveTo( 0.1 * this.w , i * this.h );
			this.ctx.lineTo( 0.7 * this.w , i * this.h );
			
			this.ctx.fillText( j.toFixedIfGreater(2) , 0.095 * this.w , i * this.h );
		}
		this.ctx.stroke();
		
		// Y-axis scale
		this.ctx.fillStyle = "#777777";
		this.ctx.font = Math.floor( this.canvas.width / 57 ) + "px Arial";
		this.ctx.textAlign = "right";
		this.ctx.fillText( this.options.yScale.start.toFixedIfGreater(2) , 0.095 * this.w , 0.9 * this.h );
		this.ctx.fillText( this.options.yScale.end.toFixedIfGreater(2) , 0.095 * this.w , 0.1 * this.h );
	}
	
	// Main graph lines
	this.ctx.strokeStyle = "#777777";
	this.ctx.lineWidth = this.canvas.width / 200.0;
	this.ctx.beginPath();
	this.ctx.moveTo( 0.1 * this.w , 0.1 * this.h );
	this.ctx.lineTo( 0.1 * this.w , 0.9 * this.h );
	this.ctx.lineTo( 0.7 * this.w , 0.9 * this.h );
	this.ctx.stroke();
	
	// Main title
	this.ctx.fillStyle = "#777777";
	this.ctx.font = Math.floor( this.canvas.width / 38 ) + "px Arial";
	this.ctx.textAlign = "center";
	this.ctx.textBaseline = "top";
	this.ctx.fillText( this.options.title , 0.4 * this.w , 0 );
	this.ctx.textBaseline = "middle";
	
	// X-axis title
	this.ctx.font = Math.floor( this.canvas.width / 57 ) + "px Arial";
	this.ctx.fillText( this.options.xTitle , 0.5 * this.w , 0.95 * this.h );
	
	// Y-axis title ( rotated -90 degrees )
	this.ctx.rotate( -0.5 * Math.PI );
	this.ctx.fillText( this.options.yTitle , -0.5 * this.h , 0.02 * this.w );
	this.ctx.setTransform( 1 , 0 , 0 , 1 , 0 , 0 );
	
	this.ctx.font = Math.floor( this.canvas.width / 70 ) + "px Arial";
	
	// Graph titles
	this.ctx.textAlign = "left";
	
	if( this.options.yScale.threshold !== undefined )
	{
		this.ctx.fillStyle = "#000000";
		this.ctx.fillRect( 0.75 * this.w , 0.1 * this.h , 0.02 * this.w , 0.02 * this.h );
		this.ctx.fillStyle = "#777777";
		this.ctx.fillText( "Threshold" , 0.78 * this.w , 0.11 * this.h );
	}
	
	for( var i in this.graphs )
	{
		this.ctx.fillStyle = this.graphs[i].color;
		this.ctx.fillRect( 0.75 * this.w , ( 0.2 + i * 0.1 ) * this.h , 0.02 * this.w , 0.02 * this.h );
		this.ctx.fillStyle = "#777777";
		this.ctx.fillText( this.graphs[i].title , 0.78 * this.w , ( 0.21 + i * 0.1 ) * this.h );
	}
	
	// Store buffer
	this.bgBuffer = this.ctx.getImageData( 0 , 0 , this.w ,  this.h );
};

CGraph.prototype.Render = function() {
	
	if( !this.isRendering ) return;
	if( this.options.yScale.start === null || this.options.yScale.end === null ) return;
	
	this.RenderBG();
	
	// X and Y graph ratios
	var xr = 0.6 / ( this.options.xScale.end - this.options.xScale.start );
	var yr = 0.8 / ( this.options.yScale.end - this.options.yScale.start );
	
	var render_ts_start = this.graphEndTimestamp - this.options.tickInterval + ( this.graphTickTimer > this.options.tickInterval ? this.options.tickInterval : this.graphTickTimer );
	render_ts_start -= this.options.tickInterval * this.options.xScale.start;
	var render_ts_end = render_ts_start - this.options.tickInterval * ( this.options.xScale.end - this.options.xScale.start );
	// var date_start = new Date( date_end.getTime() - ( 1000 * 500 ) );
	
	// X-axis
	this.ctx.textAlign = "center";
	this.ctx.font = Math.floor( this.canvas.width / 60 ) + "px Arial";
	this.ctx.fillStyle = "#777777";
	// this.ctx.fillText( date_start.toCustomDate() , 0.1 * this.w , 0.98 * this.h );
	// this.ctx.fillText( date_start.toCustomTime() , 0.1 * this.w , 0.95 * this.h );
	
	var render_ts = render_ts_start - ( render_ts_start % this.renderTSInterval );
	while( render_ts > render_ts_end )
	{
		var render_ts_x = 0.7 - ( render_ts_start - render_ts ) / this.options.tickInterval * xr;
		var date_end = getLocalDate( render_ts );
		this.ctx.fillText( date_end.toCustomDate() , render_ts_x * this.w , 0.97 * this.h );
		this.ctx.fillText( date_end.toCustomTime() , render_ts_x * this.w , 0.93 * this.h );
		render_ts -= this.renderTSInterval;
		
	}
	
	if( this.options.yScale.threshold !== undefined && this.options.yScale.threshold >= this.options.yScale.start && this.options.yScale.threshold <= this.options.yScale.end )
	{
		var yCoord = ( 0.9 - ( this.options.yScale.threshold - this.options.yScale.start ) * yr ) * this.h;
		
		this.ctx.lineWidth = 1;
		this.ctx.strokeStyle = "#000";
		this.ctx.fillStyle = "#000";
		
		this.ctx.textAlign = "right";
		this.ctx.textBaseline = "middle";
		this.ctx.font = ( this.canvas.width / 70 ) + "px Arial";
		
		this.ctx.beginPath();
		this.ctx.moveTo( 0.1 * this.w , yCoord );
		this.ctx.lineTo( 0.7 * this.w , yCoord );
		this.ctx.stroke();
		
		this.ctx.fillText( this.options.yScale.threshold , 0.095 * this.w , yCoord );
	}
	
	// Save before clip/transform
	this.ctx.save();
	
	// Create clip area
	this.ctx.lineWidth = 1;
	this.ctx.beginPath();
	this.ctx.rect( 0.1 * this.w , 0.1 * this.h , 0.6 * this.w , 0.8 * this.h );
	this.ctx.clip();
	
	this.ctx.lineWidth = 1;
	
	// Shift the y origin to fit the graph's starting value ... kind of
	this.ctx.translate( 0 , this.options.yScale.start * yr * this.h );
	
	var graphStart = this.graphEndTimestamp - ( this.options.tickInterval * this.options.xScale.start );
	var graphEnd = this.graphEndTimestamp - ( this.options.tickInterval * ( this.options.xScale.end + 1 ) );
	
	for( var k = 0; k < this.graphs.length; k++ )
	{
		if( this.graphs[k].data.length < 1 ) continue;
	
		var startIndex = 0;
		for( ; startIndex < this.graphs[k].data.length; startIndex++ )
			if( this.graphs[k].data[ startIndex ].tstamp >= graphEnd ) break;
				
		if( startIndex >= this.graphs[k].data.length ) continue; // All better now :)
		
		var drawIndex = 0;
		var graphCurrent = graphEnd;
		if( this.graphs[k].data[ startIndex ].tstamp > graphEnd )
		{
			if( startIndex > 0 ) startIndex--;
			else 
			{
				drawIndex = ( this.graphs[k].data[ startIndex ].tstamp - graphEnd ) / ( graphStart - graphEnd ) * ( this.options.xScale.end - this.options.xScale.start + 1 );
				graphCurrent = this.graphs[k].data[ startIndex ].tstamp;
			}
		}
		var dataPoint = this.graphs[k].data[ startIndex ].data;
		
		var startCoord = ( 0.1 + ( drawIndex - this.smoothStep / this.smoothStepMax ) * xr ) * this.w;
		
		this.ctx.strokeStyle = this.graphs[k].color;
		this.ctx.beginPath();
		this.ctx.moveTo( startCoord , ( 0.9 - dataPoint * yr ) * this.h );
		
		for( var graphIndex = startIndex + 1; graphIndex < this.graphs[k].data.length && this.graphs[k].data[ graphIndex ].tstamp <= graphStart; graphIndex++ )
		{
			dataPoint = this.graphs[k].data[ graphIndex ].data;
			
			drawIndex = ( this.graphs[k].data[ graphIndex ].tstamp - graphEnd ) / ( graphStart - graphEnd ) * ( this.options.xScale.end - this.options.xScale.start + 1 );
			this.ctx.lineTo( ( 0.1 + ( drawIndex - this.smoothStep / this.smoothStepMax ) * xr ) * this.w , ( 0.9 - dataPoint * yr ) * this.h );
		}
		
		this.ctx.stroke();
		
		if( this.options.isAreaGraph )
		{
			this.ctx.fillStyle = this.graphs[k].color;
			this.ctx.globalAlpha = 0.7;
			
			this.ctx.lineTo( 0.7 * this.w , this.h );
			this.ctx.lineTo( startCoord , this.h );
			this.ctx.fill();
			this.ctx.globalAlpha = 1.0;
		}

	}
	
	// Reset clip/transform
	this.ctx.restore();
};

CGraph.prototype.GetEndTimestamp = function() {
	if( this.isStatic ) return this.GetMaxStaticTimestamp();
	else return this.GetMaxCommonTimestamp();
};

CGraph.prototype.GetMaxCommonTimestamp = function() {
	// Calculate maximum common timestamp between graphs
	var ts = null;
	for( var i = 0; i < this.graphs.length; i++ )
		if( !this.graphs[i].isStatic && ( this.graphs[i].tstamp < ts || ts === null ) )
			ts = this.graphs[i].tstamp;
			
	return ts;
};

CGraph.prototype.GetMaxStaticTimestamp = function() {
	// Calculate maximum common timestamp between graphs
	var ts = this.graphs[0].tstamp;
	for( var i = 1; i < this.graphs.length; i++ )
		if( this.graphs[i].tstamp > ts )
			ts = this.graphs[i].tstamp;
			
	return ts;
};

CGraph.prototype.GraphTick = function() {
	
	this.graphEndTimestamp = this.GetEndTimestamp();
	
	this.graphTickTimer = 0;
	this.newDataAvailable = 0;
	// if( this.canvas.id == "thGraph" ) console.log( "GraphTick" );
};

CGraph.prototype.DoSmoothStep = function() {
	
	this.SetScaleX( this.options.xScale.max - parseInt( this.scaleSliderEnd.val() ) , this.options.xScale.max - parseInt( this.scaleSliderStart.val() ) );
	
	// Wait for full init...
	if( this.graphInitCount < this.graphs.length )
	{
		this.RenderLoading();
		return;
	}
	
	var d = new Date();
	var delta = ( new Date() ).getTime() - this.smoothStepTimer;
	this.smoothStepTimer = d.getTime();
	this.graphTickTimer += delta;
	this.pollTimer += delta;
	this.smoothStep += delta / this.smoothStepInterval;
	
	// Request new data ?
	if( this.options.pollInterval !== undefined && this.pollTimer >= this.options.pollInterval )
	{
		if( !this.isPaused )
		{
			for( var k in this.graphs )
				if( !this.graphs[k].isStatic )
					this.graphs[k].GetLiveData();
		}
		this.pollTimer -= this.options.pollInterval;
	}
	
	// Graph is waiting for data...
	if( this.graphTickTimer >= this.options.tickInterval && this.GetEndTimestamp() > this.graphEndTimestamp )
	{
		this.GraphTick();
		this.smoothStep = 0;
	}
	else if( this.smoothStep >= this.smoothStepMax )
	{
		this.smoothStep = this.smoothStepMax;
	}
	
	this.Render();
};

CGraph.prototype.AddGraph = function( title , data , color , timeOffset , isStatic ) {
	
	if(( data === undefined )||( data === null )) data = [];
	if(( color === undefined )||( color === null )) color = CGraph.defaultColors[ this.graphs.length % CGraph.defaultColors.length ];
	if(( timeOffset === undefined )||( timeOffset < 0 )) timeOffset = 0;
	if( isStatic === undefined ) isStatic = false;
	if( !isStatic ) this.isStatic = false;
	
	this.graphs.push( new CInternalGraph( this , title , data , color , timeOffset , isStatic ) );
	this.bgBuffer = null; // Force background re-render
};

CGraph.prototype.SetScaleX = function( newStart , newEnd ) {
	
	if( newStart == this.options.xScale.start && newEnd == this.options.xScale.end ) return;
	
	this.options.xScale.start = newStart;
	this.options.xScale.end = newEnd;
	this.CalculateRenderTSInterval();
	
	this.bgBuffer = null;
};

CGraph.prototype.CheckYScale = function( value ) {
	
	if( this.options.yScale.start === null && this.options.yScale.end === null )
		this.options.yScale.start = value;
	else
	{
		if( this.options.yScale.start !== null )
		{
			if( value < this.options.yScale.start ) this.options.yScale.start = value;
			else if( this.options.yScale.end === null || value > this.options.yScale.end ) this.options.yScale.end = value;
		}
		else
		{
			if( value > this.options.yScale.end ) this.options.yScale.end = value;
			else this.options.yScale.start = value;
		}
	}
	
	this.CalculateYInterval();
};

CGraph.prototype.CalculateYInterval = function() {
	if( this.options.yScale.start !== null && this.options.yScale.end !== null )
	{
		this.options.yScale.drawInterval = Math.ceil( ( this.options.yScale.end - this.options.yScale.start ) / 5 );
		this.bgBuffer = null;
	}
};

CGraph.prototype.CalculateRenderTSInterval = function() {
	
	var searchFor = Math.floor( ( this.options.xScale.end - this.options.xScale.start ) * this.options.tickInterval / 5 );
	for( var i in CGraph.renderTSIntervals )
	{
		if( CGraph.renderTSIntervals[i] >= searchFor ) 
		{
			this.renderTSInterval = CGraph.renderTSIntervals[i];
			break;
		}
	}
};

///////////////////////////////////////////////////////////////////////////////////////////
//                                     GESTURE EVENTS                                    //
///////////////////////////////////////////////////////////////////////////////////////////

CGraph.prototype.GestureDragStart = function( event ) {
	this.gesture.dragSize = this.options.xScale.end - this.options.xScale.start;
	this.gesture.dragCenter = this.options.xScale.start + this.gesture.dragSize / 2;
	this.gesture.isDragging = true;
};

CGraph.prototype.GestureHorizontalDrag = function( event ) {
	if( event.gesture.touches.length > 1 ) return;
	if( !this.gesture.isDragging ) return;
	
	var newCenter = this.gesture.dragCenter + ( event.gesture.deltaX / this.gesture.graphSize * this.gesture.dragSize );
	
	if( newCenter - this.gesture.dragSize / 2 < 0 ) newCenter = this.gesture.dragSize / 2;
	else if( newCenter + this.gesture.dragSize / 2 > this.options.xScale.max ) newCenter = this.options.xScale.max - this.gesture.dragSize / 2;
	
	this.SetScaleX( Math.floor( newCenter - this.gesture.dragSize / 2 ) , Math.floor( newCenter + this.gesture.dragSize / 2 ) );
	this.UpdateSlider();
};

CGraph.prototype.GesturePinch = function( event ) {
	this.gesture.isDragging = false;
	
	if( event.gesture.startEvent.timeStamp != this.gesture.pinchLastTS )
	{
		this.gesture.pinchLastTS = event.gesture.startEvent.timeStamp;
		this.gesture.pinchCenter = this.options.xScale.start + ( this.options.xScale.end - this.options.xScale.start ) / 2;
		this.gesture.pinchSize = this.options.xScale.end - this.gesture.pinchCenter;
	}
	else
	{
		var newStart = Math.floor( this.gesture.pinchCenter - this.gesture.pinchSize / event.gesture.scale );
		var newEnd = Math.floor( this.gesture.pinchCenter + this.gesture.pinchSize / event.gesture.scale );
		if( newStart < 0 ) newStart = 0;
		if( newEnd > this.options.xScale.max ) newEnd = this.options.xScale.max;
		this.SetScaleX( newStart , newEnd );
		this.UpdateSlider();
	}
};

CGraph.prototype.UpdateSlider = function() {
	this.scaleSliderStart.val( this.options.xScale.max - this.options.xScale.end );
	this.scaleSliderEnd.val( this.options.xScale.max - this.options.xScale.start );
	this.slider.rangeslider( "refresh" );
};

// Some default graph colors. Can be changed/added/removed
CGraph.defaultColors = [ "#FF0000" , "#00AACC" , "#00AA00" , "#FF8000" , "#DD00DD" , "#888888" ];

// Pre-defined time intervals
CGraph.renderTSIntervals = [ 5000 , 15000 , 30000 , 60000 , 150000 , 300000 , 900000 , 1800000 , 3600000 , 14400000 , 21600000 , 86400000 , 604800000 , 1209600000 , 2592000000 , 7776000000 , 10368000000 , 15552000000 ];