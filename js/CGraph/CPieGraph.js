
function CPieGraph( parent , options )
{
	this.aspectRatio = 2.5;
	this.options = options;
	
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

CPieGraph.prototype.Resize = function() {

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

CPieGraph.prototype.Init = function( query , queryParams , queryDB ) {
	
	this.data = null;
	
	GraphApp.DB.SQLQuery( {
		sql : GraphApp.DB.BuildQuery( query , queryParams ),
		success : this.RecvData.bind( this ),
		db : queryDB,
		limit : this.options.elementCount
	} );
};

CPieGraph.prototype.RecvData = function( data , status , xhr ) {

	this.data = data;
	
	var sum = 0;
	for( var i = 0; i < this.data.length; i++ )
		sum += this.data[i].data;
		
	this.dataPercent = [];
	for( var i = 0; i < this.data.length; i++ )
		this.dataPercent.push( this.data[i].data / sum );
	
	this.Render();
};

CPieGraph.prototype.RenderLoading = function() {

	this.ctx.textAlign = "center";
	this.ctx.textBaseline = "middle";
	this.ctx.font = ( this.canvas.width / 30 ) + "px Arial";
	this.ctx.fillStyle = "#777777";
	
	this.ctx.fillText( "Loading..." , 0.5 * this.w , 0.5 * this.h );
};

CPieGraph.prototype.Render = function() {
	
	if( this.data === null )
	{
		this.RenderLoading();
		return;
	}
	
	this.ctx.clearRect( 0 , 0 , this.canvas.width , this.canvas.height );
	
	// Main title
	this.ctx.fillStyle = "#777777";
	this.ctx.font = Math.floor( this.canvas.width / 38 ) + "px Arial";
	this.ctx.textAlign = "center";
	this.ctx.textBaseline = "top";
	this.ctx.fillText( this.options.title , 0.4 * this.w , 0 );
	
	this.ctx.font = ( this.canvas.width / 70 ) + "px Arial";
	this.ctx.textBaseline = "middle";
	
	var currentAngle = -Math.PI / 2;
	var nextAngle;
	for( var i = 0; i < this.data.length; i++ )
	{
		this.ctx.fillStyle = CPieGraph.defaultColors[ i % CPieGraph.defaultColors.length ];
		
		nextAngle = currentAngle + ( this.dataPercent[i] * Math.PI * 2 );
		this.ctx.beginPath();
		this.ctx.moveTo( 0.4 * this.w , 0.5 * this.h );
		this.ctx.arc( 0.4 * this.w , 0.5 * this.h , 0.3 * this.h , currentAngle , nextAngle );
		this.ctx.lineTo( 0.4 * this.w , 0.5 * this.h );
		this.ctx.fill();
		
		this.ctx.fillRect( 0.65 * this.w , ( 0.1 + i * 0.05 ) * this.h , 0.02 * this.w , 0.02 * this.h );
		
		this.ctx.fillStyle = "#777777";
		var nx = Math.cos( currentAngle + ( nextAngle - currentAngle ) / 2.0 ), ny = Math.sin( currentAngle + ( nextAngle - currentAngle ) / 2.0 );
		this.ctx.textAlign = "center";
		this.ctx.fillText( ( this.dataPercent[i] * 100.0 ).toFixedIfGreater(2) + "%" , 0.4 * this.w + nx * 0.4 * this.h , ( 0.5 + ny * 0.4 ) * this.h );
		
		this.ctx.textAlign = "left";
		this.ctx.fillText( this.data[i].label , 0.68 * this.w , ( 0.11 + i * 0.05 ) * this.h );
		
		currentAngle = nextAngle;
	}
	
	this.ctx.strokeStyle = "#000000";
	this.ctx.beginPath();
	this.ctx.arc( 0.4 * this.w , 0.5 * this.h , 0.3 * this.h , 0 , Math.PI * 2 );
	this.ctx.stroke();
	
	
};

CPieGraph.defaultColors = [ "#bd1b1b" , "#307db8" , "#3fb839" , "#cf9047" , "#b141a2" , "#888888" ];