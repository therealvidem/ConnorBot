const Player = require('./player.js');
const Piece = require('./pieces/piece.js');
const PieceColor = require('./pieces/piececolor.js');

class Chess {
  constructor(board, white, black) {
    this.white = new Player(white, PieceColor.WHITE);
    this.black = new Player(black, PieceColor.BLACK);
    this.board = board;
    this.white.pieces = board.getPiecesByColor(PieceColor.WHITE);
    this.black.pieces = board.getPiecesByColor(PieceColor.BLACK);
    this.currentPlayer = this.white;
    this.running = true;
  }

  get opposingPlayer() {
    if (this.currentPlayer.color === PieceColor.WHITE)
      return this.black;
    else
      return this.white;
  }

  getPlayer(color) {
    if (color === PieceColor.WHITE)
      return this.white;
    else
      return this.black;
  }

  switchTurns() {
    if (this.white === this.currentPlayer)
      this.currentPlayer = this.black;
    else
      this.currentPlayer = this.white;
  }
}

module.exports = Chess;
