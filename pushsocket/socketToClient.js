const { Console } = require('console');
const fs = require('fs');
const https = require('https');

var SocketClient = function( port ) {
    var that            = this;
    this.aliveSockets   = {};
    this.aPushRecived   = {};
    this.maxPushReviced = 5000;
    this.totPushReviced = 0;
    this.mysql          = require( 'mysql' );

    //Crea i parametri per la connessione al database
    this.connectionDB            = this.mysql.createConnection({
        host     : '162.19.31.55',
        user     : 'pushme',
        password : 'Jfdacb6ty81d',
        database : 'pushme_db'
    });

    const options = {
        key  : fs.readFileSync("../crt/server.key"),
        cert : fs.readFileSync("../crt/server.crt")
    };

    this.app            = https.createServer(options, (req, res) => {}).listen(port);
    this.io             = require('socket.io')(this.app);
    this.io.sockets.setMaxListeners(0);
    //this.io.set( 'transports', [ 'websocket', 'polling' ] );    

    this.app.on('error', function (e) {
        // Handle your error here
        console.log(e);
      });


    //this.app.listen( port );
    this.isConnected = false;    
    
    setInterval(function() {
        that.io.sockets.emit('ping', {timestamp: (new Date()).getTime()});      
    }, 10000);
    
    setInterval(function() {
        for (var key in that.aliveSockets) {            
            if( !that.aliveSockets[key] ) {
                return;
            }
            
            var lastPongTime = String(that.aliveSockets[key].lastPong).split( '.' );
            var nowPongTime = String(new Date().getTime()/1000).split( '.' );

//            console.info( ( parseInt(lastPongTime[0] ) + 10)  +' < '+ parseInt( nowPongTime[0] ) );
//            console.info(that.aliveSockets[key].socket.request.headers.origin);
//            if( that.aliveSockets[key].lastPong + 5 < ( new Date().getTime())/1000 ) {                
            if( ( parseInt(lastPongTime[0] ) + 10) < parseInt( nowPongTime[0] ) ) {       
                //console.info( that.aliveSockets[key].socket.request.headers['user-agent'] ); 
//                console.log('disconnetto: ==>'+that.aliveSockets[key].socket.client.conn.remoteAddress+' ' +that.aliveSockets[key].socket.request.headers.origin);
//                console.log('-------------');
                that.aliveSockets[key].socket.disconnect();
                delete that.aliveSockets[key];                 
            }
      };
    }, 5000); // 1 second
};

/**
 * Metodo che inizializza tutti i test
 */
SocketClient.prototype.connectClientSocket = function( jsonData ) {
    var that    = this;
    this.socket = null;
    
    this.io.on('connection', function(socket) {                      
        if( !that.authorizedReferer( socket ) ) {
            console.info('blocco socket'+socket.id);
            console.info('blocco socket'+socket.request.headers );
            socket.disconnect();
            return false;
        }                        
        
        this.isConnected = true;
        
        socket.on('forceDisconnect', function(){
            socket.disconnect();
            delete that.aliveSockets[socket.id];
            console.info('disconnetto');
        });

        socket.on('dataLiveReceived', function(data){ 
            console.info(that.totPushReviced);

            //TODO implemntare controlo corretteza datro ricevuto per non far morire lo script socket
            if( that.maxPushReviced == that.totPushReviced ) {
                that.syncReportDb(that.aPushRecived);
                that.aPushRecived = {}             
                that.totPushReviced = 0;
            }

            if( typeof that.aPushRecived[data.push_send_id] == 'undefined') {
                that.aPushRecived[data.push_send_id]            = {};
                that.aPushRecived[data.push_send_id]['view']    = 0;        
                that.aPushRecived[data.push_send_id]['click']   = 0;
                that.aPushRecived[data.push_send_id]['close']   = 0;
            }
            
            that.aPushRecived[data.push_send_id]['push_send_id']    = data.push_send_id;
            that.aPushRecived[data.push_send_id]['site_name']       = data.site_name;
            that.aPushRecived[data.push_send_id]['event_type']      = data.event_type;
            that.aPushRecived[data.push_send_id]['event_name']      = data.event_name;
            switch( data.event_name ) {
                case 'view':    
                    that.aPushRecived[data.push_send_id]['view']    += 1;
                break;
                case 'click':
                    that.aPushRecived[data.push_send_id]['click']   += 1;
                break;
                case 'close':
                    that.aPushRecived[data.push_send_id]['close']   += 1;
                break;
            }                        
            that.totPushReviced++;                     
        });
        
        
//        sockets[socket.id] = socket;
        this.aliveSockets[socket.id] = {socket: socket, id: socket.id, lastPong: ((new Date()).getTime()/1000)};
        
        socket.on('pongSocket', function( data ) {
            that.aliveSockets[socket.id] = {socket: socket, id: socket.id, lastPong: ((new Date()).getTime()/1000)};
//            console.info( socket.client.conn ); 
//            console.info( socket.client.conn.remoteAddress ); 
//            console.log("ip: "+socket.request.connection.remoteAddress);
//            console.info(data.hidden+'<==');
            if( data.hidden ) {                
//                console.info( socket.request.headers['user-agent'] ); 
//                console.info('disconnetto: ' +socket.client.conn.remoteAddress+' ' + socket.request.headers.origin);
                socket.disconnect();
                delete that.aliveSockets[socket.id];                
            }
                
        });
        
        
    }.bind(this));
};

SocketClient.prototype.syncReportDb = async function( aPushRecived ) {
    
    let that = this;
    for ( var index in aPushRecived ) {     
        let pushRecived = aPushRecived[index];

        var query = this.connectionDB.query( 'SELECT delivered,click,close FROM push_send_reports where push_id ='+pushRecived.push_send_id, function( err, rows, fields ) {
            if ( err ) 
                throw err;

            if( rows.length == 0 ) {  
                var queryInsert = "INSERT INTO push_send_reports ( push_id, sito, push_type, delivered, click, close ) \
                VALUE ( "+pushRecived.push_send_id+",\
                    '"+pushRecived.site_name+"', \
                    '"+pushRecived.event_type+"', \
                    "+pushRecived.view+", \
                    "+pushRecived.click+", \
                    "+pushRecived.close+" \
                )";

                console.info( queryInsert );
                that.connectionDB.query( queryInsert );            
            } else {
                
                let delivered  = pushRecived.view > 0  ?  rows[0].delivered + pushRecived.view  :  rows[0].delivered;
                let click      = pushRecived.click > 0  ? rows[0].click + pushRecived.click  : rows[0].click;
                let close      = pushRecived.close > 0  ? rows[0].close + pushRecived.close  : rows[0].close;

                // console.info( 'SELECT delivered,click,close FROM push_send_reports where push_id ='+pushRecived.push_send_id );
                // console.info( "\n" );
                // console.info( pushRecived );
                // console.info( "\n" );
                // console.info( rows[0] );
                // console.info( "\n"+delivered+" "+click+" "+close );                
            
                var sqlUpdate = "UPDATE push_send_reports SET \
                    delivered = "+delivered+", \
                    click = "+click+", \
                    close = "+close+" \
                    WHERE push_id = "+pushRecived.push_send_id;                    
            
                console.info( sqlUpdate );
                that.connectionDB.query( sqlUpdate );  
            }
        });    
    }    
}

/**
 * Controlla se i socket sono di un refer autorizzato
 * @param {type} socket
 * @returns {undefined}
 */
SocketClient.prototype.authorizedReferer = function( socket ) {
    var authorized = false;    
    return true;
    var referer = false;	
    
    if( typeof socket.request.headers.referer != 'undefined' && socket.request.headers.referer != '')
        var referer = socket.request.headers.referer;
    
    if( typeof socket.request.headers.origin != 'undefined' || socket.request.headers.origin != '')
        var referer = socket.request.headers.origin;
    
    
    if( !referer )
        return false;
    
    var referer = rtrim( referer, '/' ).replace( 'http://', '').split( '/' );
    referer = 'http://'+referer[0];
    
//    console.info( '===>'+referer);
    
    switch( referer ) {
        case 'http://alebrunch-direttagoal.it':
        case 'http://app.alebrunch-direttagoal.it':
        case 'http://alebrunch-livescore24.it':
        case 'http://santabrunch-direttagoal.it':
        case 'http://santabrunch-livescore24.it':
        case 'http://alebrunch-yougoal.eu':
        
        case 'http://www.direttagoal.it':
        case 'http://m.direttagoal.it':
        case 'http://app.direttagoal.it':        
        case 'http://staging.direttagoal.it':        
        case 'http://www.livescore24.it':
        case 'http://m.livescore24.it':
        case 'http://www.youscore24.com':
        case 'http://www.chediretta.it':
        case 'http://www.diretta365.it':
        case 'http://www.resultados365.es':
        case 'http://www.livegoal.it':
        case 'http://www.africagol.com':
        case 'http://www.x-diretta.it':
        case 'http://www.youscore24.com':
        case 'http://m.youscore24.com':
        case 'http://m.yougoal.eu':
        case 'http://yougoal.eu':
        
        case 'http://app.livescore24.it':
        case 'http://app.direttagoal.it':        
        case 'http://app.resultados365.es':         
        case 'http://app.youscore24.com':        
        case 'http://app.diretta.pro':        
        case 'http://www.diretta.pro':        
        case 'http://diretta.pro':        
        
        case 'http://direttagoal.it':
        case 'http://livescore24.it':
        case 'http://youscore24.com':
        case 'http://chediretta.it':
        case 'http://diretta365.it':
        case 'http://resultados365.es':
        case 'http://livegoal.it':
        case 'http://africagol.com':
//        case 'http://x-diretta.it':
//        case 'http://m.x-diretta.it':
        case 'http://happysexo.org':
        case 'http://www.happysexo.org':
	case 'http://95.240.84.62:3000':
            authorized = true;
        break;
    }
    return authorized;
};

/**
 * Fa l'emit a tutti i socket client connessi 
 * @param {type} jsonData
 * @returns {undefined}
 */
SocketClient.prototype.sendDataLive = function( jsonData ) {
    var that = this;    
        
//    this.io.sockets.emit( 'dataLive', jsonData );
//    console.info( 'emit dataLive' ); 
    
//    this.io.sockets.emit( 'forceReload', '1' );
//    console.info('forceReload');

//    this.io.sockets.emit( 'stopIntervalReconnection', '1' );
//    console.info('stopIntervalReconnection');

    
    var LiveMatch = JSON.parse( jsonData );
    if( LiveMatch.length > 10 ) {
        console.info('Blocco invio data superiore a 10');
        return false;
    }
    for (var item in LiveMatch ) {
        jsonData = JSON.stringify( LiveMatch[item] );
        this.io.sockets.emit( 'dataLive', '['+jsonData+']' );
    }
        
//        this.io.socket.emit( 'dataLive', jsonData,  function(){
//            that.loggerDebug.info( 'DataLive send to client' );
//            console.info( 'DataLive send to client' );
//        });
//        this.io.socket.broadcast.emit( 'dataLive', jsonData);
        
};


function rtrim(str, ch) { 
    if( typeof str == 'undefined' || str.length == 0  )
        return '';
    
    for (i = str.length - 1; i >= 0; i--) {
        if (ch != str.charAt(i)) {
            str = str.substring(0, i + 1);
            break;
        }
    } 
    return str;
}

module.exports = SocketClient;

var socketClient    = new SocketClient( 3000 );
socketClient.connectClientSocket( );