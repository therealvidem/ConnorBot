const events = {};
const commands = {};
const client = require('../main.js').getClient();

// events.message = function(msg) {
//   if (msg.author.id == client.ownerId) {
//     console.log(`${msg.author.username}#${msg.author.discriminator}: ${msg.cleanContent}`);
//   }
// }

commands.ping = function(msg, args) {
  msg.channel.send('Pong.');
}

module.exports.events = events;
module.exports.commands = commands;
