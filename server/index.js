const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
const cors = require("cors");
const app = express();

app.use(cors({ origin: "*" }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  transports: ["websocket"],
});

const port = process.env.PORT || 3000;
const rooms = new Map();

app.get("/", (req, res) => {
  res.send("Hello World!");
});

io.on("connection", (socket) => {
  // Correcting the room join logic
  socket.on("joinRoom", async ({ username, roomId, avatar, user_id }) => {
    console.log(`Username received: ${username}, Room ID: ${roomId}`); // Corrected log
    socket.data.username = username;
    socket.data.user_id = user_id;

    if (!rooms.has(roomId)) {
      rooms.set(roomId, { roomId, players: [] });
    }

    const room = rooms.get(roomId);

    // Assign orientation based on the number of players in the room
    if (!room.players.some((player) => player.id === user_id)) {
      const playerOrientation =
        room.players.length === 0
          ? "white"
          : room.players.length === 1
          ? "black"
          : null;

      if (playerOrientation) {
        room.players.push({
          id: user_id,
          username,
          avatar,
          orientation: playerOrientation,
        });
      }
      rooms.set(roomId, room);
    }

    await socket.join(roomId);

    if (room.players.length === 2) {
      io.to(roomId).emit("startGame", room); // Ensuring both players are ready before starting
    }
  });

  socket.on("requestPlayAgain", ({ room }) => {
    socket.to(room).emit("playAgainRequest"); // Notify the other player
  });

  // Handle accepting play again request
  socket.on("acceptPlayAgain", ({ room }) => {
    io.to(room).emit("playAgainAccepted"); // Restart game for both players
  });

  socket.on("move", (data) => {
    socket.to(data.room).emit("move", data.move);
  });

  socket.on("disconnect", () => {
    const gameRooms = Array.from(rooms.values());

    gameRooms.forEach((room) => {
      const playerIndex = room.players.findIndex(
        (player) => player.id === socket.data.user_id
      );

      // Remove player from room if found
      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
      }

      // Remove room if no players are left
      if (room.players.length === 0) {
        rooms.delete(room.roomId);
      } else {
        // Notify other players of the disconnection
        socket.to(room.roomId).emit("playerDisconnected", socket.data.username);
      }
    });
  });

  socket.on("closeRoom", async (data) => {
    console.log(`Close room request received for room ID: ${data.roomId}`);
    const room = rooms.get(data.roomId);

    if (room) {
      // Notify all clients in the room about the closure
      socket.to(data.roomId).emit("closeRoom", data);

      // Fetch all client sockets in the room and disconnect them
      const clientSockets = await io.in(data.roomId).fetchSockets();
      clientSockets.forEach((s) => {
        s.leave(data.roomId);
        console.log(`Socket left room: ${data.roomId}`);
      });

      // Remove room from the Map
      rooms.delete(data.roomId);
      console.log(`Room deleted: ${data.roomId}`);
    }
  });
});

server.listen(port, () => {
  console.log(`Listening on *:${port}`);
});
