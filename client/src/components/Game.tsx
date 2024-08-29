// Game.tsx
import { Player } from "@/App";
import socket from "@/socekt";
import { Chess, Move } from "chess.js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Chessboard } from "react-chessboard";

interface GameProps {
  players: Player[];
  room: string;
  cleanup: () => void;
  currentPlayerId: string | null;
}

const Game: React.FC<GameProps> = ({
  players,
  room,
  // cleanup,
  currentPlayerId,
}) => {
  const chess = useMemo(() => new Chess(), []);
  const [fen, setFen] = useState<string>(chess.fen());
  const [over, setOver] = useState<string>("");
  const [error, setError] = useState<string>("");

  const currentPlayerColour = players.find(
    (player) => player.id === currentPlayerId
  )?.orientation;

  const makeAMove = useCallback(
    (move: { from: string; to: string; promotion?: string }): Move | null => {
      try {
        const result = chess.move(move);
        if (result) {
          setFen(chess.fen());
          setError("");

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
        } else {
          setError("Invalid move. Please try again.");
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
    if (!currentPlayerColour) return false;
    const playerTurn = currentPlayerColour === "white" ? "w" : "b";

    if (chess.turn() !== playerTurn) {
      setError("It's not your turn!");
      return false;
    }

    const moveData = {
      from: sourceSquare,
      to: targetSquare,
      promotion: "q",
    };

    const move = makeAMove(moveData);

    if (move) {
      socket.emit("move", { move: moveData, room });
    }

    return !!move;
  }

  useEffect(() => {
    const handleMove = (moveData: {
      from: string;
      to: string;
      promotion?: string;
    }) => {
      makeAMove(moveData); // Make the move when received from the socket
    };

    socket.on("move", handleMove);

    return () => {
      socket.off("move", handleMove);
    };
  }, [makeAMove]);

  const opponent = players.find(
    (player) => player.id !== currentPlayerId
  )?.username;
  const avatar = players.find(
    (player) => player.id === currentPlayerId
  )?.avatar;

  return (
    <>
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex items-center">
          <img src={avatar} alt="Avatar" className="size-12 rounded-full" />
          <p className="text-2xl  font-semibold p-2">{opponent}</p>
        </div>
        <div className="w-full md:w-2/3 flex justify-center items-center">
          <Chessboard
            position={fen}
            onPieceDrop={onDrop}
            boardOrientation={currentPlayerColour}
            customBoardStyle={{
              borderRadius: "10px",
              boxShadow:
                "0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)",
            }}
          />
        </div>
        <div>
          <p className="text-2xl  font-semibold p-2">
            {chess.turn() === "w" ? "White" : "Black"}'s turn
          </p>
          <p className="text-2xl  font-semibold p-2">{error}</p>
          <p className="text-2xl  font-semibold p-2">{over}</p>
        </div>
      </div>
    </>
  );
};

export default Game;
