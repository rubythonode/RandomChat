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

var User = function (socket) {
    this.socket = socket;
    this.room = "";

    this.send = function (type, data) {
        this.socket.emit(type, data);
    }

    return this;
}

var UserManager = new function () {
    this.users = new Array();


    this.addUser = function (user) {
        this.users.push(user);
    }

    this.remove = function (user) {
        for (var i in this.users) {
            var user = this.users[i];
            if (this.user == user) {
                this.users.splice(i, 1);
                break;
            }
        }
    }

    this.getUser = function (socket) {
        for (var i in this.users) {
            var user = this.users[i];
            if (user.socket == socket)
                return user
        }
    }

    this.send = function (type, data) {
        for (var i in this.users) {
            var user = this.users[i];
            user.send(type, data);
        }
    }

    return this;
}

var Room = function (room) {
    this.room = room;
    this.count = 0;

    return this;
}

var RoomManager = new function () {
    this.rooms = new Array();

    return this;
}

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

    UserManager.addUser(new User(socket));

    socket.on('join', function () {
        var rooms = io.sockets.adapter.rooms;

        console.log(rooms);

        if (!rooms) {
            var user = UserManager.getUser(socket);
            user.room = user.socket.id;
            user.socket.join(user.room);
            user.send('join', {'type': 0});
        } else {
            for (var room in rooms) {
                if (getClients(room) == 1) {
                    var user = UserManager.getUser(socket);
                    user.room = room;
                    user.socket.join(user.room);
                    for (var u in UserManager.users) {
                        if (UserManager.users[u].room == room)
                            UserManager.users[u].send('join', {'type': 1});
                    }
                    return;
                }
            }
            var user = UserManager.getUser(socket);
            user.room = user.socket.id;
            user.socket.join(user.room);
            user.send('join', {'type': 0});
        }
    });

    socket.on('left', function () {
        var user = UserManager.getUser(socket);
        user.socket.broadcast.to(user.room).emit('left');
        user.socket.leave(user.room);
    });

    socket.on('date', function () {
        var user = UserManagge.getUser(socket);
        user.send('date', getServerDate());
    })

    socket.on('message', function (data) {
        var user = UserManager.getUser(socket);
        user.socket.broadcast.to(user.room).emit('message', {'no': 0, 'message': data, 'date': getServerDate()});
        user.send('message', {'no': 1, 'message': data, 'date': getServerDate()});
    });

    socket.on('disconnect', function () {
        var user = UserManager.getUser(socket);
        user.socket.broadcast.to(user.room).emit('left');
        user.socket.leave(user.room);
        UserManager.remove(user);
    })
});
