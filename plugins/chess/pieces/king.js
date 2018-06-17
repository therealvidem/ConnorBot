const Piece = require('./piece.js');
const PieceType = require('./piecetype.js');

class King extends Piece {
  constructor(board, color, currentPosition) {
    super(board, PieceType.KING, color, currentPosition);
  }

  calculateAvailablePositions() {
    let row = this.currentPosition.row;
    let column = this.currentPosition.column;
    let positions = this.createNewPositionList();

    for (let rDir = -1; rDir < 1; rDir++) {
      for (let cDir = -1; cDir < 1; cDir++) {
        if (rDir == 0 && cDir == 0)
          continue;
        let newR = row + rDir;
        let newC = column + cDir;
        let space = this.board.getSpace(newR, newC);
        if (space && space.isThreatened(this.color))
          continue;
        this.addToPositionList(positions, true, newR, newC);
      }
    }

    return positions;
  }
}

module.exports = King;
