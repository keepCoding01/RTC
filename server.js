const path = require('path');
const { createServer } = require('http');
const express = require('express');
const socketio = require('socket.io');
const formatMessage = require('./utils/messages.js').default;
const users = require('./utils/users.js').default;

const { userJoin, getCurrentUser, userLeave, getRoomUsers } = users;

const app = express();
const server = createServer(app);
const io = socketio(server);

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

const botName = "Bot";

// Run when client connects
io.on("connection", socket => {
    socket.on('joinRoom', ({ username, room }) => {
        const user = userJoin(socket.id, username, room);
        socket.join(user.room);

        // Welcome current user
        socket.emit('message', formatMessage(botName, 'Welcome to RTC!'));
        // Kirim pesan selamat datang ke user
        socket.emit('message', formatMessage(botName, `Welcome to ${user.room}!`));

        // Broadcast ke semua user di ruangan bahwa ada user yang bergabung
        socket.broadcast.to(user.room).emit(
            'message',
            formatMessage(botName, `${user.username} has joined the chat`)
        );

        // Send users and room info
        io.to(user.room).emit('roomUsers', {
            room: user.room,
            users: getRoomUsers(user.room)
        });
    });

    // Listen for chatMessage
    socket.on('chatMessage', msg => {
        const user = getCurrentUser(socket.id);
        if (user) {
            io.to(user.room).emit('message', formatMessage(user.username, msg));
        }
    });

    socket.on('disconnect', () => {
        const user = userLeave(socket.id);

        if (user) {
            io.to(user.room).emit(
                'message',
                formatMessage(botName, `${user.username} has left the chat`)
            );

            // Perbarui daftar pengguna di room
            io.to(user.room).emit('roomUsers', {
                room: user.room,
                users: getRoomUsers(user.room)
            });
        }
    });
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
