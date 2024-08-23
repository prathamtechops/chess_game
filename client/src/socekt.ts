import { io } from "socket.io-client";

const socket = io("https://chess-game-amber-omega.vercel.app/", {
  transports: ["websocket"],
});

export default socket;
