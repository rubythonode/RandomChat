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

    this.join = function (room) {
        this.socket.join(room);
    }

    this.leave = function (room) {
        this.socket.leave(room);
    }

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
            if (this.users[i] == user) {
                this.users.splice(i, 1);
                break;
            }
        }
    }

    this.getUser = function (socket) {
        for (var i in this.users) {
            var user = this.users[i];
            if (user.socket == socket)
                return user;
        }
    }

    this.send = function (type, data) {
        for (var i in this.users) {
            var user = this.users[i];
            user.send(type, data);
        }
    }

    this.getCount = function () {
        return this.users.length;
    }

    return this;
}

var RoomManager = new function () {
    this.rooms = io.sockets.adapter.rooms;

    this.create = function (user) {
        user.room = user.socket.id;
        user.join(user.room);
        user.send('join', {'type': 0});
    }

    this.getCount = function (room) {
        var count = 0;
        for (var i in this.rooms[room]) {
            count++;
        }

        return count;
    }

    this.sendAll = function (type, data) {
        for (var room in this.rooms) {
            io.sockets.in(room).emit(type, data);
        }
    }

    this.send = function (room, type, data) {
        io.sockets.in(room).emit(type, data);
    }
}
var getServerDate = function () {
    var d = new Date();
    var m = d.getHours() > 12 ? '오후' : '오전';
    var h = d.getHours() % 12;
    var M = d.getMinutes();
    var res = m + ' ' + h + ':' + M;

    return res;
}

function Notice() {
    RoomManager.sendAll('notice', {'message': '바르고 고운말을 사용합시다.'});
}

setInterval(Notice, 30000);

io.sockets.on('connection', function (socket) {
    socket.leave(socket.id);

    UserManager.addUser(new User(socket));

    console.log('현재 접속자 수: ' + UserManager.getCount());

    socket.on('join', function () {
        if (!RoomManager.rooms) {
            var user = UserManager.getUser(socket);
            RoomManager.create(user);
        } else {
            for (var room in RoomManager.rooms) {
                if (RoomManager.getCount(room) == 1) {
                    var user = UserManager.getUser(socket);
                    user.room = room;
                    user.join(user.room);
                    for (var i in UserManager.users) {
                        if (UserManager.users[i].room == room)
                            UserManager.users[i].send('join', {'type': 1});
                    }
                    RoomManager.send(room, 'notice', {'message': '바르고 고운말을 사용합시다.'});
                    return;
                }
            }
            var user = UserManager.getUser(socket);
            RoomManager.create(user);
        }
    });

    socket.on('left', function () {
        var user = UserManager.getUser(socket);
        user.socket.broadcast.to(user.room).emit('left');
        user.leave(user.room);
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
        user.leave(user.room);
        UserManager.remove(user);
        console.log('현재 접속자 수: ' + UserManager.getCount());
    })
});
