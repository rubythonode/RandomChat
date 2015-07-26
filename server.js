var http = require('http');
var fs = require('fs');
var socket_io = require('socket.io');

var server = http.createServer(function (request, resopnse) {
    fs.readFile('index.html', function (error, data) {
        resopnse.writeHead(200, {'Content-Type': 'text/html'});
        resopnse.end(data);
    })
});

server.listen(80, function () {
    console.log('Server Running at http://127.0.0.1');
});

var io = socket_io.listen(server);

var sockets = new Array();

var roomCount = 0;

var getClients = function (roomName) {
    var clients = io.sockets.adapter.rooms[roomName];
    var count = 0;

    for (var client in clients) {
        count++;
    }

    return count;
}

var getServerDate = function () {
    var d = new Date();
    var m = parseInt(d.getHours() / 12) > 1 ? '오후' : '오전';
    var h = d.getHours() % 12;
    var M = d.getMinutes();
    var res = m + ' ' + h + ':' + M;

    return res;
}

io.sockets.on('connection', function (socket) {
    socket.leave(socket.id);

    socket.on('join', function () {
        var rooms = io.sockets.adapter.rooms;

        if (!rooms) {
            console.log("방이 없어서 만듭니다.");
            sockets[socket.id] = socket.id;
            socket.join(socket.id);
            socket.emit('join', {'type': 0});
        } else {
            for (var room in rooms) {
                if (getClients(room) == 1) {
                    console.log("방에 접속했습니다.");
                    sockets[socket.id] = room;
                    socket.join(room);
                    io.sockets.in(sockets[socket.id]).emit('join', {'type': 1});
                    return;
                }
            }
            console.log("방이 없어서 만듭니다.");
            sockets[socket.id] = socket.id;
            socket.join(socket.id);
            socket.emit('join', {'type': 0});
        }
    });

    socket.on('left', function () {
        socket.broadcast.to(sockets[socket.id]).emit('left');
        socket.leave(sockets[socket.id]);
    });

    socket.on('date', function () {
        socket.emit('date', getServerDate());
    })

    socket.on('message', function (data) {
        socket.broadcast.to(sockets[socket.id]).emit('message', {'no': 0, 'message': data, 'date': getServerDate()});
        socket.emit('message', {'no': 1, 'message': data, 'date': getServerDate()});
    });

    socket.on('disconnect', function () {
        socket.broadcast.to(sockets[socket.id]).emit('left');
        socket.leave(sockets[socket.id]);
    })
});
