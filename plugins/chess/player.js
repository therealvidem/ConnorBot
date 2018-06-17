const Piece = require('./pieces/piece.js');
const PieceColor = require('./pieces/piececolor.js');

class Player {
  constructor(name, color) {
    this.pieces = [];
    this.capturedPieces = [];
    this.color = color;
    this.name = name;
  }

  addCapturedPiece(piece) {
    this.capturedPieces.push(piece);
  }

  removePiece(piece) {
    this.capturedPieces.remove(piece);
  }

  toString() {
    return this.name;
  }
}

module.exports = Player;
