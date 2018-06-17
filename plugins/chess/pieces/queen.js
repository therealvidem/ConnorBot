const Piece = require('./piece.js');
const PieceType = require('./piecetype.js');

class Queen extends Piece {
  constructor(board, color, currentPosition) {
    super(board, PieceType.QUEEN, color, currentPosition);
  }

  calculateAvailablePositions() {
    let positions = this.createNewPositionList();
    for (let p of this.getAllDiagonalPositions())
      positions.add(p);
    for (let p of this.getAllAxisPositions())
      positions.add(p);
    return positions;
  }
}

module.exports = Queen;
