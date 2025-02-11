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

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", function (req, res) {
    res.render("index", { title: "Chess Game" });
});

io.on("connection", function (uniquesocket) {
    console.log("New connection established. Socket ID:", uniquesocket.id);

    // Assign roles
    if (!players.white) {
        players.white = uniquesocket.id;
        uniquesocket.emit("playerrole", "w");
    } else if (!players.black) {
        players.black = uniquesocket.id;
        uniquesocket.emit("playerrole", "b");
    } else {
        uniquesocket.emit("spectatorrole");
    }

    // Handle disconnect
    uniquesocket.on("disconnect", function () {
        console.log("Disconnected:", uniquesocket.id);
        if (uniquesocket.id === players.white) {
            delete players.white;
        }
        if (uniquesocket.id === players.black) {
            delete players.black;
        }
    });

    // Handle moves
    uniquesocket.on("move", function (move) {
        try {
            console.log("Move received on server:", move);

            if (chess.turn() === "w" && uniquesocket.id !== players.white) return;
            if (chess.turn() === "b" && uniquesocket.id !== players.black) return;

            const result = chess.move(move);
            if (result) {
                moveHistory.push(move);
                io.emit("move", move);
                io.emit("boardState", chess.fen());
            } else {
                console.log("Invalid move:", move);
                uniquesocket.emit("Invalid move", move);
            }
        } catch (err) {
            console.error("Error processing move:", err);
            uniquesocket.emit("Invalid move", move);
        }
    });

    // Handle undo
    uniquesocket.on("undo", function () {
        if (moveHistory.length > 0) {
            chess.undo();
            moveHistory.pop();
            io.emit("undo");
            io.emit("boardState", chess.fen());
        }
    });

    // Check for game over
    uniquesocket.on("move", function (move) {
        if (chess.isGameOver()) {
            const winner = chess.turn() === "w" ? "b" : "w";
            io.emit("gameOver", { winner });
        }
    });
});

server.listen(3000, function () {
    console.log("Listening to port 3000");
});
