const Piece = require('./piece.js');
const PieceType = require('./piecetype.js');

class Rook extends Piece {
  constructor(board, color, currentPosition) {
    super(board, PieceType.ROOK, color, currentPosition);
  }

  calculateAvailablePositions() {
    return this.getAllAxisPositions();
  }
}

module.exports = Rook;
