const PositionList = require('../positionlist.js');
const Position = require('../position.js');

class Piece {
  constructor(board, type, color, currentPosition) {
    this.board = board;
    this.type = type;
    this.color = color;
    this.currentPosition = currentPosition;
    this.availablePositions = new PositionList();
  }

  get currentSpace() {
    return this.board.getSpace(this.currentPosition);
  }

  get unicode() {
    return this.type.getUnicode(this.color);
  }

  createNewPositionList() {
    return new PositionList();
  }

  isValidPosition(newPosition) {
    for (let position of this.availablePositions)
      if (position.equals(newPosition))
        return true;
    return false;
  }

  makeMove(newPosition) {
    let board = this.board;
    let piece = board.getPiece(newPosition);
    if (piece && piece.color != this.color) {
      let game = board.game;
      let player = game.getPlayer(this.color);
      player.addCapturedPiece(piece);
    }
    for (let position of this.availablePositions)
      board.getSpace(position).removeThreat(this);
    board.movePiece(this, newPosition);
    this.currentPosition = newPosition;
    return piece;
  }

  getAxisPositions(amount) {
    let positions = new PositionList();
    let row = this.currentPosition.row;
    let column = this.currentPosition.column;

    for (let i = 0; i < 4; i++) {
      let rDir = Math.floor(Math.sin(i * (Math.PI / 2)));
      let cDir = Math.floor(Math.cos(i * (Math.PI / 2)));
      for (let j = 1; j <= amount; j++) {
        if (!this.addToPositionList(positions, true, row + rDir * j, column + cDir * j))
          break;
      }
    }

    return positions;
  }

  getAllAxisPositions() {
    return this.getAxisPositions(8);
  }

  getDiagonalPositions(amount) {
    let positions = new PositionList();
    let row = this.currentPosition.row;
    let column = this.currentPosition.column;

    for (let rDir = -1; rDir < 2; rDir += 2)
      for (let cDir = -1; cDir < 2; cDir += 2)
        for (let i = 1; i <= amount; i++)
          if(!this.addToPositionList(positions, true, row + rDir * i, column + cDir * i))
            break;

    return positions;
  }

  getAllDiagonalPositions() {
    return this.getDiagonalPositions(8);
  }

  addToPositionList(positions, threat, row, column) {
    let r = row;
    let c = column;
    if (r instanceof Position) {
      c = r.column;
      r = r.row;
    }
    let occupyingPiece = this.board.getPiece(r, c);
    if (occupyingPiece && occupyingPiece.color === this.color) return false;
    if (positions.add(r, c)) {
      if (threat)
        this.board.getSpace(r, c).addThreat(this);
      return true;
    }
    return false;
  }

  calculateAvailablePositions() { }

  updateAvailablePositions() {
    this.availablePositions = this.calculateAvailablePositions();
    return this.availablePositions;
  }

  hasAvailablePositions() {
    return this.availablePositions.size > 0;
  }

  toString() {
    return `${this.type.toString()}${this.currentPosition.toString()}`;
  }
}

module.exports = Piece;
