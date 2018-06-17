const Position = require('./position.js');

function inBounds(r, c) {
  return (r < 8 && r >= 0) && (c < 8 && c >= 0);
}

class PositionList extends Set {
  add(row, column) {
    let r = row;
    let c = column;
    if (r instanceof Position) {
      c = r.column;
      r = r.row;
    }
    if (inBounds(r, c)) {
      super.add(new Position(r, c));
      return this;
    }
    return null;
  }

  toString() {
    let setString = '[';
    for (let p of this) {
      setString += p.toString() + ', ';
    }
    if (this.size > 0) setString = setString.slice(0, -2);
    return setString + ']';
  }
}

module.exports = PositionList;
