class Space {
  constructor(board, piece, position) {
    this.board = board;
    this.piece = piece;
    this.position = position;
    this.threats = new Set();
  }

  addThreat(piece) {
    this.threats.add(piece);
  }

  removeThreat(piece) {
    this.threats.delete(piece);
  }

  isThreatened(color) {
    for (let p of this.threats)
      if (p.color == color.oppositeColor)
        return true;
    return false;
  }
}

module.exports = Space;
