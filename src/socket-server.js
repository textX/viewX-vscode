import { freemem } from 'os';

/** 
 * Create socket.io server listening on provided port on localhost.
 * The server will separate the extension to one and preview clients to another room
 * and will distribute all commands comming from one room to another.
 * @param {Number} port
*/
function startSocketServer(port) {
    // create express app
    var app = require('express')();
    // pass app to node.js server
    var http = require('http').Server(app);
    // pass server to socket.io
    var io = require('socket.io')(http);
    // must enable cors
    var cors = require('cors');
    // TODO: allow access only from localhost
    // var corsOptions = {
    //     origin: 'http://localhost:*'
    // };
    // io.set('origins', 'http://localhost:* localhost:*');
    // app.use(cors(corsOptions));
    app.use(cors());

    var debugMode = false;
    
    io.on('connection', function(socket){
        // distribute sockets to rooms
        socket.on('ext-room', function(debug) {
            socket.join('extension');
            debugMode = debug;
            if(debugMode) {
                app.get('/', function(req, res){
                    res.sendFile(__dirname + '/test-socket.html');
                });
                io.to('logroom').emit('chat message', 'extension room joined');
            }
        });
        socket.on('preview-room', function(room) {
            socket.join('preview');
            if(debugMode) {
                io.to('logroom').emit('chat message', 'preview room joined');
            }
        });

        socket.on('ext-send-command', function(command) {
            io.to('preview').emit('preview-receive-command', command);
            if(debugMode) {
                io.to('logroom').emit('chat message', 'extension sending command ' + command + ' to preview');
            }
        });
        
        socket.on('preview-send-command', function(command) {
            io.to('extension').emit('ext-receive-command', command);
            if(debugMode) {
                io.to('logroom').emit('chat message', 'preview sending command ' + command + ' to extension');
            }
        });

        if(debugMode) {
            socket.on('logroom', function(msg) {
                socket.join('logroom');
                io.emit('chat message', 'logroom created!');
            })
        }
    });
    
    // import portscanner module to find first available port
    var portscanner = require('portscanner');
    // return a promise, if available port is found return it after server is started successfully
    // this way we can react on success and use found port after everything is completed asynchronously 
	return new Promise(function(resolve, reject) {
		portscanner.findAPortNotInUse(port, function(error, freePort) {
            console.log("portscanner");
            console.log(error);
            console.log(freePort);
            if (freePort > -1) {
				http.listen(freePort, function(){
					resolve(freePort);
				});
			}
			else {
				reject(error);
			}
		});
	});
}
// export the method to enable code completion when imported in .ts
exports.startSocketServer = startSocketServer;