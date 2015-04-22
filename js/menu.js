
GraphApp = GraphApp || {};
GraphApp.Model = GraphApp.Model || {};

GraphApp.Model.Menu = function( uuid , doneCallback ) {

	this.currentGroup = "root";
	this.menu = null;
	
	this.doneCallback = doneCallback;
	GraphApp.DB.DoREST( "graphs" , "GET" , 'query={"userid":{"$oid":"' + uuid + '"}}&sort={"name":1}' , null , this.LoadCallback.bind( this ) );
};

GraphApp.Model.Menu.prototype.LoadCallback = function( data , success , xhr ) {

	this.menu = {};
	this.menu.root = {
		groups : [],
		graphs : []
	};
	
	this.ParseLoadedData( data );

	console.log( "Menu loaded." );
	console.log( this.menu );
	
	this.doneCallback();
};

GraphApp.Model.Menu.prototype.LoadGroup = function( uuid , id , doneCallback ) {
	
	if( this.menu[ id ] === undefined ) return;
	
	this.doneCallback = doneCallback;
	this.menu[ id ].groups = [];
	this.menu[ id ].graphs = [];
	var parentID = ( id == "root" ? '{"$exists":false}' : '{"$oid":"' + id + '"}' );
	GraphApp.DB.DoREST( "graphs" , "GET" , 'query={"userid":{"$oid":"' + uuid + '"},"parentid":' + parentID + '}&sort={"name":1}' , null , this.LoadGroupCallback.bind( this ) );
};

GraphApp.Model.Menu.prototype.LoadGroupCallback = function( data , success , xhr ) {
	
	this.ParseLoadedData( data );
	this.doneCallback();
};

GraphApp.Model.Menu.prototype.ParseLoadedData = function( data ) {
	
	for( var i in data )
	{
		var parent = "root";
		if( data[i].parentid !== undefined ) parent = data[i].parentid.$oid;
		
		var id = data[i]._id.$oid;
		delete data[i]._id;
		delete data[i].parentid;
		delete data[i].userid;
		
		if( this.menu[ id ] === undefined )
		{
			if( data[i].type == GraphApp.Graphs.ItemType.GROUP )
				this.menu[ id ] = { groups:[], graphs:[] };
			else this.menu[ id ] = {};
		}
		
		for( var key in data[i] )
			this.menu[ id ][ key ] = data[i][ key ];
		
		this.menu[ id ].id = id;
		this.menu[ id ].parent = parent;
		
		if( parent != "root" && this.menu[ parent ] === undefined )
		{
			this.menu[ parent ] = {
				groups : [],
				graphs : []
			};
		}
		
		if( this.menu[ id ].type == GraphApp.Graphs.ItemType.GROUP ) this.menu[ parent ].groups.push( this.menu[ id ] );
		else this.menu[ parent ].graphs.push( this.menu[ id ] );
	}
	
};

GraphApp.Model.Menu.prototype.IsGroup = function( gid ) {
	return ( this.menu[ gid ].type == GraphApp.Graphs.ItemType.GROUP );
};

GraphApp.Model.Menu.prototype.FindGraphByID = function( gid ) {
	return this.menu[ gid ] || null;
};

GraphApp.Model.Menu.prototype.GetGroups = function( gid , data ) {
	if( !this.IsGroup( gid ) ) return;
	
	if( data === undefined ) data = [];
	data.push( this.menu[ gid ] );
	for( var i = 0; i < this.menu[ gid ].groups.length; i++ )
		this.GetGroups( this.menu[ gid ].groups[i].id , data );
		
	return data;
};

GraphApp.Model.Menu.prototype.GetGraphsRecursive = function( groupid , arr ) {
	if( arr === undefined ) arr = [];
	
	var i;
	for( i = 0; i < this.menu[ groupid ].groups.length; i++ )
	{
		this.GetGraphsRecursive( this.menu[ groupid ].groups[i].id , arr );
	}
	
	for( i = 0; i < this.menu[ groupid ].graphs.length; i++ )
	{
		arr.push( this.menu[ groupid ].graphs[i] );
	}
	
	return arr;
};

GraphApp.Model.Menu.prototype.CheckReferenceToQuery = function( queryid ) {
	
	for( var i in this.menu )
	{
		if( !this.menu[i].config || !this.menu[i].config.queries ) continue;
		
		for( var k = 0; k < this.menu[i].config.queries.length; k++ )
			if( this.menu[i].config.queries[k].queryid.$oid == queryid )
				return true;
	}
	
	return false;
};

GraphApp.Model.Menu.prototype.IsGroupGraphable = function( gid ) {
	
	if( this.menu[ gid ].graphs.length > 0 ) return true;
	
	for( var i = 0; i < this.menu[ gid ].groups.length; i++ )
		if( this.IsGroupGraphable( this.menu[ gid ].groups[i].id ) ) return true;
	
	return false;
};