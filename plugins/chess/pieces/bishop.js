const Piece = require('./piece.js');
const PieceType = require('./piecetype.js');

class Bishop extends Piece {
  constructor(board, color, currentPosition) {
    super(board, PieceType.BISHOP, color, currentPosition);
  }

  calculateAvailablePositions() {
    return this.getAllDiagonalPositions();
  }
}

module.exports = Bishop;
