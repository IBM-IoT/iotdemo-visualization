
function CBarGraph( parent , options )
{
	this.aspectRatio = 2.5;
	this.options = options;
	
	if( this.options.yScale.start == null ) this.options.yScale.start = this.options.origin;
	if( this.options.yScale.end == null ) this.options.yScale.end = this.options.origin;
	
	console.log( this.options.yScale );
	this.options.yScale.start -= this.options.origin;
	this.options.yScale.end -= this.options.origin;
	console.log( this.options.yScale );
	
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
}

CBarGraph.prototype.Resize = function() {

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

CBarGraph.prototype.Init = function( query , queryParams , queryDB ) {
	
	this.data = null;
	
	GraphApp.DB.SQLQuery( {
		sql : GraphApp.DB.BuildQuery( query , queryParams ),
		success : this.RecvData.bind( this ),
		db : queryDB,
		limit : this.options.elementCount
	} );
};

CBarGraph.prototype.RecvData = function( data , status , xhr ) {

	this.data = data;
	
	for( var i = 0; i < this.data.length; i++ )
	{
		this.data[i].data -= this.options.origin;
		if( this.data[i].data < this.options.yScale.start ) this.options.yScale.start = this.data[i].data;
		else if( this.data[i].data > this.options.yScale.end ) this.options.yScale.end = this.data[i].data;
	}
	
	console.log( this.options.yScale );
	
	this.options.yScale.drawInterval = ( this.options.yScale.end - this.options.yScale.start ) / 5.0;
	
	this.Render();
};

CBarGraph.prototype.RenderLoading = function() {

	this.ctx.textAlign = "center";
	this.ctx.textBaseline = "middle";
	this.ctx.font = ( this.canvas.width / 30 ) + "px Arial";
	this.ctx.fillStyle = "#777777";
	
	this.ctx.fillText( "Loading..." , 0.5 * this.w , 0.5 * this.h );
};

CBarGraph.prototype.Render = function() {
	
	if( this.data === null )
	{
		this.RenderLoading();
		return;
	}
	
	var xSize = 0.6 / this.data.length;
	var xPadding = xSize * 0.1;
	xSize = xSize - xPadding - ( xPadding / this.data.length );
	
	var yr = 0.8 / ( this.options.yScale.end - this.options.yScale.start );
	var yzero = 0.9 + this.options.yScale.start * yr;
	
	this.ctx.clearRect( 0 , 0 , this.canvas.width , this.canvas.height );
	
	// Y-axis scale
	this.ctx.fillStyle = "#777777";
	this.ctx.font = Math.floor( this.canvas.width / 57 ) + "px Arial";
	this.ctx.textAlign = "right";
	this.ctx.fillText( ( this.options.origin + this.options.yScale.start ).toFixedIfGreater(2) , 0.095 * this.w , 0.9 * this.h );
	this.ctx.fillText( ( this.options.origin + this.options.yScale.end ).toFixedIfGreater(2) , 0.095 * this.w , 0.1 * this.h );
	if( this.options.yScale.start < 0 )
		this.ctx.fillText( this.options.origin , 0.095 * this.w , yzero * this.h );
	
	// Main title
	this.ctx.fillStyle = "#777777";
	this.ctx.font = Math.floor( this.canvas.width / 38 ) + "px Arial";
	this.ctx.textAlign = "center";
	this.ctx.textBaseline = "top";
	this.ctx.fillText( this.options.title , 0.4 * this.w , 0 );
	this.ctx.textBaseline = "middle";
	
	// Y interval lines/values
	this.ctx.textAlign = "right";
	this.ctx.textBaseline = "middle";
	this.ctx.font = ( this.canvas.width / 70 ) + "px Arial";
	
	var interval = yr * this.options.yScale.drawInterval;
	this.ctx.lineWidth = 1;
	this.ctx.strokeStyle = this.ctx.fillStyle = "#CCCCCC";
	this.ctx.beginPath();
	for( var i = interval, j = this.options.yScale.drawInterval; j < this.options.yScale.end || -j > this.options.yScale.start; i += interval, j += this.options.yScale.drawInterval )
	{
		if( yzero - i > 0.1 )
		{
			this.ctx.moveTo( 0.1 * this.w , ( yzero - i ) * this.h );
			this.ctx.lineTo( 0.7 * this.w , ( yzero - i ) * this.h );
			this.ctx.fillText( ( this.options.origin + j ).toFixedIfGreater(2) , 0.095 * this.w , ( yzero - i ) * this.h );
		}
		if( yzero + i < 0.9 )
		{
			this.ctx.moveTo( 0.1 * this.w , ( yzero + i ) * this.h );
			this.ctx.lineTo( 0.7 * this.w , ( yzero + i ) * this.h );
			this.ctx.fillText( ( this.options.origin - j ).toFixedIfGreater(2) , 0.095 * this.w , ( yzero + i ) * this.h );
		}
	}
	this.ctx.stroke();
	
	// Main graph line Y
	this.ctx.strokeStyle = "#777777";
	this.ctx.lineWidth = this.canvas.width / 200.0;
	this.ctx.beginPath();
	this.ctx.moveTo( 0.1 * this.w , 0.1 * this.h - ( this.ctx.lineWidth / 2 ) );
	this.ctx.lineTo( 0.1 * this.w , 0.9 * this.h + ( this.ctx.lineWidth / 2 ) );
	this.ctx.stroke();
	
	
	this.ctx.textAlign = "left";
	this.ctx.textBaseline = "middle";
	
	for( var i = 0; i < this.data.length; i++ )
	{
		this.ctx.fillStyle = CBarGraph.defaultColors[ i % CBarGraph.defaultColors.length ];
		// console.log( i, this.data[i].data );
		if( this.data[i].data > 0 )
		{
			this.ctx.fillRect( ( 0.1 + xPadding + i * ( xSize + xPadding ) ) * this.w , ( yzero - this.data[i].data * yr ) * this.h , xSize * this.w , this.data[i].data * yr * this.h );
		}
		else if( this.data[i].data < 0 )
		{
			this.ctx.fillRect( ( 0.1 + xPadding + i * ( xSize + xPadding ) ) * this.w , yzero * this.h , xSize * this.w , -this.data[i].data * yr * this.h );
		}
		
		this.ctx.fillRect( 0.75 * this.w , ( 0.1 + i * 0.05 ) * this.h , 0.02 * this.w , 0.02 * this.h );
		this.ctx.fillStyle = "#777777";
		this.ctx.fillText( this.data[i].label , 0.78 * this.w , ( 0.11 + i * 0.05 ) * this.h );
	}
	
	// Main graph line X
	this.ctx.strokeStyle = "#777777";
	this.ctx.lineWidth = this.canvas.width / 200.0;
	this.ctx.beginPath();
	this.ctx.moveTo( 0.1 * this.w , yzero * this.h );
	this.ctx.lineTo( 0.7 * this.w , yzero * this.h );
	this.ctx.stroke();
};

// CBarGraph.defaultColors = [ "#FF0000" , "#00AACC" , "#00AA00" , "#FF8000" , "#DD00DD" , "#888888" ];
CBarGraph.defaultColors = [ "#bd1b1b" , "#307db8" , "#3fb839" , "#cf9047" , "#b141a2" , "#888888" ];