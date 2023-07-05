var child_prc = require( 'child_process' );

var TestSocketClick    = function() {
    var that                = this;
    this.params             = new Array();    
    
    this.numConnectedClient = 1; //NUumero effettivo di client connessi
    this.numMaxClient       = 100000; //numero massimo client da connettere    
    this.numClient          = 300; //numero massimo client da connettere per interval
    this.timeInterval       = 1; //in secondi
    this.i                  = 1;
    this.host               = 'ws://localhost:3000';
    //this.host               = 'ws://79.22.13.17:3000';
    
    process.argv.forEach( function ( val, index, array ) {    
        var param = val.split( '=' );
        if( typeof param[1] != 'undefined' )
            that.params[param[0]] = param[1];
        else
            that.params[param[0]] = '';
    });
    
    this.controlParameters();    
    
    this.timeInterval =  this.timeInterval * 1000;
    
    that.init();
    this.interval = setInterval( function() {
        console.info('intervallo');
        that.init();
    }, this.timeInterval );
    
};

/**
 * Controlla se ci sono parametri esterni da sovrascrivere
 * @returns {undefined}
 */
TestSocketClick.prototype.controlParameters = function() {
    var that = this;    
    
    if( typeof this.params['numClient'] != 'undefined' ) {
        this.numClient = this.params['numClient'];
    }
    
    if( typeof this.params['numMaxClient'] != 'undefined' ) {
        this.numMaxClient = this.params['numMaxClient'];
    }
    if( typeof this.params['timeInterval'] != 'undefined' ) {
        this.timeInterval = this.params['timeInterval'];
    }
    
    if( typeof this.params['host'] != 'undefined' ) {
        this.host = this.params['host'];
    }
};

TestSocketClick.prototype.init = function() {
    for( var x = 0; x < this.numClient; x++ ) {
        this.connectClient( x );
    }
};

/**
 * Stabilisce la connessione con i socket server
 * @param {type} client
 * @returns {undefined}
 */
TestSocketClick.prototype.connectClient = function( client ) {
    var that = this;
                
    var client = this.numConnectedClient;
    if( this.numConnectedClient >= this.numMaxClient ) {        
        clearInterval( this.interval );        
    }    
        
    var socket = require('socket.io-client')(this.host);

    
    socket.on('connect', function(){        
        let a = {1:"view", 2:'click', 3:'close'};


        that.numConnectedClient++;
        console.info( 'Client connesso: '+that.numConnectedClient );        
        // socket.emit('dataLiveReceived', {"site_name":"linea.it", "push_send_id":"23434","event_type":"webpush","event_name":"view"}); 
        // socket.emit('dataLiveReceived', {"site_name":"linea.it", "push_send_id":"23435","event_type":"webpush","event_name":"view"}); 
        // socket.emit('dataLiveReceived', {"site_name":"linea.it", "push_send_id":"23435","event_type":"webpush","event_name":"view"}); 
        // socket.emit('dataLiveReceived', {"site_name":"linea.it", "push_send_id":"23434","event_type":"webpush","event_name":"view"}); 
        // socket.emit('dataLiveReceived', {"site_name":"linea.it", "push_send_id":"23434","event_type":"webpush","event_name":"view"}); 
        socket.emit('dataLiveReceived', {"site_name":"linea.it", "push_send_id":"23434","event_type":"webpush","event_name":a[that.i]}); 
        // socket.emit('dataLiveReceived', {"site_name":"linea.it", "push_send_id":"23434","event_type":"webpush","event_name":"close"}); 
        // socket.emit('dataLiveReceived', {"site_name":"linea.it", "push_send_id":"23435","event_type":"webpush","event_name":"click"}); 
        // socket.emit('dataLiveReceived', {"site_name":"linea.it", "push_send_id":"23435","event_type":"webpush","event_name":"close"}); 
        socket.disconnect();

        if( that.i == 3 ) {
            that.i = 0;
        }
        that.i++;
    });
    
    socket.on('disconnect', function(data){
        console.info( 'Client Disconnesso'+ that.numConnectedClient );
        //that.connectClient( client );
    });

    socket.on('error', function(data){
        console.info(data);
    });
};

new TestSocketClick();