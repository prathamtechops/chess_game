import { useEffect, useState } from "react";
import "./App.css";
import Game from "./components/Game";
import { Button } from "./components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import socket from "./socekt";

export type Player = {
  id: string;
  username: string;
};

type Room = {
  roomId: string;
  players: Player[];
};

function App() {
  const [username, setUsername] = useState<string>("");
  const [usernameSubmitted, setUsernameSubmitted] = useState<boolean>(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [room, setRoom] = useState<string>("");
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [gameStarted, setGameStarted] = useState<boolean>(false);

  const onSubmit = () => {
    if (!username) {
      return;
    }
    socket.emit("username", username);
    setUsernameSubmitted(true);
  };

  useEffect(() => {
    if (usernameSubmitted) {
      socket.on("roomJoined", (room: Room) => {
        setRoom(room.roomId);
        setPlayers(room.players);

        const player = room.players.find((player) => player.id === socket.id);
        setOrientation(
          player && room.players.indexOf(player) === 0 ? "white" : "black"
        );
      });

      socket.on("startGame", (room: Room) => {
        setPlayers(room.players);
        setGameStarted(true);
      });

      return () => {
        socket.emit("closeRoom", { roomId: room });
      };
    }
  }, [usernameSubmitted, room]);

  return (
    <main className="container size-full mx-auto">
      <Dialog open={!usernameSubmitted}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Enter Username</DialogTitle>
            <DialogDescription>Please enter your username.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Username
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={onSubmit} type="submit">
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {usernameSubmitted && !gameStarted && <h1>Waiting for an opponent...</h1>}
      {gameStarted && (
        <Game
          players={players}
          room={room}
          orientation={orientation}
          cleanup={() => socket.emit("closeRoom", { roomId: room })}
        />
      )}
    </main>
  );
}

export default App;
