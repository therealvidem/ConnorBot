const Piece = require('./piece.js');
const PieceType = require('./piecetype.js');

class Knight extends Piece {
  constructor(board, color, currentPosition) {
    super(board, PieceType.KNIGHT, color, currentPosition);
  }

  calculateAvailablePositions() {
    let positions = this.createNewPositionList();
    let currentPosition = this.currentPosition;
    for (let i = 0; i < 4; i++) {
      let rDir = Math.floor(Math.sin(i * (Math.PI / 2)));
      let cDir = Math.floor(Math.cos(i * (Math.PI / 2)));
      if (rDir == 0) {
        this.addToPositionList(positions, true, currentPosition.getRelativePosition(-1, cDir * 2));
        this.addToPositionList(positions, true, currentPosition.getRelativePosition(1, cDir * 2));
      } else if (cDir == 0) {
        this.addToPositionList(positions, true, currentPosition.getRelativePosition(rDir * 2, -1));
        this.addToPositionList(positions, true, currentPosition.getRelativePosition(rDir * 2, 1));
      }
    }
    return positions;
  }
}

module.exports = Knight;
