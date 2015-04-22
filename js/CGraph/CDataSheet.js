
function CDataSheet( parent , options )
{
	this.aspectRatio = 0;
	this.options = options;
	
	// Create canvas and get context
	this.container = $( parent );
	this.innerContainer = $( '<div class="mainContainer"></div>' );
	this.container.append( this.innerContainer );
	
	this.innerContainer.append( '<div class="dsTitle">' + this.options.title + '</div>' );
	
	this.innerContainer.css( "width" , "100%" );
	this.innerContainer.css( "height" , "100%" );
}

CDataSheet.prototype.Resize = function() {

	// Render aspect ratio
	var aspectRatio = 2.5;
	
	// Get new width and height
	var cWidth = this.container.width(), newWidth = cWidth;
	var cHeight = this.container.height(), newHeight = cHeight;
	
	// Force aspect ratio
	if( newWidth / newHeight > aspectRatio )
		newWidth = newHeight * aspectRatio;
	else
		newHeight = newWidth / aspectRatio;
	
	newWidth = Math.floor( newWidth );
	newHeight = Math.floor( newHeight );
	
	var title = this.innerContainer.find( ".dsTitle" );
	var table = this.innerContainer.find( ".dsTable" );
	
	console.log( cHeight , title.height() , table.height() );
	
	title.css( "font-size" , Math.floor( newWidth / 38 ) + "px" );
	table.css( "font-size" , Math.floor( newWidth / 50 ) + "px" );
	table.css( "height" , ( cHeight - title.height() - 5 ) + "px" );
};

CDataSheet.prototype.Init = function( query , queryParams , queryDB ) {
	
	this.innerContainer.append( '<div class="dsTitle">Loading...</div>' );
	
	var queryObj = {
		sql : GraphApp.DB.BuildQuery( query , queryParams ),
		success : this.RecvData.bind( this ),
		db : queryDB,
	};
	
	if( this.options.elementCount ) queryObj.limit = this.options.elementCount;
	
	GraphApp.DB.SQLQuery( queryObj );
};

CDataSheet.prototype.RecvData = function( data , status , xhr ) {
	
	this.innerContainer.find( ".dsTitle:eq(1)" ).remove();
	
	if( !data || data.length < 1 )
	{
		this.innerContainer.append( '<div class="dsTitle">No data available.</div>' );
		return;
	}
	
	var output = '<div class="dsTable"><table><tr>';
	for( var column in data[0] )
		output += '<td>' + column + '</td>';
	output += '</tr>';
	
	for( var row in data )
	{
		output += '<tr>';
		for( var column in data[row] )
		{
			output += '<td>' + this.FormatResponse( data[row][column] ) + '</td>';
		}
		output += '</tr>';
	}
	output += '</table></div>';
	
	this.innerContainer.append( output );
	this.Resize();
};

CDataSheet.prototype.FormatResponse = function( data )
{
	if( data === null ) return "NULL";
	
	if( typeof data == "object" )
	{
		if( data.hasOwnProperty( "$date" ) )
			return ( new Date( fixMillis( data.$date ) ) ).toIfxString();
		else
			return JSON.stringify( data );
	}

	return data;
};