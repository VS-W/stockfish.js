function engineGame(options) {
	options = options || {}
	let game = new Chess();
	let board = new Board();
	///NOTE: If the WASM binary is not in the expected location, must be added after the hash.
	let engine = typeof STOCKFISH === "function" ? STOCKFISH() : new Worker(options.stockfishjs || 'stockfish.js#stockfish.wasm');
	let evaler = typeof STOCKFISH === "function" ? STOCKFISH() : new Worker(options.stockfishjs || 'stockfish.js#stockfish.wasm');
	let engineStatus = {};
	let displayScore = false;
	let time = { wtime: 300000, btime: 300000, winc: 2000, binc: 2000 };
	let playerColor = 'white';
	let isEngineRunning = false;
	let evaluation_el = document.getElementById("evaluation");
	let announced_game_over;

	// do not pick up pieces if the game is over
	// only pick up pieces for White (??? why?)
	// let onDragStart = function (source, piece, position, orientation) {
	// 	let re = playerColor == 'white' ? /^b/ : /^w/
	// 	if (game.game_over() || piece.search(re) !== -1) {
	// 		return false;
	// 	}
	// };

	// setInterval(function () {
	// 	if (announced_game_over) {
	// 		return;
	// 	}

	// 	if (game.game_over()) {
	// 		announced_game_over = true;
	// 		alert("Game Over");
	// 	}
	// }, 1000);

	function log(str) {
		const el = document.querySelector("#log");
		el.innerText += str + "\n";
		setTimeout(() => {
			el.scrollTo(0, el.scrollHeight);
		}, 100);
	}

	function uciCmd(cmd, which) {
		log("UCI: " + cmd);

		(which || engine).postMessage(cmd);
	}

	function displayStatus() {
		let status = 'Engine: ';
		if (!engineStatus.engineLoaded) {
			status += 'loading...';
		} else if (!engineStatus.engineReady) {
			status += 'loaded...';
		} else {
			status += 'ready.';
		}

		if (engineStatus.search) {
			status += '\n' + engineStatus.search;
			if (engineStatus.score && displayScore) {
				status += (engineStatus.score.substr(0, 4) === "Mate" ? " " : ' Score: ') + engineStatus.score;
			}
		}
		document.querySelector('#engineStatus').innerText = status.includes("\n") ? status : status + "\n---";
	}

	function get_moves() {
		let moves = '';
		let history = game.history({ verbose: true });

		for (let i = 0; i < history.length; ++i) {
			let move = history[i];
			moves += ' ' + move.from + move.to + (move.promotion ? move.promotion : '');
		}

		return moves;
	}

	function prepareMove() {
		// document.querySelector('#pgn').innerText = game.pgn();
		
		board.setGameOver(false);
		board.position(game.fen());

		let turn = game.turn() == 'w' ? 'white' : 'black';
		if (!game.game_over()) {
			if (turn != playerColor) {
				uciCmd('position startpos moves' + get_moves());
				uciCmd('position startpos moves' + get_moves(), evaler);
				
				evaluation_el.textContent = game.pgn() + "\n";
				uciCmd("eval", evaler);

				if (time && time.wtime) {
					uciCmd("go " + (time.depth ? "depth " + time.depth : "") + " wtime " + time.wtime + " winc " + time.winc + " btime " + time.btime + " binc " + time.binc);
				} else {
					uciCmd("go " + (time.depth ? "depth " + time.depth : ""));
				}
				isEngineRunning = true;
			}
		} else {
			board.setGameOver(true);
		}
	}

	evaler.onmessage = function (event) {
		let line;

		if (event && typeof event === "object") {
			line = event.data;
		} else {
			line = event;
		}

		/// Ignore some output.
		if (line === "uciok" || line === "readyok" || line.substr(0, 11) === "option name") {
			return;
		}

		if (evaluation_el.textContent) {
			evaluation_el.textContent += "\n";
		}
		evaluation_el.textContent += line;
	}

	engine.onmessage = function (event) {
		let line;

		if (event && typeof event === "object") {
			line = event.data;
		} else {
			line = event;
		}

		log("Reply: " + line);

		if (line == 'uciok') {
			engineStatus.engineLoaded = true;
		} else if (line == 'readyok') {
			engineStatus.engineReady = true;
		} else {
			let match = line.match(/^bestmove ([a-h][1-8])([a-h][1-8])([qrbn])?/);
			/// Did the AI move?
			if (match) {
				isEngineRunning = false;
				game.move({ from: match[1], to: match[2], promotion: match[3] });
				prepareMove();
				uciCmd("eval", evaler)
				evaluation_el.textContent = game.pgn() + "\n";
				
				/// Is it sending feedback?
			} else if (match = line.match(/^info .*\bdepth (\d+) .*\bnps (\d+)/)) {
				engineStatus.search = 'Depth: ' + match[1] + ' Nps: ' + match[2];
			}

			/// Is it sending feed back with a score?
			if (match = line.match(/^info .*\bscore (\w+) (-?\d+)/)) {
				let score = parseInt(match[2]) * (game.turn() == 'w' ? 1 : -1);
				/// Is it measuring in centipawns?
				if (match[1] == 'cp') {
					engineStatus.score = (score / 100.0).toFixed(2);
					/// Did it find a mate?
				} else if (match[1] == 'mate') {
					engineStatus.score = 'Mate in ' + Math.abs(score);
				}

				/// Is the score bounded?
				if (match = line.match(/\b(upper|lower)bound\b/)) {
					engineStatus.score = ((match[1] == 'upper') == (game.turn() == 'w') ? '<= ' : '>= ') + engineStatus.score
				}
			}
		}
		displayStatus();
	};

	uciCmd('uci');

	uciCmd('setoption name Use NNUE value true', engine);
	uciCmd('setoption name Use NNUE value true', evaler);

	return {
		reset: function () {
			game.reset();
		},
		loadPgn: function (pgn) { game.load_pgn(pgn); },
		setPlayerColor: function (color) {
			playerColor = color;
			board.orientation(playerColor);
		},
		setSkillLevel: function (skill) {
			if (skill < 0) {
				skill = 0;
			}
			if (skill > 20) {
				skill = 20;
			}

			time.level = skill;

			/// Change thinking depth allowance.
			if (skill < 5) {
				time.depth = "1";
			} else if (skill < 10) {
				time.depth = "2";
			} else if (skill < 15) {
				time.depth = "3";
			} else {
				/// Let the engine decide.
				time.depth = "";
			}

			uciCmd('setoption name Skill Level value ' + skill);
		},
		setDepth: function (depth) {
			time = { depth: depth };
		},
		setNodes: function (nodes) {
			time = { nodes: nodes };
		},
		setAggressiveness: function (value) {
			uciCmd('setoption name Aggressiveness value ' + value);
		},
		setDisplayScore: function (flag) {
			displayScore = flag;
			displayStatus();
		},
		start: function () {
			uciCmd('ucinewgame');
			uciCmd('isready');
			engineStatus.engineReady = false;
			engineStatus.search = null;
			displayStatus();
			prepareMove();
			announced_game_over = false;
		},
		undo: function () {
			if (isEngineRunning)
				return false;
			game.undo();
			game.undo();
			engineStatus.search = null;
			displayStatus();
			prepareMove();
			return true;
		},
		tryMove: function (source, target) {
			const move = game.move({
				from: source,
				to: target,
				promotion: document.getElementById("promote").value
			});

			console.log("MOVE:", move);

			// illegal move
			if (move === null) {
				return false;
			}

			prepareMove();
			return move;
		},
		game: game
	};
}
