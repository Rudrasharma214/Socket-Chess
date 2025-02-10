const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");
const undoButton = document.getElementById("undoButton");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;
let selectedPiece = null; // Track selected piece

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

            squareElement.dataset.row = rowIndex;
            squareElement.dataset.col = squareIndex;

            if (square) {
                const pieceElement = document.createElement("div");
                pieceElement.classList.add(
                    "piece",
                    square.color === "w" ? "white" : "black"
                );
                pieceElement.innerText = getPieceUnicode(square);
                pieceElement.draggable = playerRole === square.color;

                pieceElement.addEventListener("dragstart", (e) => {
                    if (pieceElement.draggable) {
                        draggedPiece = pieceElement;
                        sourceSquare = { row: rowIndex, col: squareIndex };
                        e.dataTransfer.setData("text/plain", "");
                    }
                });

                pieceElement.addEventListener("dragend", () => {
                    draggedPiece = null;
                    sourceSquare = null;
                });

                pieceElement.addEventListener("click", () => {
                    if (square.color === playerRole) {
                        highlightLegalMoves(rowIndex, squareIndex);
                    }
                });

                squareElement.appendChild(pieceElement);
            }

            squareElement.addEventListener("dragover", (e) => {
                e.preventDefault();
            });

            squareElement.addEventListener("drop", (e) => {
                e.preventDefault();
                if (draggedPiece) {
                    const targetSquare = {
                        row: parseInt(squareElement.dataset.row),
                        col: parseInt(squareElement.dataset.col),
                    };
                    handleMove(sourceSquare, targetSquare);
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

const handleMove = function (source, target) {
    const move = {
        from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
        to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
        promotion: "q",
    };
    console.log("Move object:", move);
    socket.emit("move", move);
    clearHighlights(); // Clear highlights after move
};

const highlightLegalMoves = function (row, col) {
    clearHighlights();

    const square = chess.board()[row][col];
    if (!square) return;

    const piecePosition = `${String.fromCharCode(97 + col)}${8 - row}`;
    const moves = chess.moves({ square: piecePosition, verbose: true });

    moves.forEach((move) => {
        const targetCol = move.to.charCodeAt(0) - 97;
        const targetRow = 8 - parseInt(move.to[1]);

        const squareElement = document.querySelector(
            `[data-row="${targetRow}"][data-col="${targetCol}"]`
        );
        if (squareElement) {
            squareElement.classList.add("highlight");
        }
    });
};

const clearHighlights = function () {
    document.querySelectorAll(".highlight").forEach((element) => {
        element.classList.remove("highlight");
    });
};

const getPieceUnicode = function (piece) {
    const unicodePieces = {
        p: "♙",
        r: "♖",
        n: "♘",
        b: "♗",
        q: "♕",
        k: "♔",
        P: "♙",
        R: "♖",
        N: "♘",
        B: "♗",
        Q: "♕",
        K: "♔",
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
    renderBoard();
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

// Handle Undo Move
undoButton.addEventListener("click", () => {
    socket.emit("undoMove");
});

socket.on("undoMove", function (fen) {
    console.log("Undo move received, new FEN:", fen);
    chess.load(fen);
    renderBoard();
});


renderBoard();
