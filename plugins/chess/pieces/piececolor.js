class PieceColor {
  constructor(name, dir) {
    this.name = name;
    this.dir = dir;
  }

  get oppositeColor() {
    if (this == WHITE)
      return BLACK;
    else
      return WHITE;
  }
}

const WHITE = new PieceColor('White', -1);
const BLACK = new PieceColor('Black', 1);

module.exports = PieceColor;

module.exports.WHITE = WHITE;
module.exports.BLACK = BLACK;
module.exports.COLORS = [WHITE, BLACK];
