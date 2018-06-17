const PieceColor = require('./piececolor.js');

class PieceType {
  constructor(notation, whiteUnicode, blackUnicode, points) {
    this.notation = notation;
    this.whiteUnicode = whiteUnicode;
    this.blackUnicode = blackUnicode;
    this.points = points;
  }

  getUnicode(color) {
    if (color == PieceColor.WHITE)
      return this.whiteUnicode;
    else
      return this.blackUnicode;
  }

  toString() {
    return this.notation;
  }
}

module.exports = PieceColor;

module.exports.KING = new PieceType('K', 'K', 'k', 0);
module.exports.QUEEN = new PieceType('Q', 'Q', 'q', 9);
module.exports.ROOK = new PieceType('R', 'R', 'r', 5);
module.exports.BISHOP = new PieceType('B', 'B', 'b', 3);
module.exports.KNIGHT = new PieceType('N', 'N', 'n', 3);
module.exports.PAWN = new PieceType('', 'P', 'p', 1);
