const commands = {};
const client = require('../main.js').getClient();
const restartTimeout = 3.5 * 1000;

commands.shutdown = function(msg, args) {
  msg.channel.send('Shutting down...');
  client.destroy();
  process.shutdown();
}

commands.restart = function(msg, args) {
  msg.channel.send('Restarting...');
  client.destroy();
  setTimeout(function () {
    client.login(client.token);
  }, restartTimeout);
}

module.exports.commands = commands;
