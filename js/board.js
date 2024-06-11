class Tile {
	constructor(x, y, sq, tileID, piece) {
		this.x = x;
		this.y = y;
		this.sq = sq;
		this.piece = piece || false;
		this.tileID = tileID;
		this.box = [x, y, sq, sq];
		this.color = this.piece ? (this.piece[0] == "w" ? "white" : "black") : false;
	}
}

class Board {
	constructor() {
		this.loadImages();

		this.domCanvas = document.querySelector("#board");
		this.ctx = this.domCanvas.getContext("2d");
		this.domAnimateCanvas = document.querySelector("#animateBoard");
		this.animateCtx = this.domAnimateCanvas.getContext("2d");
		this.resizeCanvas();

		this.didClick = false;
		this.mouseDown = false;
		this.draggedPieceVisible = false;
		this.hideDraggedPiece = false;
		// this.clearMouseUp = false;

		window.addEventListener("resize", () => {
			this.resizeCanvas();
		});

		// this.domCanvas.addEventListener("click", (event) => {
		// 	let boardPosition = this.domCanvas.getBoundingClientRect(),
		// 		x = event.x - boardPosition.x,
		// 		y = event.y - boardPosition.y;
		// 	this.setActiveTile(x, y, true);
		// 	this.log("mouse click / " + new Date())
		// });

		this.domCanvas.addEventListener("mouseup", (event) => {
			let boardPosition = this.domCanvas.getBoundingClientRect(),
				x = event.x - boardPosition.x,
				y = event.y - boardPosition.y;

			if (this.mouseDown) {
				this.mouseDown = false;
				if (this.initMouseX == x && this.initMouseY == y) {
					this.log("mouse up -> click / " + new Date())
					this.didClick = true;
				} else {
					this.log("mouse up / " + new Date());
					// if (!this.clearMouseUp) {
					// 	this.setActiveTile(x, y, false);
					// } else {
					// 	this.log("CLEAR mouse up / " + new Date());
					// 	this.clearMouseUp = false;
					// }

					this.setActiveTile(x, y, false);
				}
				
				this.cancelDrag();
				this.drawTiles();
			}
		});

		this.domCanvas.addEventListener("mousemove", (event) => {
			if (this.mouseDown) {
				let boardPosition = this.domCanvas.getBoundingClientRect(),
					x = event.x - boardPosition.x,
					y = event.y - boardPosition.y;
				// this.log(`mouse move / (${x}, ${y}) ${new Date()}`);
				this.draggedPieceVisible = true;
				if (!this.hideDraggedPiece) {
					this.hideDraggedPiece = true;
					this.drawTiles();
				}
				this.drawDraggedPiece(x, y);
				this.log(`dragging: ${this.mouseDown}`)
			} else {
				this.draggedPieceVisible = false;
			}
			
			return;
		});

		this.domCanvas.addEventListener("mousedown", (event) => {
			if (this.gameOver) {
				return;
			}
			let boardPosition = this.domCanvas.getBoundingClientRect(),
				x = event.x - boardPosition.x,
				y = event.y - boardPosition.y;

			this.mouseDown = true;

			if (this.didClick) {
				this.log(`mouse down - CLICK / ${new Date()}`)
				this.setActiveTile(x, y, false);
			} else {
				this.log(`mouse down - NO CLICK / ${new Date()}`)
				this.setActiveTile(x, y, true);
			}
			return;
		});

		this.domCanvas.addEventListener("mouseout", (event) => {
			if (this.mouseDown) {
				let boardPosition = this.domCanvas.getBoundingClientRect(),
					x = event.x - boardPosition.x,
					y = event.y - boardPosition.y;
				this.setActiveTile(x, y, false);
			}

			this.mouseDown = false;

			// this.log("mouse out / " + new Date())
			return;
		});

		window.addEventListener("blur", (event) => {
			if (this.mouseDown) {
				let boardPosition = this.domCanvas.getBoundingClientRect(),
					x = event.x - boardPosition.x,
					y = event.y - boardPosition.y;
				this.setActiveTile(x, y, false);
			}

			this.mouseDown = false;

			// this.log("blur / " + new Date())
			return;
		});
	}

	setGameOver(status) {
		this.gameOver = status;
		if (this.gameOver) {
			this.log("GAME OVER")
			this.drawTiles();
		}
	}

	cancelDrag() {
		this.animateCtx.clearRect(0, 0, this.max, this.max);
		this.draggedPieceVisible = false;
		this.hideDraggedPiece = false;
	}

	drawDraggedPiece(x, y) {
		this.animateCtx.clearRect(0, 0, this.max, this.max);
		if (this.activeTile) {
			this.animateCtx.drawImage(this.pieceImages[this.activeTile.piece], x - (this.square / 2), y - (this.square / 2), this.square, this.square);
		}
	}

	setActiveTile(x, y, dragStart) {
		if (this.boardTiles) {
			if (dragStart) {
				this.initMouseX = x;
				this.initMouseY = y;
			}

			let targetValid = false;

			this.boardTiles.forEach(tile => {
				if (this.clickInBox(x, y, tile.box)) {
					// this.log(tile);

					targetValid = true;

					if (!this.activeTile) {
						if (!tile.piece) {
							return;
						}

						if (tile.color == this.playerColor) {
							this.activeTile = tile;
							return;
						}
					} else {
						if (this.activeTile.tileID == tile.tileID && !this.didClick) {
							this.activeTile = false;
							return;
						}

						this.log(`ATTEMPT MOVE: ${this.activeTile.tileID} to ${tile.tileID}`);
						if (game.tryMove(this.activeTile.tileID, tile.tileID)) {
							this.log(`VALID MOVE - click? ${this.didClick}`);

							this.didClick = false;
							this.activeTile = false;
							this.mouseDown = false;
							// this.clearMouseUp = true;
							return;
						} else {
							this.log(`INVALID MOVE - click? ${this.didClick}`);
	
							if (tile.piece && tile.color == this.playerColor && this.activeTile.tileID == tile.tileID) {
								this.didClick = true;
								this.activeTile = tile;
								return;
							} else {
								this.activeTile = false;
								return;
							}
						}
					}
				}
			});

			if (!targetValid) {
				this.activeTile = false;
			}
			this.cancelDrag();
			this.drawTiles();
		}
	}

	orientation(orientation) {
		this.playerColor = orientation;
	};

	position(position) {
		this.boardLayout = fenToObj(position);
		this.log("Update position from engine: ");
		this.log(this.boardLayout);
		this.drawTiles();
	};

	loadImages() {
		let pieces = ["wP", "bP", "wR", "bR", "wN", "bN", "wB", "bB", "wK", "bK", "wQ", "bQ"];
		this.pieceImages = {};

		// array of promises awaiting decode on img could be better?
		let loadedImagesTimeout = setTimeout(() => this.drawTiles(), 200);
		pieces.forEach(piece => {
			let tmpImg = new Image();
			tmpImg.src = `img/chesspieces/wikipedia/${piece}.png`;
			this.pieceImages[piece] = tmpImg;
			clearTimeout(loadedImagesTimeout);
			loadedImagesTimeout = setTimeout(() => this.drawTiles(), 300);
		});
	}

	clickInBox(x, y, box) {
		const
			xMin = box[0],
			xMax = box[0] + box[2],
			yMin = box[1],
			yMax = box[1] + box[3];
		return (x >= xMin && x <= xMax && y >= yMin && y <= yMax);
	}

	drawTiles() {
		this.log("REDRAW")
		this.ctx.save();

		let columns = "abcdefgh".split("");

		this.square = (this.max / 8);
		const whiteColor = `#9d8970`;
		const blackColor = `#6c573d`;

		this.ctx.shadowColor = `rgba(0, 0, 0, 0.7)`;
		this.ctx.shadowOffsetX = (this.square / 40);
		this.ctx.shadowOffsetY = (this.square / 40);
		this.ctx.shadowBlur = (this.square / 30);

		this.boardTiles = [];

		if (this.playerColor == "black") {
			columns = columns.reverse();
		}
		
		for (let i = 0; i < 8; i++) {
			for (let j = 0; j < 8; j++) {
				let sqX = (this.square * i), sqY = (this.square * j);
				let tileID = `${columns[i]}${(this.playerColor == "black") ? (1 + j) : (8 - j)}`;
				
				this.ctx.fillStyle = (this.activeTile && tileID == this.activeTile.tileID) ? `rgba(128, 128, 255, 1)` : ((((i % 2) ? j : (j + 1)) % 2) ? whiteColor : blackColor);
				this.ctx.fillRect(sqX, sqY, this.square, this.square);

				this.ctx.font = (this.square / 4) + "px monospace";
				this.ctx.fillStyle = (this.activeTile && tileID == this.activeTile.tileID) ? `rgba(0, 255, 255, 1)` : `rgba(180, 180, 180, 0.8)`;
				this.ctx.fillText(tileID, sqX, sqY + (this.square / 5));
				if (this.boardLayout) {
					let tileObj = this.boardLayout[tileID];
					if (tileObj) {
						this.ctx.save();
						if (this.activeTile && this.draggedPieceVisible && (tileID == this.activeTile.tileID)) {
							this.ctx.globalAlpha = 0.7;
						}
						this.ctx.drawImage(this.pieceImages[tileObj], sqX, sqY, this.square, this.square);
						this.ctx.restore();
					}

					this.boardTiles.push(new Tile(sqX, sqY, this.square, tileID, tileObj));
				}
			}
		}

		this.ctx.restore();
	}

	resizeCanvas() {
		const parentEl = this.domCanvas.parentElement;
		let max = parentEl.offsetWidth > parentEl.offsetHeight ? parentEl.offsetHeight : parentEl.offsetWidth;
		max = Math.floor(max * 0.95);
		max = max % 2 ? max - 1 : max;

		this.domCanvas.style.height = `${max}px`;
		this.domCanvas.style.width = `${max}px`;
		
		this.max = max - (max % 8);
		this.domCanvas.width = this.max;
		this.domCanvas.height = this.max;
		this.domAnimateCanvas.style.height = `${max}px`;
		this.domAnimateCanvas.style.width = `${max}px`;
		
		const boardPosition = this.domCanvas.getBoundingClientRect();
		this.domAnimateCanvas.width = this.max;
		this.domAnimateCanvas.height = this.max;
		this.domAnimateCanvas.style.top = `${boardPosition.y}px`;
		this.domAnimateCanvas.style.left = `${boardPosition.x}px`;

		this.drawTiles();
	}

	log(msg) {
		console.log("BOARD:", msg)
	}
}

// const COLUMNS = "abcdefgh".split("") = "abcdefgh".split("");

function validMove(move) {
	// move should be a string
	if (typeof move !== "string") return false;

	// move should be in the form of "e2-e4", "f6-d5"
	var tmp = move.split("-");
	if (tmp.length !== 2) return false;

	return (validSquare(tmp[0]) === true && validSquare(tmp[1]) === true);
}

function validSquare(square) {
	if (typeof square !== "string") return false;
	return (square.search(/^[a-h][1-8]$/) !== -1);
}

function validPieceCode(code) {
	if (typeof code !== "string") return false;
	return (code.search(/^[bw][KQRNBP]$/) !== -1);
}

function validFen(fen) {
	if (typeof fen !== "string") return false;

	// cut off any move, castling, etc info from the end
	// we"re only interested in position information
	fen = fen.replace(/ .+$/, "");

	// FEN should be 8 sections separated by slashes
	var chunks = fen.split("/");
	if (chunks.length !== 8) return false;

	// check the piece sections
	for (var i = 0; i < 8; i++) {
		if (chunks[i] === "" ||
			chunks[i].length > 8 ||
			chunks[i].search(/[^kqrbnpKQRNBP1-8]/) !== -1) {
			return false;
		}
	}

	return true;
}

function validPositionObject(pos) {
	if (typeof pos !== "object") return false;

	for (var i in pos) {
		if (pos.hasOwnProperty(i) !== true) continue;

		if (validSquare(i) !== true || validPieceCode(pos[i]) !== true) {
			return false;
		}
	}

	return true;
}

// convert FEN piece code to bP, wK, etc
function fenToPieceCode(piece) {
	// black piece
	if (piece.toLowerCase() === piece) {
		return "b" + piece.toUpperCase();
	}

	// white piece
	return "w" + piece.toUpperCase();
}

// convert bP, wK, etc code to FEN structure
function pieceCodeToFen(piece) {
	var tmp = piece.split("");

	// white piece
	if (tmp[0] === "w") {
		return tmp[1].toUpperCase();
	}

	// black piece
	return tmp[1].toLowerCase();
}

// convert FEN string to position object
// returns false if the FEN string is invalid
function fenToObj(fen) {
	if (validFen(fen) !== true) {
		return false;
	}

	// cut off any move, castling, etc info from the end
	// we"re only interested in position information
	fen = fen.replace(/ .+$/, "");

	var rows = fen.split("/");
	var position = {};

	var currentRow = 8;
	for (var i = 0; i < 8; i++) {
		var row = rows[i].split("");
		var colIndex = 0;

		// loop through each character in the FEN section
		for (var j = 0; j < row.length; j++) {
			// number / empty squares
			if (row[j].search(/[1-8]/) !== -1) {
				var emptySquares = parseInt(row[j], 10);
				colIndex += emptySquares;
			}
			// piece
			else {
				var square = "abcdefgh".split("")[colIndex] + currentRow;
				position[square] = fenToPieceCode(row[j]);
				colIndex++;
			}
		}

		currentRow--;
	}

	return position;
}

// position object to FEN string
// returns false if the obj is not a valid position object
function objToFen(obj) {
	if (validPositionObject(obj) !== true) {
		return false;
	}

	var fen = "";

	var currentRow = 8;
	for (var i = 0; i < 8; i++) {
		for (var j = 0; j < 8; j++) {
			var square = "abcdefgh".split("")[j] + currentRow;

			// piece exists
			if (obj.hasOwnProperty(square) === true) {
				fen += pieceCodeToFen(obj[square]);
			}

			// empty space
			else {
				fen += "1";
			}
		}

		if (i !== 7) {
			fen += "/";
		}

		currentRow--;
	}

	// squeeze the numbers together
	// haha, I love this solution...
	fen = fen.replace(/11111111/g, "8");
	fen = fen.replace(/1111111/g, "7");
	fen = fen.replace(/111111/g, "6");
	fen = fen.replace(/11111/g, "5");
	fen = fen.replace(/1111/g, "4");
	fen = fen.replace(/111/g, "3");
	fen = fen.replace(/11/g, "2");

	return fen;
}