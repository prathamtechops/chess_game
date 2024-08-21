import { Player } from "@/App";
import socket from "@/socekt";
import { Chess, Move } from "chess.js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Chessboard } from "react-chessboard";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "./ui/dialog";

interface GameProps {
  players: Player[];
  room: string;
  orientation: "white" | "black";
  cleanup: () => void;
}

const Game: React.FC<GameProps> = ({ players, room, orientation, cleanup }) => {
  const chess = useMemo(() => new Chess(), []);
  const [fen, setFen] = useState<string>(chess.fen());
  const [over, setOver] = useState<string>("");
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [turn, setTurn] = useState<"white" | "black">("white");
  const [error, setError] = useState<string>("");

  const makeAMove = useCallback(
    (move: { from: string; to: string; promotion?: string }): Move | null => {
      try {
        const result = chess.move(move);
        setFen(chess.fen());

        if (result) {
          setMoveHistory((prev) => [
            ...prev,
            `${result.color === "w" ? "White" : "Black"}: ${result.san}`,
          ]);
          setTurn(chess.turn() === "w" ? "white" : "black");
          setError("");
        }

        if (chess.isGameOver()) {
          if (chess.isCheckmate()) {
            setOver(
              `Checkmate! ${chess.turn() === "w" ? "black" : "white"} wins!`
            );
          } else if (chess.isDraw()) {
            setOver("Draw");
          } else {
            setOver("Game over");
          }
        }

        return result;
      } catch (error) {
        console.error(error);
        setError("Invalid move. Please try again.");
        return null;
      }
    },
    [chess]
  );

  function onDrop(sourceSquare: string, targetSquare: string) {
    if (chess.turn() !== orientation[0]) return false;
    if (players.length < 2) return false;

    const moveData = {
      from: sourceSquare,
      to: targetSquare,
      promotion: "q",
    };

    const move = makeAMove(moveData);

    if (move === null) {
      setError(`Invalid move from ${sourceSquare} to ${targetSquare}`);
      return false;
    }

    socket.emit("move", { move, room });

    return true;
  }

  useEffect(() => {
    socket.on("move", (moveData) => {
      makeAMove(moveData);
    });

    return () => {
      socket.off("move");
    };
  }, [makeAMove]);

  return (
    <>
      <div className="flex flex-col md:flex-row gap-4">
        <Chessboard
          position={fen}
          onPieceDrop={onDrop}
          boardOrientation={orientation}
        />
        <div className="md:w-1/3 p-4 border border-gray-300 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Turn: {turn}</h2>
          {error && <p className="text-red-500 mb-2">{error}</p>}
          <h3 className="text-md font-medium mb-2">Move History:</h3>
          <ul className="list-disc list-inside">
            {moveHistory.map((move, index) => (
              <li key={index}>{move}</li>
            ))}
          </ul>
        </div>
      </div>
      <Dialog open={!!over} onOpenChange={() => setOver("")}>
        <DialogTitle>{over}</DialogTitle>
        <DialogDescription>
          {over === "Game over" && (
            <p>{chess.turn() === "w" ? "Black" : "White"} wins by checkmate</p>
          )}
        </DialogDescription>
        <DialogFooter>
          <Button
            onClick={() => {
              cleanup();
              setOver("");
            }}
          >
            Close
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
};

export default Game;
