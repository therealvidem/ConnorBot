const PieceColor = require('./pieces/piececolor.js');
const Position = require('./position.js');
const Space = require('./space.js');
const Pawn = require('./pieces/pawn.js');
const Bishop = require('./pieces/bishop.js');
const King = require('./pieces/king.js');
const Knight = require('./pieces/knight.js');
const Queen = require('./pieces/queen.js');
const Rook = require('./pieces/rook.js');
const fs = require('fs');
const WHITE_LEFT_SQUARE_ROW = 7;
const BLACK_LEFT_SQUARE_ROW = 0;

class Board {
  constructor() {
    this.game = null;
    this.whiteKing = null;
    this.blackKing = null;
    // I'm not sure if there's a better way to do this...
    this.board = [];
    for (let i = 0; i < 8; i++) {
      this.board[i] = [];
      for (let j = 0; j < 8; j++) {
        this.board[i][j] = new Space(this, null, new Position(i, j));
      }
    }
    this.populateBoard();
  }

  populateBoard() {
    for (let color of PieceColor.COLORS) {
      let leftSquareRow = this.getLeftSquareRow(color);
      let dir = color.dir;

      for (let i = 0; i < 8; i++)
        this.board[leftSquareRow + dir][i].piece = new Pawn(this, color, new Position(leftSquareRow + dir, i));

      for (let i = 0; i < 8; i += 7)
        this.board[leftSquareRow][i].piece = new Rook(this, color, new Position(leftSquareRow, i));

      for (let i = 1; i < 8; i += 5)
        this.board[leftSquareRow][i].piece = new Knight(this, color, new Position(leftSquareRow, i));

      for (let i = 2; i < 8; i += 3)
        this.board[leftSquareRow][i].piece = new Bishop(this, color, new Position(leftSquareRow, i));

      this.board[leftSquareRow][3].piece = new Queen(this, color, new Position(leftSquareRow, 3));

      let king = new King(this, color, new Position(leftSquareRow, 4));
      this.board[leftSquareRow][4].piece = king;
      if (color === PieceColor.WHITE)
        this.whiteKing = king;
      else
        this.blackKing = king;
    }
    this.updateBoard();
  }

  getLeftSquareRow(color) {
    if (color === PieceColor.WHITE)
      return WHITE_LEFT_SQUARE_ROW;
    else
      return BLACK_LEFT_SQUARE_ROW;
  }

  getPiecesByColor(color) {
    let pieces = [];
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        let piece = this.board[i][j].piece;
        if (piece && color === piece.color)
          pieces.push(piece);
      }
    }
    return pieces;
  }

  getKing(color) {
    if (color === PieceColor.WHITE)
      return this.whiteKing;
    else
      return this.blackKing;
  }

  getPiece(row, column) {
    let r = row;
    let c = column;
    if (r instanceof Position) {
      c = r.column;
      r = r.row;
    }
    if (this.inBounds(r, c)) return this.board[r][c].piece;
  }

  getSpace(row, column) {
    let r = row;
    let c = column;
    if (r instanceof Position) {
      c = r.column;
      r = r.row;
    }
    if (this.inBounds(r, c)) return this.board[r][c];
  }

  movePiece(piece, newPosition) {
    if (this.inBounds(newPosition)) {
      let position = piece.currentPosition;
      this.board[position.row][position.column].piece = null;
      this.board[newPosition.row][newPosition.column].piece = piece;
    }
  }

  updateBoard() {
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        let piece = this.board[i][j].piece;
        if (piece)
          piece.updateAvailablePositions();
      }
    }
  }
}

function inBounds(row, column) {
  if (row === undefined) return false;
  let r = row;
  let c = column;
  if (r instanceof Position) {
    c = r.column;
    r = r.row;
  }
  if (c === undefined)
    return r < 8 && r >= 0;
  else
    return (r < 8 && r >= 0) && (c < 8 && c >= 0);
}

Board.prototype.inBounds = inBounds;

module.exports = Board;

module.exports.WHITE_LEFT_SQUARE_ROW = WHITE_LEFT_SQUARE_ROW;
module.exports.BLACK_LEFT_SQUARE_ROW = BLACK_LEFT_SQUARE_ROW;
module.exports.inBounds = inBounds;
