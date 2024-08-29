import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "./App.css";
import Game from "./components/Game";
import socket from "./socekt";

export type Player = {
  id: string;
  username: string;
  avatar: string;
  orientation: "white" | "black";
};

type Room = {
  roomId: string;
  players: Player[];
};

function App() {
  const [searchParams] = useSearchParams();
  const [usernameSubmitted, setUsernameSubmitted] = useState<boolean>(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [room, setRoom] = useState<string>("");
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const user_id = searchParams.get("user_id");

  const username = searchParams.get("username");
  const channelId = searchParams.get("channel_id");
  const avatar = searchParams.get("avatar");

  useEffect(() => {
    if (username && channelId) {
      socket.emit("joinRoom", { username, roomId: channelId, avatar, user_id });
      setUsernameSubmitted(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!usernameSubmitted) return;

    const handleRoomJoined = (room: Room) => {
      setRoom(room.roomId);
      setPlayers(room.players);
    };

    const handleStartGame = (room: Room) => {
      setPlayers(room.players);
      setGameStarted(true);
    };

    socket.on("roomJoined", handleRoomJoined);
    socket.on("startGame", handleStartGame);

    return () => {
      socket.off("roomJoined", handleRoomJoined);
      socket.off("startGame", handleStartGame);
      socket.emit("closeRoom", { roomId: room });
    };
  }, [room, usernameSubmitted, user_id]);

  if (!user_id) return null;

  if (!username) return null;

  if (!channelId) return null;

  if (!avatar) return null;

  return (
    <main className="container max-h-screen w-full mx-auto">
      {!usernameSubmitted ||
        (!gameStarted && <h1>Waiting for an opponent...</h1>)}
      {gameStarted && (
        <Game
          players={players}
          room={channelId}
          cleanup={() => socket.emit("closeRoom", { roomId: room })}
          currentPlayerId={user_id}
        />
      )}
    </main>
  );
}

export default App;
