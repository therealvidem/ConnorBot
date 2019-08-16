const Discord = require('discord.js');
const Rand = require('seedrandom');
const main = require('../main.js');
const utils = require('../utils.js');
const commands = {};
const client = main.getClient();
let message = `List of commands available for ${client.prefix}rate:\n`;
message += '`' + client.prefix + 'rate someone [member]`\n';
message += '`' + client.prefix + 'rate ship [person] [person]`\n';
message += '`' + client.prefix + 'rate regularship [person] [person]`\n';
message += '`' + client.prefix + 'rate thing [thingy]`\n';
message += '`' + client.prefix + 'rate list [thingies]`\n';
message += '`' + client.prefix + 'rate people [people]`\n';
message += '`' + client.prefix + 'rate spotify [member]`\n';
const helpEmbed = new Discord.RichEmbed()
                  .setColor('DARK_BLUE')
                  .setTitle('**Videm\'s Robust Rating System 9000**')
                  .setDescription(message);
const spotifyComments = [
  "I'm no expert, but this objectively sucks!",
  "Your taste is... something!",
  "No offense, but I've heard better music from a washing machine...",
  "Oh... um... it has an interesting beat...",
  "Eh, it sounds good... if you go far enough away from it...",
  "As a thief, I have heard much worse things...",
  "It's not THAT bad...",
  "Oh, I'd listen to this again!",
  "This would make for good heist music...",
  "Ay, this is very good!",
  "You have good taste!! I'm in love with this song!"
];

commands.rate = {
  'someone': function(msg, args) {
    let member;
    if (args.length > 0) {
      member = utils.convertToMember(msg.channel, args.join(' '));
    } else {
      member = msg.member;
    }
    if (!member) {
      msg.channel.send(helpEmbed);
      return;
    }
    const name = member.user.tag;
    const imageURL = member.user.avatarURL;
    const gen = Rand(client.user.id + member.id);
    const rate = Math.floor(gen() * 11);
    const emoji = rate >= 5 ? ':thumbsup:' : ':thumbsdown:';
    const article = rate === 8 ? 'an' : 'a';
    const embed = new Discord.RichEmbed().setColor(0x2F93E0)
                  .setAuthor(name, imageURL)
                  .setDescription(`I give this person ${article} **${rate}/10** ${emoji}`);
    msg.channel.send(embed);
  },
  'thing': function(msg, args) {
    const thing = args.join(' ');
    if (!thing) {
      msg.channel.send(helpEmbed);
      return;
    }
    const gen = Rand(client.user.id + thing.toLowerCase());
    const rate = Math.floor(gen() * 11);
    const emoji = rate >= 5 ? ':thumbsup:' : ':thumbsdown:';
    const article = rate === 8 ? 'an' : 'a';
    msg.channel.send(`I give **${thing}** ${article} **${rate}/10** ${emoji}`);
  },
  'ship': function(msg, args) {
    if (args.length !== 2) {
      msg.channel.send(helpEmbed);
      return;
    }
    let person1 = utils.convertToMember(msg.channel, args[0]) || args[0];
    let person2 = utils.convertToMember(msg.channel, args[1]) || args[1];
    const name1 = (person1.user && person1.user.tag) || person1;
    const name2 = (person2.user && person2.user.tag) || person2;
    if (typeof person1 === 'object') {
      person1 = person1.user.id;
    }
    if (typeof person2 === 'object') {
      person2 = person2.user.id;
    }
    const shipList = [name1, name2].sort();
    const shipName = shipList.join(' x ');
    const gen = Rand(client.user.id + [person1, person2].sort().join(' x '));
    const rate = Math.floor(gen() * 11);
    const emoji = rate >= 5 ? ':heart:' : ':broken_heart:';
    const article = rate === 8 ? 'an' : 'a';
    msg.channel.send(`I give the **${shipName}** ship ${article} **${rate}/10** ${emoji}`);
  },
  'regularship': function(msg, args) {
    if (args.length !== 2) {
      msg.channel.send(helpEmbed);
      return;
    }
    let person1 = args[0];
    let person2 = args[1];
    const shipList = [person1, person2].sort();
    const shipName = shipList.join(' x ');
    const gen = Rand(client.user.id + shipName);
    const rate = Math.floor(gen() * 11);
    const emoji = rate >= 5 ? ':heart:' : ':broken_heart:';
    const article = rate === 8 ? 'an' : 'a';
    msg.channel.send(`I give the **${shipName}** ship ${article} **${rate}/10** ${emoji}`);
  },
  'list': function(msg, args) {
    if (args.length > 1) {
      if (args.length > 25) {
        msg.channel.send('List cannot exceed 25 items');
        return;
      }
      const list = args.sort((x1, x2) => {
        const num1 = Math.floor(Rand(client.user.id + x1.toLowerCase())() * 11);
        const num2 = Math.floor(Rand(client.user.id + x2.toLowerCase())() * 11);
        if (num1 > num2) {
          return -1;
        } else if (num1 < num2) {
          return 1;
        }
        return 0;
      });
      const embed = new Discord.RichEmbed().setColor(0x2F93E0);
      for (let i = 0; i < list.length; i++) {
        embed.addField(i + 1, list[i]);
      }
      msg.channel.send(embed);
    } else {
      msg.channel.send(helpEmbed);
      return;
    }
  },
  'people': function(msg, args) {
    if (args.length > 1) {
      if (args.length > 25) {
        msg.channel.send('List cannot exceed 25 items');
        return;
      }
      const list = [];
      for (let i = 0; i < args.length; i++) {
        const name = args[i];
        const person = utils.convertToMember(msg.channel, name);
        if (!person) {
          msg.channel.send(`${name} does not exist in this server`);
          return;
        }
        list.push(person);
      }
      list.map(p => {
        return p.user.id;
      });
      list.sort((person1, person2) => {
        const num1 = Math.floor(Rand(client.user.id + person1)() * 11);
        const num2 = Math.floor(Rand(client.user.id + person2)() * 11);
        if (num1 > num2) {
          return 1;
        } else if (num1 < num2) {
          return -1;
        }
        return 0;
      });
      const embed = new Discord.RichEmbed().setColor(0x2F93E0);
      for (let i = 0; i < list.length; i++) {
        embed.addField(i + 1, list[i]);
      }
      msg.channel.send(embed);
    } else {
      msg.channel.send(helpEmbed);
      return;
    }
  },
  'spotify': function(msg, args) {
    let member;
    if (args.length > 0) {
      member = utils.convertToMember(msg.channel, args.join(' '));
    } else {
      member = msg.member;
    }
    if (!member) {
      msg.channel.send(helpEmbed);
      return;
    }
    if (member.user.presence.game && member.user.presence.game.type === 2) {
      const track = member.user.presence.game;
      const title = track.details;
      const id = track.syncID;
      const url = `https://open.spotify.com/track/${id}`;
      const imageURL = track.assets.largeImageURL;
      let authors = track.state.split('; ');
      const primaryAuthor = authors.shift();
      let authorsString = `by ${primaryAuthor}`;
      for (let i = 0; i < authors.length; i++) {
        if (i < authors.length - 1) {
          authorsString += `, ${authors[i]}`;
        } else {
          authorsString += ` and ${authors[i]}`;
        }
      }
      const gen = Rand(client.user.id + id);
      const rate = Math.floor(gen() * 11);
      const emoji = rate >= 5 ? ':thumbsup:' : ':thumbsdown:';
      const article = rate === 8 ? 'an' : 'a';
      const embed = new Discord.RichEmbed().setColor(0x2F93E0)
                    .setAuthor(title, undefined, url)
                    .setTitle(authorsString)
                    .setDescription(`I give this track ${article} **${rate}/10** ${emoji}. ${spotifyComments[rate]}`);
      if (imageURL) {
        embed.setThumbnail(imageURL);
      }
      msg.channel.send(embed);
    } else {
      msg.channel.send(`${member.user.tag} is not listening to anything on Spotify`);
    }
    // const gen = Rand(client.user.id + member.id);
    // const rate = Math.floor(gen() * 11);
    // const emoji = rate >= 5 ? ':thumbsup:' : ':thumbsdown:';
    // const article = rate === 8 ? 'an' : 'a';
    // msg.channel.send(`I give **${name}** ${article} **${rate}/10** ${emoji}`);
  },
  '_default': function(msg, args) {
    msg.channel.send(helpEmbed);
  }
};

module.exports.commands = commands;
