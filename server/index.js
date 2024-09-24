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

const port = process.env.PORT || 8000;
const rooms = new Map();

// Utility function to sanitize room data
function sanitizeRoom(room) {
  return {
    roomId: room.roomId,
    players: room.players.map(
      ({ id, username, avatar, orientation, remainingTime }) => ({
        id,
        username,
        avatar,
        orientation,
        remainingTime,
      })
    ),
    currentTurn: room.currentTurn,
  };
}

const GAME_TIME = 600; // 10 minutes in seconds

io.on("connection", (socket) => {
  socket.on("joinRoom", async ({ username, roomId, avatar, user_id }) => {
    socket.data.username = username;
    socket.data.user_id = user_id;

    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        roomId,
        players: [],
        currentTurn: null,
        timer: null,
      });
    }

    const room = rooms.get(roomId);

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
          remainingTime: GAME_TIME,
        });
        room.currentTurn = room.players[0].id;
        rooms.set(roomId, room);
      }
    }

    await socket.join(roomId);

    if (room.players.length === 2) {
      io.to(roomId).emit("startGame", sanitizeRoom(room));
      startTimer(roomId);
    }
  });

  socket.on("move", (data) => {
    const room = rooms.get(data.room);
    if (!room || room.players.length < 2) return;

    const currentPlayer = room.players.find((p) => p.id === room.currentTurn);
    if (!currentPlayer) return;

    // Switch turn
    room.currentTurn = room.players.find((p) => p.id !== room.currentTurn).id;
    rooms.set(data.room, room);

    // Emit move to opponent
    socket.to(data.room).emit("move", data.move);

    // Reset timer
    resetTimer(data.room);
  });

  socket.on("requestPlayAgain", ({ room }) => {
    socket.to(room).emit("playAgainRequest");
  });

  socket.on("acceptPlayAgain", ({ room }) => {
    const roomData = rooms.get(room);
    if (roomData) {
      roomData.players.forEach((player) => (player.remainingTime = GAME_TIME));
      roomData.currentTurn = roomData.players[0].id;
      rooms.set(room, roomData);
      io.to(room).emit("playAgainAccepted", sanitizeRoom(roomData));
      resetTimer(room);
    }
  });

  socket.on("disconnect", () => {
    rooms.forEach((room, roomId) => {
      const playerIndex = room.players.findIndex(
        (player) => player.id === socket.data.user_id
      );

      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
        rooms.set(roomId, room);
      }

      if (room.players.length === 0) {
        clearInterval(room.timer);
        rooms.delete(roomId);
      } else {
        socket.to(roomId).emit("playerDisconnected", socket.data.username);
      }
    });
  });

  socket.on("closeRoom", async (data) => {
    const room = rooms.get(data.roomId);
    if (room) {
      socket.to(data.roomId).emit("closeRoom", data);
      const clientSockets = await io.in(data.roomId).fetchSockets();
      clientSockets.forEach((s) => {
        s.leave(data.roomId);
      });
      clearInterval(room.timer);
      rooms.delete(data.roomId);
    }
  });
});

// Timer Functions
function startTimer(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  if (room.timer) {
    clearInterval(room.timer);
  }

  room.timer = setInterval(() => {
    const currentPlayer = room.players.find((p) => p.id === room.currentTurn);
    if (!currentPlayer) return;

    currentPlayer.remainingTime -= 1;

    io.to(roomId).emit("timeUpdate", {
      playerId: currentPlayer.id,
      remainingTime: currentPlayer.remainingTime,
    });

    if (currentPlayer.remainingTime <= 0) {
      io.to(roomId).emit("gameOver", {
        winner: room.players.find((p) => p.id !== currentPlayer.id).id,
        reason: "time",
      });
      clearInterval(room.timer);
    }
  }, 1000);

  rooms.set(roomId, room);
}

function resetTimer(roomId) {
  const room = rooms.get(roomId);
  if (room && room.timer) {
    clearInterval(room.timer);
    startTimer(roomId);
  }
}

server.listen(port, () => {
  console.log(`Listening on *:${port}`);
});
