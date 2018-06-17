const Piece = require('./piece.js');
const PieceType = require('./piecetype.js');

class Pawn extends Piece {
  constructor(board, color, currentPosition) {
    super(board, PieceType.PAWN, color, currentPosition);
  }

  calculateAvailablePositions() {
    let board = this.board;
    let currentPosition = this.currentPosition;
    let color = this.color;
    let direction = color.dir;
    let positions = this.createNewPositionList();

    for (let cDir = -1; cDir < 2; cDir += 2) {
      let captureDir = currentPosition.getRelativePosition(direction, cDir);
      let space = board.getSpace(captureDir);
      if (space)
        space.addThreat(this);
      if (board.getPiece(captureDir))
        this.addToPositionList(positions, false, captureDir);
    }

    if (currentPosition.row === (board.getLeftSquareRow(color) + direction) && !board.getPiece(direction * 2, 0))
      this.addToPositionList(positions, false, currentPosition.getRelativePosition(direction * 2, 0));

    this.addToPositionList(positions, false, currentPosition.getRelativePosition(direction, 0));

    return positions;
  }
}

module.exports = Pawn;
