const Board = require('./board.js');
const letters = 'abcdefgh';

class ChessBoard extends Board {
  constructor() {
    super();
  }

  toString() {
    let boardString = '';

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (c === 0)
          boardString += (8 - r) + ' ';
        let piece = this.getPiece(r, c);
        if (piece)
          boardString += piece.unicode + ' ';
        else
          boardString += '   ';
      }
      boardString += '\n';
    }

    boardString += '   ';
    for (let i = 0; i < letters.length; i++)
      boardString += letters.charAt(i) + ' ';

    return boardString;
  }
}

module.exports = ChessBoard;
