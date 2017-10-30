const commands = {};
var client;

commands.shutdown = function(client, msg, args) {
  msg.channel.send('Shutting down...');
  client.destroy();
}

module.exports.commands = commands;
module.exports.setup = function(passedClient) {
  client = passedClient;
}
