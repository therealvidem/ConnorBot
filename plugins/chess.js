const Discord = require('discord.js');
const main = require('../main.js');
const client = main.getClient();
const utils = require('../utils.js');
const games = new Discord.Collection();
const commands = {};
const Chess = require('./chess/chess.js');
const Board = require('./chess/chessboard.js');
const Position = require('./chess/position.js');
const Status = require('./chess/status.js');
const prompting = {};
const messageDelay = 1 * 1000;
const statusCodes = {
  0: 'IDLE',
  1: 'CHOOSING PIECE',
  2: 'CHOOSING MOVE'
}

class ChessGame extends Chess {
  constructor(channel, board, white, black) {
    super(board, white, black);
    this.channel = channel;
    this.status = statusCodes[0];
    this.currentPiece = null;
    this.playerIds = [white.id, black.id];
  }

  getPiece() {
    const channel = this.channel;
    const currentPlayer = this.currentPlayer;
    const king = this.board.getKing(currentPlayer.color);
    if (this.status === statusCodes[1] || this.status === statusCodes[2]) return;

    channel.send(this.board.toString()).then(() => {
      setTimeout(() => {
        if (!king.currentSpace.isThreatened(currentPlayer.color)) {
          channel.send(`${currentPlayer.name.tag} Choose a valid piece coordinate (${client.prefix}chess piece <coordinate>)`);
          this.status = statusCodes[1];
        } else {
          if (!king.hasAvailablePositions()) {
            if (king.currentSpace.isThreatened(currentPlayer.color)) {
              stopGame(`${opposingPlayer.name.tag} has checkmated ${currentPlayer}.`);
            } else {
              stopGame('There has been a stalemate.');
            }
          } else {
            channel.send(`${currentPlayer.name.tag} You are now in check; you are required to move your king.`);
            this.currentPiece = king;
            this.getNewPosition();
          }
        }
      }, messageDelay);
    });
  }

  processPieceCoordinate(piecePositionString) {
    const channel = this.channel;
    if (this.status !== statusCodes[1]) return;
    let piecePosition = Position.convertFromChessCoordinates(piecePositionString);

    if (piecePosition) {
      let piece = this.board.getPiece(piecePosition);
      if (!piece) {
        channel.send(Status.EMPTY_SPACE);
      } else {
        const color = piece.color;
        if (color !== this.currentPlayer.color) {
          channel.send(Status.WRONG_COLOR);
        } else {
          piece.updateAvailablePositions();
          if (!piece.hasAvailablePositions()) {
            channel.send(Status.NO_MOVES);
          } else {
            this.currentPiece = piece;
            this.status = statusCodes[2];
            this.getNewPosition();
          }
        }
      }
    } else {
      channel.send(Status.INVALID_COORDINATE);
    }
  }

  getNewPosition() {
    const channel = this.channel;
    const currentPlayer = this.currentPlayer;
    const currentPiece = this.currentPiece;
    if (this.status !== statusCodes[2] || !currentPiece) return;

    channel.send(`Selected ${currentPiece}; available moves: ${currentPiece.availablePositions}`).then(() => {
      setTimeout(() => {
        channel.send(`${currentPlayer.name.tag} Choose a coordinate for the piece to move to (${client.prefix}chess coordinate <coordinate>)`);
      }, messageDelay);
    });
  }

  processNewPosition(newPositionString) {
    const channel = this.channel;
    const currentPlayer = this.currentPlayer;
    if (this.status !== statusCodes[2] || !this.currentPiece) return;
    let newPosition = Position.convertFromChessCoordinates(newPositionString);

    if (!Board.inBounds(newPosition)) {
      channel.send(Status.INVALID_COORDINATE);
      return;
    } else if (!this.currentPiece.isValidPosition(newPosition)) {
      channel.send(Status.INVALID_MOVE);
      return;
    }

    this.makeMove(newPosition);
  }

  makeMove(newPosition) {
    const channel = this.channel;
    const currentPlayer = this.currentPlayer;
    const currentPiece = this.currentPiece;
    const oldPieceString = currentPiece.toString();
    const capturedPiece = currentPiece.makeMove(newPosition);

    function displayCapturedPieces(ctx) {
      setTimeout(() => {
        channel.send(`${currentPlayer.name.tag}'s captured pieces: [${currentPlayer.capturedPieces.toString()}]`).then(() => {
          setTimeout(() => {
            channel.send(`${ctx.opposingPlayer.name.tag}'s captured pieces: [${ctx.opposingPlayer.capturedPieces.toString()}]`).then(() => {
              setTimeout(() => {
                ctx.status = statusCodes[0];
                ctx.board.updateBoard();
                ctx.switchTurns();
                ctx.getPiece();
              }, messageDelay)
            });
          }, messageDelay);
        });
      }, messageDelay);
    }

    if (capturedPiece != null) {
      channel.send(`${currentPlayer.name.tag} ${oldPieceString} has captured ${capturedPiece}`).then(() => displayCapturedPieces(this));
    } else {
      channel.send(`${currentPlayer.name.tag} Moved ${oldPieceString} to ${newPosition}`).then(() => displayCapturedPieces(this));
    }
  }

  stopGame(reason) {
    this.running = false;
    this.channel.send(this.board.toString()).then(() => {
      setTimeout(() => {
        this.channel.send(reason);
      }, messageDelay);
    });
    games[this.channel.id] = undefined;
  }
}

function checkCommand(currentGame, msg) {
  if (!currentGame) {
    msg.channel.send('This channel doesn\'t have any ongoing matches.');
    return;
  }
  if (!currentGame.playerIds.includes(msg.author.id)) {
    msg.channel.send('You are not a player in this match.');
    return;
  }
  if (currentGame.currentPlayer.name !== msg.author) {
    msg.channel.send('It\'s not your turn.');
    return;
  }
  return true;
}

function setupGame(msg, channel, opponent) {
  let board = new Board();
  games[channel.id] = new ChessGame(channel, board, msg.author, opponent.user);
  board.game = games[channel.id];
  games[channel.id].getPiece();
  delete prompting[msg.author];
}

commands.chess = {
  'piece': function(msg, args) {
    const currentGame = games[msg.channel.id];
    if (!checkCommand(currentGame, msg)) return;
    currentGame.processPieceCoordinate(args[0]);
  },
  'coordinate': function(msg, args) {
    const currentGame = games[msg.channel.id];
    if (!checkCommand(currentGame, msg)) return;
    currentGame.processNewPosition(args[0]);
  },
  'start': function(msg, args) {
    const channel = msg.channel;
    if (prompting[msg.author]) {
      channel.send('You are already prompting someone to a chess match.');
      return;
    }
    if (games[channel.id]) {
      channel.send('There is already a chess match going on in this channel.');
      return;
    }
    if (games.find(game => game.playerIds.includes(msg.author.id))) {
      channel.send(`You are already in a game. Do "${client.prefix}chess stop" to end the game.`);
      return;
    }
    if (args.length < 1) {
      channel.send(`The correct usage is: ${client.prefix}chess start <opponent>`);
      return;
    }
    const opponent = utils.convertToMember(channel, args[0]);
    if (!opponent) {
      channel.send('That user does not exist.');
      return;
    }
    if (games.find(game => game.playerIds.includes(opponent.id))) {
      channel.send(`${opponent.tag} is already in a game.`);
      return;
    }
    prompting[msg.author] = true;
    if (msg.author.id === '138838298742226944' && opponent.id === '339615750451101696') {
      setupGame(msg, channel, opponent);
      return;
    }
    client.promptYesNo(msg.channel, opponent.id, 10 * 1000, `${opponent} ${msg.author.tag} has challenged you to a chess match. Do you accept? (yes/no)`)
    .then(
      (response, responseMsg) => {
        if (response) {
          setupGame(msg, channel, opponent);
        } else {
          channel.send(`${opponent.user.tag} has denied the chess challenge.`);
          delete prompting[msg.author];
        }
      },
      () => {
        channel.send(`${opponent.user.tag} has denied the chess challenge.`);
        delete prompting[msg.author];
      }
    );
  },
  'stop': function(msg, args) {
    const currentGame = games[msg.channel.id];
    if (!currentGame) {
      msg.channel.send('This channel doesn\'t have any ongoing matches.');
      return;
    }
    if (!currentGame.playerIds.includes(msg.author.id)) {
      msg.channel.send('You are not a player in this match.');
      return;
    }
    currentGame.stopGame(`${msg.author.tag} has forfeited`);
  }
}

module.exports.commands = commands;
