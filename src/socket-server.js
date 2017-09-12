function startSocketServer() {
    // create express app
    var app = require('express')();
    // pass app to node.js server
    var http = require('http').Server(app);
    // pass server to socket.io
    var io = require('socket.io')(http);
    // must enable cors
    var cors = require('cors');
    app.use(cors());

    app.get('/', function(req, res){
        res.sendFile(__dirname + '/test-socket.html');
    });

    io.on('connection', function(socket){
        // distribute sockets to rooms
        socket.on('ext-room', function(room) {
            console.log('extension room joined');
            socket.join('extension');
            io.to('logroom').emit('chat message', 'extension room joined');
        });
        socket.on('preview-room', function(room) {
            console.log('preview room joined');
            socket.join('preview');
            io.to('logroom').emit('chat message', 'preview room joined');
        });

        socket.on('ext-send-command', function(command) {
            console.log('extension sending command "' + command + '" to preview');
            io.to('preview').emit('preview-receive-command', command);
            io.to('logroom').emit('chat message', 'extension sending command ' + command + ' to preview');
        });
        
        socket.on('preview-send-command', function(command) {
            console.log('preview sending command "' + command + '" to extension');
            io.to('extension').emit('ext-receive-command', command);
            io.to('logroom').emit('chat message', 'preview sending command ' + command + ' to extension');
        });

        socket.on('logroom', function(msg) {
            socket.join('logroom');
            io.emit('chat message', 'logroom created!');
        })
    });

    http.listen(3002, function(){
        console.log('listening on *:3002');
    });
}
// export the method to enable code completion when imported in .ts
exports.startSocketServer = startSocketServer;