import { Utility } from './utility';

// import { freemem } from 'os';

/** 
 * Create socket.io server listening on provided port on localhost.
 * The server will separate the extension to one and preview clients to another room
 * and will distribute all commands comming from one room to another.
 * @param {Number} port
*/
function startSocketServer(projectDirectory, port) {
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
    
    console.log("starting socket server...");
    io.on('connection', function(socket){
        console.log("connection...");
        // console.log(socket);

        // distribute sockets to rooms
        socket.on('ext-room', function(debug) {
            socket.join('extension');
            debugMode = debug;
            console.log("extension room join: debug = " + debug);
            if(debugMode) {
                app.get('/', function(req, res){
                    projectDirectory = projectDirectory.replace('\\', '/');
                    res.sendFile(projectDirectory + '/vxproj/js/socket-debugger.html');
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
    
    var promise = Utility.getAvailablePortPromiseAsync(port);
    promise.then(function(availablePort) {
        http.listen(availablePort);
        console.log("socket listening on: " + availablePort);
    }).catch(function(error) {
        console.log("socket-server catch promise: " + error);
    });
    return promise;
}
// export the method to enable code completion when imported in .ts
exports.startSocketServer = startSocketServer;