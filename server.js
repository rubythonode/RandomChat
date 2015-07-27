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
    this.names = new Array();

    this.create = function (user) {
        this.names.push(user.socket.id);
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

    var user = UserManager.getUser(socket);

    console.log('현재 접속자 수: ' + UserManager.getCount());

    socket.on('join', function () {
        if (!RoomManager.names.length) {
            RoomManager.create(user);
        } else {
            user.room = RoomManager.names[0];
            user.join(user.room);
            for (var i in UserManager.users) {
                if (UserManager.users[i].room == user.room)
                    UserManager.users[i].send('join', {'type': 1});
            }
            RoomManager.send(user.room, 'notice', {'message': '바르고 고운말을 사용합시다.'});
            RoomManager.names.splice(0, 1);
        }
    });

    socket.on('left', function () {
        user.socket.broadcast.to(user.room).emit('left');
        user.leave(user.room);
    });

    socket.on('date', function () {
        user.send('date', getServerDate());
    })

    socket.on('message', function (data) {
        user.socket.broadcast.to(user.room).emit('message', {'no': 0, 'message': data, 'date': getServerDate()});
        user.send('message', {'no': 1, 'message': data, 'date': getServerDate()});
    });

    socket.on('disconnect', function () {
        user.socket.broadcast.to(user.room).emit('left');
        user.leave(user.room);
        UserManager.remove(user);
        console.log('현재 접속자 수: ' + UserManager.getCount());
    })
});
