
function CInternalGraph( parent , title , data , color , timeOffset , isStatic )
{
	this.parent = parent;
	this.title = title;
	this.data = data;
	this.color = color;
	this.timeOffset = timeOffset;
	this.tstamp = -1;
	this.originTimestamp = 0;
	this.initTimestamp = 0;
	
	this.historyStart = this.historyEnd = -1;
	this.historyDateStart = null;
	
	this.querySent = false;
	this.queryInit = this.queryMain = null;
	this.queryParams = null;
	this.queryDB = {};
	
	this.isStatic = isStatic;
}

CInternalGraph.prototype.Init = function( queryInit , queryMain , queryParams , queryDB )
{
	this.queryInit = queryInit;
	this.queryMain = queryMain;
	this.queryParams = queryParams;
	if(( this.queryParams == undefined )||( this.queryParams == null )) this.queryParams = [];
	
	if( queryDB !== undefined && queryDB !== null ) this.queryDB = queryDB;
	
	if( !this.isStatic ) this.InitQuery();
	else 
	{
		this.GetHistoryData();
		this.parent.graphInitCount++;
	}
};

CInternalGraph.prototype.InitQuery = function()
{
	GraphApp.DB.SQLQuery( {
		sql : GraphApp.DB.BuildTSQuery( this.queryInit , this.queryParams ),
		success : this.RecvData.bind( this ),
		error : this.InitQuery.bind( this ),
		db : this.queryDB,
		limit : 1
	} );
};

CInternalGraph.prototype.GetHistoryData = function( dateStart , dateEnd )
{
	if( this.isStatic )
	{
		GraphApp.DB.SQLQuery( {
			sql : GraphApp.DB.BuildTSQuery( this.queryMain , this.queryParams ) + " ORDER BY tstamp DESC",
			success : this.RecvHistoryData.bind( this ),
			db : this.queryDB,
			useQueue : true
		} );
	}
	else
	{
		this.historyStart = this.historyEnd = dateEnd.getTime();
		GraphApp.DB.SQLQuery( { 
			sql : GraphApp.DB.BuildTSQuery( this.queryMain , this.queryParams , dateStart.toIfxString() , dateEnd.toIfxString() ) + " ORDER BY tstamp DESC",
			success : this.RecvHistoryData.bind( this ),
			db : this.queryDB,
			useQueue : true
		} );
	}
};

CInternalGraph.prototype.GetLiveData = function()
{
	if(( this.queryMain == null )||( this.querySent == true )) return;
	this.querySent = true;
	
	var liveTime = ( new Date( this.originTimestamp + ( ( new Date() ).getTime() - this.initTimestamp ) ) ).toIfxString();
	// console.log( this.title, liveTime );
	
	GraphApp.DB.SQLQuery( {
		sql : GraphApp.DB.BuildTSQuery( this.queryMain , this.queryParams , ( new Date( this.tstamp - this.timeOffset ) ).toIfxString() , liveTime ) + " ORDER BY tstamp",
		success : this.RecvData.bind( this ),
		db : this.queryDB
	} );
};

CInternalGraph.prototype.RecvHistoryData = function( historyData , status , xhr )
{
	// console.log( this.title , "RecvHistoryData :: Start" );
	// console.log( this.title, historyData );
	
	if(( historyData === undefined )||( !( historyData instanceof Array ) ))
	{
		console.log( this.title , "Invalid history data received ... for no apparent reason." );
		this.GetHistoryData( this.historyDateStart , new Date( this.historyEnd ) );
		return;
	}
	
	// console.log( xhr );
	// console.log( historyData );

	for( var i = 0; i < historyData.length; i++ )
	{
		this.data.unshift( { tstamp: fixMillis( historyData[i].tstamp.$date ) + this.timeOffset, data: historyData[i].data } );
		this.parent.CheckYScale( historyData[i].data );
		if( this.tstamp == -1 && this.isStatic )
		{
			this.tstamp = this.data[0].tstamp;
			this.parent.graphEndTimestamp = this.parent.GetEndTimestamp();
		}
	}
	
	this.AdvanceCursor( xhr );
};

CInternalGraph.prototype.AdvanceCursor = function( xhr )
{
	if( xhr.getResponseHeader( "cursorId" ) != null )
	{
		// console.log( this.title , "Cursor ID: " + xhr.getResponseHeader( "cursorId" ) );
		GraphApp.DB.SQLQuery( {
			cursorId : xhr.getResponseHeader( "cursorId" ),
			success : this.RecvHistoryData.bind( this ),
			db : this.queryDB
		} );
	}
};

CInternalGraph.prototype.RecvData = function( data , status , xhr )
{
	this.querySent = false;
	
	if(( data === undefined )||( data.length < 1 )||( !( data instanceof Array ) ))
	{
		if( this.tstamp == -1 ) this.InitQuery();
		return;
	}

	if( this.tstamp == -1 ) // First run
	{
		this.tstamp = fixMillis( data[0].tstamp.$date );
		this.originTimestamp = this.tstamp - this.timeOffset;
		this.tstamp -= this.parent.options.tickInterval;
		this.initTimestamp = ( new Date() ).getTime();
		// this.data = [ { tstamp: this.tstamp, data: data[0].data } ];
		this.data = [];
		
		var dateEnd = new Date( this.originTimestamp - this.parent.options.tickInterval );
		this.historyDateStart = new Date( dateEnd.getTime() - ( ( this.parent.options.xScale.max + 1 ) * this.parent.options.tickInterval ) );
		
		this.GetHistoryData( this.historyDateStart , dateEnd );
		this.GetLiveData();
		
		this.parent.graphEndTimestamp = this.parent.GetEndTimestamp();
		this.parent.graphInitCount++;
	}
	else
	{
		var ok = false;
		// console.log( this.title , data );
	
		for( var i in data )
		{
			var newstamp = fixMillis( data[i].tstamp.$date ) + this.timeOffset;
			if( newstamp <= this.tstamp ) continue;

			this.tstamp = newstamp;
			
			this.parent.CheckYScale( data[i].data );
			
			this.data.push( { tstamp: this.tstamp, data: data[i].data } );
			// console.log( this.title, this.data.length );
			
			if( this.data[0].tstamp < this.parent.graphEndTimestamp - ( this.parent.options.xScale.max + 2 ) * this.parent.options.tickInterval )
				this.data.shift();
			ok = true;
		}
		
		if( ok ) this.parent.newDataAvailable++;
	}
};