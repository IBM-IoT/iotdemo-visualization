
function CGauge( parent , options )
{
	this.aspectRatio = 2;
	this.options = options;
	console.log( this.options.action );
	
	this.options.units = this.options.units || "";
	
	// Create canvas and get context
	this.container = $( parent );
	this.innerContainer = $( '<div class="mainContainer"></div>' );
	this.container.append( this.innerContainer );
	
	this.canvas = $( '<canvas width="100" height="100">' );
	this.innerContainer.append( this.canvas );
	
	this.innerContainer = this.innerContainer[0];
	this.canvas = this.canvas[0];
	this.ctx = this.canvas.getContext( "2d" );
	
	this.data = null;
	this.currentValue = null;
	
	this.animationInterval = 50;
	this.gaugeThickness = 0;
}

CGauge.prototype.Resize = function() {

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
	this.canvas.height = newHeight;
	this.canvas.style.width = newWidth + "px";
	this.canvas.style.height = newHeight + "px";
	
	// Set container's style properties to position/scale it
	this.innerContainer.style.width = newWidth + "px";
	this.innerContainer.style.height = newHeight + "px";
	this.innerContainer.style.marginLeft = ( ( cWidth - newWidth ) / 2 ) + "px";
	this.innerContainer.style.marginTop = ( ( cHeight - newHeight ) / 2 ) + "px";
	
	// Shortcuts for width and height
	this.w = this.canvas.width;
	this.h = this.canvas.height;
	
	this.Render();
};

CGauge.prototype.Init = function( query , queryParams , queryDB ) {
	
	this.data = null;
	
	this.query = GraphApp.DB.BuildQuery( query , queryParams );
	this.queryDB = queryDB;
	
	this.GetLiveData();
	this.interval_Main = setInterval( this.GetLiveData.bind( this ) , this.options.tickInterval );
};

CGauge.prototype.Disable = function() {
	
	clearInterval( this.interval_Main );
};

CGauge.prototype.GetLiveData = function() {
	
	GraphApp.DB.SQLQuery( {
		sql : this.query,
		success : this.RecvData.bind( this ),
		db : this.queryDB,
		limit : 1
	} );
};

CGauge.prototype.RecvData = function( data , status , xhr ) {

	if( !data || data.length < 1 ) return;
	
	if( this.options.action !== undefined && this.data != data[0].data )
	{
		if( this.options.action.always || this.data == null || this.GetThresholdAreaID( this.data ) != this.GetThresholdAreaID( data[0].data ) )
		{
			var url = FormatString( this.options.action.url , { 
				low : ( this.options.lowThreshold === undefined ? "null" : this.options.lowThreshold ),
				high : ( this.options.highThreshold === undefined ? "null" : this.options.highThreshold ),
				current : data[0].data
			} );
			
			$.ajax( {
				url : url
			} );
		}
	}
	
	this.data = data[0].data;
	if( this.data < this.options.min ) this.options.min = this.data;
	else if( this.data > this.options.max ) this.options.max = this.data;
	
	if( this.currentValue == null ) this.currentValue = this.data;
	else
	{
		setTimeout( this.Animate.bind( this ) , this.animationInterval );
	}
	
	this.Render();
};

CGauge.prototype.Render = function() {
	
	if( this.data == null ) return;
	
	this.gaugeThickness = 0.3 * this.h;
	var thresholdIsHit = ( this.GetThresholdAreaID( this.data ) != 1 );
	
	this.ctx.clearRect( 0 , 0 , this.canvas.width , this.canvas.height );

	if( this.options.lowThreshold !== undefined )
		this.FillArc( this.options.min , this.options.lowThreshold , 0.8 , 1 , "#F00" );
	
	if( this.options.highThreshold !== undefined )
		this.FillArc( this.options.highThreshold , this.options.max , 0.8 , 1 , "#F00" );
	
	this.FillArc( this.options.min , this.currentValue , 0 , 0.9 , "#38bfd7" );
	
	this.ctx.strokeStyle = "#000";
	this.ctx.beginPath();
	this.ctx.arc( 0.5 * this.w , 0.9 * this.h , 0.7 * this.h , -Math.PI , 0 );
	this.ctx.arc( 0.5 * this.w , 0.9 * this.h , 0.7 * this.h - this.gaugeThickness , 0 , -Math.PI , true );
	this.ctx.lineTo( 0.15 * this.w , 0.9 * this.h );
	this.ctx.stroke();
	
	this.ctx.fillStyle = "#777";
	this.ctx.font = Math.floor( this.w / 20 ) + "px Arial";
	this.ctx.textBaseline = "middle";
	this.ctx.textAlign = "center";
	this.ctx.fillText( this.options.title , 0.5 * this.w , 0.1 * this.h );
	
	this.ctx.font = Math.floor( this.w / 30 ) + "px Arial";
	this.ctx.fillText( this.options.units , 0.5 * this.w , 0.82 * this.h );
	
	this.ctx.textAlign = "right";
	this.ctx.fillText( this.options.min , 0.14 * this.w , 0.9 * this.h );
	this.ctx.textAlign = "left";
	this.ctx.fillText( this.options.max , 0.86 * this.w , 0.9 * this.h );
	
	this.ctx.textAlign = "center";
	this.ctx.font = Math.floor( this.w / 10 ) + "px Arial";
	if( thresholdIsHit ) this.ctx.fillStyle = "#F00";
	this.ctx.fillText( this.data.toFixedIfGreater( 2 ) , 0.5 * this.w , 0.7 * this.h );
};

CGauge.prototype.ValueToPercent = function( value ) {
	
	var percent = ( value - this.options.min ) / ( this.options.max - this.options.min );
	if( percent < 0 ) percent = 0;
	else if( percent > 1 ) percent = 1;
	return percent;
};

CGauge.prototype.GetThresholdAreaID = function( value ) {
	
	if( this.options.lowThreshold !== undefined && value <= this.options.lowThreshold ) return 0;
	else if( this.options.highThreshold !== undefined && value >= this.options.highThreshold ) return 2;
	
	return 1;
};

CGauge.prototype.FillArc = function( start , end , thicknessInner , thicknessOuter , color ) {
	
	var start_rad = ( this.ValueToPercent( start ) - 1.0 ) * Math.PI;
	var end_rad = ( this.ValueToPercent( end ) - 1.0 ) * Math.PI;
	
	this.ctx.fillStyle = color;
	this.ctx.beginPath();
	this.ctx.arc( 0.5 * this.w , 0.9 * this.h , 0.7 * this.h - this.gaugeThickness * thicknessInner , start_rad , end_rad );
	this.ctx.arc( 0.5 * this.w , 0.9 * this.h , 0.7 * this.h - this.gaugeThickness * thicknessOuter , end_rad , start_rad , true );
	this.ctx.fill();
};

CGauge.prototype.Animate = function() {
	
	var delta = this.data - this.currentValue;
	var vel = delta / 10.0;
	var minVel = ( this.options.max - this.options.min ) / 1000.0;
	
	if( Math.abs( vel ) < minVel ) vel = vel < 0 ? -minVel : minVel;
	
	this.currentValue += vel;
	if( ( vel > 0 && this.currentValue > this.data ) ||
	    ( vel < 0 && this.currentValue < this.data ) ) this.currentValue = this.data;
	else setTimeout( this.Animate.bind( this ) , this.animationInterval );
	
	this.Render();
};