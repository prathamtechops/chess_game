import { io } from "socket.io-client";

const socket = io(
  "https://convosechessgame-ghbac4hhdud9bcd7.eastus-01.azurewebsites.net/",
  {
    transports: ["websocket"],
  }
);

// const socket = io("http://localhost:8000/", {
//   transports: ["websocket"],
// });

export default socket;
