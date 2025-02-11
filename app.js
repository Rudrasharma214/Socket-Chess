const express = require("express");
const http = require("http");
const socket = require("socket.io");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socket(server);
const chess = new Chess();

let players = {};
let moveHistory = [];
let redoStack = [];

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", function (req, res) {
    res.render("index", { title: "Chess Game" });
});

io.on("connection", function (uniquesocket) {
    console.log("New connection established. Socket ID:", uniquesocket.id);

    if (!players.white) {
        players.white = uniquesocket.id;
        uniquesocket.emit("playerrole", "w");
    } else if (!players.black) {
        players.black = uniquesocket.id;
        uniquesocket.emit("playerrole", "b");
    } else {
        uniquesocket.emit("spectatorrole");
    }

    uniquesocket.on("disconnect", function () {
        console.log("Disconnected:", uniquesocket.id);
        if (uniquesocket.id === players.white) {
            delete players.white;
        }
        if (uniquesocket.id === players.black) {
            delete players.black;
        }
    });

    uniquesocket.on("move", function (move) {
        try {
            console.log("Move received on server:", move);

            if (chess.turn() === "w" && uniquesocket.id !== players.white) return;
            if (chess.turn() === "b" && uniquesocket.id !== players.black) return;

            const result = chess.move(move);
            if (result) {
                moveHistory.push(move);
                redoStack = []; // Clear redo stack when a new move is made
                io.emit("move", move);
                io.emit("boardState", chess.fen());

                if (chess.isGameOver()) {
                    const winner = chess.turn() === "w" ? "b" : "w";
                    io.emit("gameOver", { winner });
                }
            } else {
                console.log("Invalid move:", move);
                uniquesocket.emit("Invalid move", move);
            }
        } catch (err) {
            console.error("Error processing move:", err);
            uniquesocket.emit("Invalid move", move);
        }
    });

    uniquesocket.on("undo", function () {
        if (moveHistory.length > 0) {
            const lastMove = moveHistory.pop();
            redoStack.push(lastMove);
            chess.undo();
            io.emit("boardState", chess.fen());
        }
    });

    uniquesocket.on("redo", function () {
        if (redoStack.length > 0) {
            const redoMove = redoStack.pop();
            chess.move(redoMove.move);
            moveHistory.push(redoMove);
            io.emit("boardState", chess.fen());
        }
    });
});

server.listen(3000, function () {
    console.log("Listening to port 3000");
});
