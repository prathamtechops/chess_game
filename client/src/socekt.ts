import { io } from "socket.io-client";

const socket = io("https://chess-game-backend-oxbc.onrender.com/", {
  transports: ["websocket"],
});

// const socket = io("http://localhost:3000/", {
//   transports: ["websocket"],
// });

export default socket;
