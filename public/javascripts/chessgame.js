const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");
const undoButton = document.getElementById("undoButton");

let selectedPiece = null;
let playerRole = null;
let moveHistory = [];

const renderBoard = function () {
    const board = chess.board();
    boardElement.innerHTML = ""; // Clear previous board rendering
    board.forEach((row, rowIndex) => {
        row.forEach((square, squareIndex) => {
            const squareElement = document.createElement("div");
            squareElement.classList.add(
                "square",
                (rowIndex + squareIndex) % 2 === 0 ? "light" : "dark"
            );

            const squareName = `${String.fromCharCode(97 + squareIndex)}${8 - rowIndex}`;
            squareElement.dataset.square = squareName;

            if (square) {
                const pieceElement = document.createElement("div");
                pieceElement.classList.add(
                    "piece",
                    square.color === "w" ? "white" : "black"
                );
                pieceElement.innerText = getPieceUnicode(square);
                pieceElement.dataset.square = squareName;
                pieceElement.draggable = playerRole === square.color;

                pieceElement.addEventListener("click", () => {
                    if (playerRole === square.color) {
                        highlightLegalMoves(squareName);
                    }
                });

                squareElement.appendChild(pieceElement);
            }

            squareElement.addEventListener("click", () => {
                if (selectedPiece && squareElement.classList.contains("highlight")) {
                    handleMove(selectedPiece, squareName);
                }
            });

            boardElement.appendChild(squareElement);
        });
    });

    if (playerRole === "b") {
        boardElement.classList.add("flipped");
    } else {
        boardElement.classList.remove("flipped");
    }
};

const highlightLegalMoves = function (square) {
    const legalMoves = chess.moves({ square, verbose: true });
    clearHighlights();
    selectedPiece = square;
    legalMoves.forEach(move => {
        const targetSquare = document.querySelector(`[data-square="${move.to}"]`);
        if (targetSquare) {
            targetSquare.classList.add("highlight");
        }
    });
};

const clearHighlights = function () {
    document.querySelectorAll(".highlight").forEach(square => {
        square.classList.remove("highlight");
    });
};

const handleMove = function (from, to) {
    const move = { from, to, promotion: "q" };
    socket.emit("move", move);
    selectedPiece = null;
    clearHighlights();
};

const undoMove = function () {
    socket.emit("undo");
};

const getPieceUnicode = function (piece) {
    const unicodePieces = {
        p: "♙", r: "♖", n: "♘", b: "♗", q: "♕", k: "♔",
        P: "♙", R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔",
    };
    return unicodePieces[piece.type] || "";
};

socket.on("playerrole", function (role) {
    console.log("Assigned role:", role);
    playerRole = role;
    renderBoard();
});

socket.on("spectatorrole", function () {
    console.log("Assigned as spectator");
    playerRole = null;
    renderBoard();
});

socket.on("boardState", function (fen) {
    console.log("Board state received:", fen);
    chess.load(fen);
    renderBoard();
});

socket.on("move", function (move) {
    console.log("Move received:", move);
    chess.move(move);
    moveHistory.push(move);
    renderBoard();
});

socket.on("undo", function () {
    if (chess.history().length > 0) {
        chess.undo();
        renderBoard();
    }
});

socket.on("gameOver", function ({ winner }) {
    if (playerRole === winner) {
        alert("Congratulations! You won!");
    } else if (playerRole) {
        alert("Sorry, you lost.");
    } else {
        alert("Game over!");
    }
});

if (undoButton) {
    undoButton.addEventListener("click", undoMove);
}

renderBoard();
