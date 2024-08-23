const express = require("express");
const { Server } = require("socket.io");
const { v4: uuidV4 } = require("uuid");
const http = require("http");
const cors = require("cors");
const app = express();

app.use(
  cors({
    origin: "https://chess-game-bcz7.vercel.app",
    methods: ["GET", "POST"], // Specify the methods allowed
    credentials: true, // Allow credentials if necessary (e.g., cookies)
  })
);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://chess-game-bcz7.vercel.app",
    methods: ["GET", "POST"],
    credentials: true, // Same as above
  },
});

const port = process.env.PORT || 3000;

const rooms = new Map();

app.get("/", (req, res) => {
  res.send("Hello World!");
});

io.on("connection", (socket) => {
  console.log(`${socket.id} connected`);

  socket.on("username", async (username) => {
    console.log(`Username received: ${username}`);
    socket.data.username = username;

    // Find a room with only one player
    let roomId = null;
    for (const [id, room] of rooms.entries()) {
      if (room.players.length === 1) {
        roomId = id;
        break;
      }
    }

    if (!roomId) {
      roomId = uuidV4();
      rooms.set(roomId, {
        roomId,
        players: [],
      });
    }

    await socket.join(roomId);
    const room = rooms.get(roomId);
    room.players.push({ id: socket.id, username });
    rooms.set(roomId, room);

    console.log(`Socket joined room: ${roomId}`);
    console.log(`Room updated: ${JSON.stringify(room)}`);

    socket.emit("roomJoined", room);
    if (room.players.length === 2) {
      io.to(roomId).emit("startGame", room);
    }
  });

  socket.on("move", (data) => {
    console.log(`Move received: ${JSON.stringify(data)}`);
    socket.to(data.room).emit("move", data.move);
  });

  socket.on("disconnect", () => {
    console.log(`${socket.id} disconnected`);
    const gameRooms = Array.from(rooms.values());

    gameRooms.forEach((room) => {
      const userInRoom = room.players.find((player) => player.id === socket.id);

      if (userInRoom) {
        if (room.players.length < 2) {
          rooms.delete(room.roomId);
          console.log(`Room deleted: ${room.roomId}`);
          return;
        }

        socket.to(room.roomId).emit("playerDisconnected", userInRoom);
        console.log(`Player disconnected from room: ${room.roomId}`);
      }
    });
  });

  socket.on("closeRoom", async (data) => {
    console.log(`Close room request received for room ID: ${data.roomId}`);
    socket.to(data.roomId).emit("closeRoom", data);

    const clientSockets = await io.in(data.roomId).fetchSockets();
    clientSockets.forEach((s) => {
      s.leave(data.roomId);
      console.log(`Socket left room: ${data.roomId}`);
    });

    rooms.delete(data.roomId);
    console.log(`Room deleted: ${data.roomId}`);
  });
});

server.listen(port, () => {
  console.log(`listening on *:${port}`);
});
