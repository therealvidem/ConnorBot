const commands = {};
const config = require('../config.json');
const client = require('../main.js').getClient();
const restartTimeout = 3.5 * 1000;

commands.shutdown = function(msg, args) {
  msg.channel.send('Shutting down...');
  client.destroy().then(() => {
    process.exit();
  });
}

commands.restart = function(msg, args) {
  msg.channel.send('Restarting...');
  client.destroy().then(() => {
    setTimeout(function () {
      client.login(client.token);
    }, restartTimeout);
  });
}

module.exports.commands = commands;
