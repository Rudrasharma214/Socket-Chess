const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");

let draggedpiece = null;
let soursesquare = null;
let playerrole = null;

const renderBoard = function () {
    boardElement.innerHTML = "";
    const board = chess.board();

    board.forEach((row, rowIndex) => {
        row.forEach((square, colIndex) => {
            const squareElement = document.createElement("div");
            squareElement.classList.add("square", (rowIndex + colIndex) % 2 === 0 ? "light" : "dark");

            squareElement.dataset.row = rowIndex;
            squareElement.dataset.col = colIndex;

            if (square) {
                const pieceElement = document.createElement("div");
                pieceElement.classList.add("piece", square.color === "w" ? "text-white" : "text-black");
                pieceElement.innerText = getPieceUnicode(square);
                pieceElement.draggable = playerrole === square.color;

                pieceElement.addEventListener("dragstart", (e) => {
                    if (pieceElement.draggable) {
                        draggedpiece = pieceElement;
                        soursesquare = { row: rowIndex, col: colIndex };
                        e.dataTransfer.setData("text/plain", "");
                    }
                });

                squareElement.appendChild(pieceElement);
            }

            squareElement.addEventListener("dragover", (e) => e.preventDefault());
            squareElement.addEventListener("drop", (e) => {
                e.preventDefault();
                if (draggedpiece) {
                    const targetsource = {
                        row: parseInt(squareElement.dataset.row),
                        col: parseInt(squareElement.dataset.col),
                    };
                    handleMove(soursesquare, targetsource);
                }
            });

            squareElement.addEventListener("click", () => {
                if (!soursesquare) {
                    soursesquare = { row: rowIndex, col: colIndex };
                } else {
                    handleMove(soursesquare, { row: rowIndex, col: colIndex });
                    soursesquare = null;
                }
            });

            boardElement.appendChild(squareElement);
        });
    });

    if (playerrole === "b") {
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
    socket.emit("move", move);
};

const getPieceUnicode = function (piece) {
    const unicodePieces = {
        p: "♙", r: "♖", n: "♘", b: "♗", q: "♕", k: "♔",
        P: "♙", N: "♘", R: "♖", B: "♗", Q: "♕", K: "♔",
    };
    return unicodePieces[piece.type] || "";
};

socket.on("playerRole", (role) => {
    playerrole = role;
    renderBoard();
});

socket.on("spectatorRole", () => {
    playerrole = null;
    renderBoard();
});

socket.on("boardState", (fen) => {
    chess.load(fen);
    renderBoard();
});

socket.on("move", (move) => {
    chess.move(move);
    renderBoard();
});

renderBoard();
