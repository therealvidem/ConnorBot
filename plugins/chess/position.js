class Position {
  constructor(row, column) {
    this.row = row !== undefined ? row : -1;
    this.column = column !== undefined ? column : -1;
  }

  getRelativePosition(deltaRow, deltaColumn) {
    return new Position(this.row + deltaRow, this.column + deltaColumn);
  }

  toString() {
    return convertToChessCoordinates(this);
  }

  equals(p2) {
    return (this.row === p2.row) && (this.column === p2.column);
  }
}

function inBounds(number) {
  return number < 8 && number >= 0;
}

function convertFromChessCoordinates(coordinates) {
  if (coordinates.length !== 2) return new Position();

  let letter = coordinates.charAt(0);
  let numberChar = coordinates.charAt(1);
  let number = 8 - parseInt(numberChar);

  if (!number || !inBounds(number) || letter < 'a' || letter > 'h') return new Position();

  return new Position(number, letter.charCodeAt(0) % 'a'.charCodeAt(0));
}

function convertToChessCoordinates(position) {
  if (!position) return;
  const letter = String.fromCharCode(position.column + 'a'.charCodeAt(0));
  const number = 8 - position.row;
  return `${letter}${number}`;
}

module.exports = Position;

module.exports.convertFromChessCoordinates = convertFromChessCoordinates;
module.exports.convertToChessCoordinates = convertToChessCoordinates;
