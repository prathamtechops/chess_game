import { io } from "socket.io-client";

const socket = io("https://chess-game-backend-oxbc.onrender.com/", {
  transports: ["websocket"],
});

export default socket;
