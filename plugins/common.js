const events = {};
const commands = {};
const client = require('../main.js').getClient();
const utils = require('../utils.js');

// events.message = function(msg) {
//   if (msg.author.id == client.ownerId) {
//     console.log(`${msg.author.username}#${msg.author.discriminator}: ${msg.cleanContent}`);
//   }
// }

commands.ping = function(msg, args) {
  msg.channel.send('Pong.');
}

commands.echo = function(msg, args) {
  if (args.length < 1) return;
  msg.channel.send(args.join(' '));
}

function sendProperty(msg, obj, prop) {
  msg.channel.send(obj[prop] ? obj[prop].toString() : `Could not get ${prop} from the guild`);
}

commands.server = {
  'get': {
    'image': function(msg, args) {
      sendProperty(msg, msg.guild, 'iconURL');
    },
    'owner': function(msg, args) {
      const embed = utils.getUserProfile(msg.guild.owner);
      msg.channel.send(embed);
    },
    'member': function(msg, args) {
      const query = args.join(' ');
      let member = msg.member;
      if (args.length > 0) {
        member = msg.mentions.members.first() || utils.convertToMember(msg.channel, query);
      }
      if (!member) {
        msg.channel.send(`Could not find member "${query}"`);
        return;
      }
      const embed = utils.getUserProfile(member);
      msg.channel.send(embed);
    }
  }
}

commands.bot = {
  'set': {
    'avatar': function(msg, args) {
      const attachment = msg.attachments.first();
      const url = attachment ? attachment.url : args[0];
      if (!url) {
        msg.channel.send(`Correct usage: ${client.prefix}bot set avatar <url> (or add an attachment after ${client.prefix}bot set avatar)`);
        return;
      }
      client.user.setAvatar(url)
      .then(user => {
        msg.channel.send('Successfully set avatar');
      })
      .catch(err => {
        msg.channel.send('Input a valid URL');
      });
    },
    'name': function(msg, args) {
      const newName = args[0];
      if (!newName) {
        msg.channel.send(`Correct usage: ${client.prefix}bot set name <newName>`);
        return;
      }
      client.user.setUsername(newName)
      .then(user => {
        msg.channel.send('Successfully set name');
      })
      .catch(err => {
        msg.channel.send('An error occured while trying to set name');
      });
    }
  }
}

module.exports.events = events;
module.exports.commands = commands;
