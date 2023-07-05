var child_prc = require( 'child_process' );
var SportradarStatistics = function() {
    var that        = this;
    this.chokidar   = require( 'chokidar' );
    this.fs         = require( 'fs' );
    this.child_prc  = require( 'child_process' );
    this.async      = require( 'async' );
    
    this.params     = new Array();
    this.count =0;
    this.setMaxBuffer =  1024 * 10000;
        
    process.argv.forEach(function ( val, index, array ) {    
        var param = val.split( '=' );
        if( typeof param[1] != 'undefined' )
            that.params[param[0]] = param[1];
        else
            that.params[param[0]] = '';
    });
    this.run();
};

/**
 * Metodo che inizializza tutti i test
 */
SportradarStatistics.prototype.run = function() {
    var that = this;
    
    if( typeof this.params['pathTask'] == 'undefined' ) {
        console.error( 'Setta il parametro del path del progetto di symfony che lancia il comando ES: path=/path cartella');
        return false;
    }
    
    if( typeof this.params['pathXml'] == 'undefined' ) {
        console.error( 'Setta il parametro del path della cartella xml da leggere\n ES: pathXml=/path cartella');
        return false;
    }
    
    if( typeof this.params['folderXml'] == 'undefined' ) {
        console.error( 'Setta il parametro del path relativo del tipo di file xml da leggere\n ES: folder=/statistics');
        return false;
    }
    
    if( typeof this.params['env'] == 'undefined' ) {        
        this.params['env'] = 'prod';
        console.error( 'Setta env di default "prod" per settarlo custom aggiungi\n ES: env=/prod');
    }
    
    if( typeof this.params['ftp'] == 'undefined' ) {        
        this.params['ftp'] = false;
        console.error( 'Setta env di default "prod" per settarlo custom aggiungi\n ES: env=/prod');
    }
    
    this.fs.exists( this.params['pathTask']+this.params['pathXml']+this.params['folderXml'], function( exists ) {
        if( !exists ) {
            console.log( 'Il path '+that.params['pathTask']+that.params['pathXml']+that.params['folderXml']+' specificato non esiste!' );
        }
    });    
    
    if( this.params['ftp'] )
        this.watchFolderAndFTP();
    else
        this.watchFolder();
};

/**
 * Metodo che avvia il resend ftp se neceessario
 * @returns {undefined}
 */
SportradarStatistics.prototype.watchFolderAndFTP = function() {
    var that = this;
    this.ClientFtp  = require('ftp');
    this.ClientFtp  = new this.ClientFtp();
    
    // connect to localhost:21 as anonymous 
    this.ClientFtp.connect({
        'port' : '21', 'host' : '95.240.84.62', 'user' : 'sportradar', 'password': 'dh47s9skdjcn0'
    });
    
    this.ClientFtp.on('ready', function() {
        that.watchFolder();
    });
};

/**
 * Avvia il watch della cartella specificata
 * @returns {undefined}
 */
SportradarStatistics.prototype.watchFolder = function() {
    var that = this;
    var watcher = this.chokidar.watch( this.params['pathTask']+this.params['pathXml']+this.params['folderXml'], {
        persistent: true,
        ignored: '*.txt',
//        ignored: 'Odd*',
        ignoreInitial: false,
        followSymlinks: true,
        cwd: that.params['pathTask']+that.params['pathXml']+that.params['folderXml'],

        usePolling: true,
        interval: 100,
        binaryInterval: 2000,
        alwaysStat: false,
        depth: 99,
        awaitWriteFinish: {
          stabilityThreshold: 2000,
          pollInterval: 100
        },
        ignorePermissionErrors: false,
        atomic: true // or a custom 'atomicity delay', in milliseconds (default 100)
    });
    
    var q = this.async.queue( function ( task, callback ) {
        task.function( task.command, task.path, task.filename, that, callback );        
    }, 1 );        

    var log = console.log.bind( console );
    watcher.on( 'add', function( filename ) {         
        
        var command = 'php bin/console parseLivescoreXml -e '+that.params['env']+' --folder='+that.params['folderXml']+' '+ filename+' -v';        
        console.info( command );
        
        if( that.params['ftp'] ) {
            q.push([{ 'function': that.resendFtpFile, 'command':command, 'path':that.params['pathTask'], 'filename':filename}], function( err ) {
                console.log(err);
            });        
        } else {
            q.push([{ 'function': that.runCommandSymfony, 'command':command, 'path':that.params['pathTask'], 'filename':filename}], function( err ) {
                console.log(err);
            });   
        }
           
    }).on( 'ready', function() {         
        log( 'Initial scan complete. Ready for changes.' );        
    });
};

/**
 * Invia il file appena arrivato ad un altro server
 * @param {type} filename
 * @returns {undefined}
 */
SportradarStatistics.prototype.resendFtpFile = function( command, pathTask, filename, that, callback ) {    
//    var that = this;
    if( that.params['folderXml'] != 'statistics' )
        return false;
    
    var file = that.params['pathTask']+that.params['pathXml']+that.params['folderXml']+'/'+filename;
    console.info( 'invio ftp');
    that.ClientFtp.put(file, filename, function(err) {
        that.runCommandSymfony( command, pathTask, filename, that, callback );
//            that.ClientFtp.end();
    });
    
};
  
/**
 * Avvia il comando su synfony
 * @returns {undefined}
 */
SportradarStatistics.prototype.runCommandSymfony = function( command, pathTask, filename, that, callback ) {     
    console.info('command'+command);
    console.info(pathTask);    

    child_prc.exec( command, {cwd: pathTask, maxBuffer: that.setMaxBuffer }, function( error, stdout, stderr ) {           
//        console.info(stdout);                 
//        console.info(stderr);                 
//        console.info(error);                 
        callback( stderr );
    });
    return true;
};

new SportradarStatistics();