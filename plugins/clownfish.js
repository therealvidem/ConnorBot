const Discord = require('discord.js');
const translate = require('google-translate-api');
const Enmap = require('enmap');
const EnmapLevel = require('enmap-level');
const provider = new EnmapLevel({name: 'clownfish'});
const events = {};
const commands = {};
const utils = require('../utils.js');
const client = require('../main.js').getClient();
const chance = Math.floor(Math.random() * 50);
const cooldown = 30 * 1000;
const debug = false;
const languages = {
  'es': '🇪🇸',
  'fr': '🇫🇷',
  'ja': '🇯🇵',
  'km': '🇰🇭',
  'zh-cn': '🇨🇳',
  'de': '🇩🇪',
  'ko': '🇰🇷',
  'ru': '🇷🇺',
  'el': '🇬🇷',
  'it': '🇮🇹',
  'la': '🔤',
  'pt': '🇵🇹',
  'lo': '🇱🇦',
  'ar': '🇦🇪'
};
const fullLanguages = {
  'spanish': 'es',
  'french': 'fr',
  'japanese': 'ja',
  'khmer': 'km',
  'chinese': 'zh-cn',
  'german': 'de',
  'korean': 'ko',
  'russian': 'ru',
  'greek': 'el',
  'italian': 'it',
  'latin': 'la',
  'portuguese': 'pt',
  'laotian': 'lo',
  'arabic', 'ar'
}
const flagsIndex = utils.invertObject(languages);
const usersCooldown = new Set();
let points;

function randomFromList(list) {
  const items = Array.from(list);
  return items[Math.floor(Math.random() * items.length)];
}

function incrementPoints(id, language) {
  let userPoints = points[id];
  if (!userPoints) {
    points[id] = {};
    points[id][language] = 0;
    userPoints = points[id];
  }
  if (!userPoints[language]) {
    userPoints[language] = 0;
  }
  userPoints[language]++;
  client.clownfish.set('points', points);
}

function getClownfishProfile(member, data) {
  let embed = utils.getBaseProfile(member);
  const embedData = {};
  Object.keys(data).forEach((language) => {
    embedData[languages[language]] = data[language];
  });
  embed = utils.getEmbedFromObject(embedData, false, embed);
  return embed;
}

function sendLanguagePoints(msg, languageQuery, member, data) {
  const language = Object.keys(languages).includes(languageQuery) ? languageQuery : flagsIndex[languageQuery] || fullLanguages[languageQuery];
  if (!language) {
    msg.channel.send('I\'m sorry, I don\'t have that language in my database');
    return;
  }
  if (!data[language]) {
    if (msg.member === member) {
      msg.channel.send(`You haven\'t obtained any points for ${languageQuery}`);
    } else {
      msg.channel.send(`That member hasn\'t obtained any points for ${languageQuery}`);
    }
    return;
  }
  const article = data[language] > 1 ? 's' : '';
  if (msg.member === member) {
    msg.channel.send(`You have ${data[language]} point${article} for ${languages[language]}`);
  } else {
    msg.channel.send(`That member has ${data[language]} point${article} for ${languages[language]}`);
  }
}

events.message = function(msg) {
  if (msg.content.length < 1 || (!debug && usersCooldown.has(msg.author.id)) || msg.author.bot || client.isCommand(msg)) return;
  const num = Math.floor(Math.random() * 50);
  const language = randomFromList(Object.keys(languages));
  const flag = languages[language];
  const id = msg.author.id;
  if ((!debug && num === chance) || (debug && id === client.ownerId)) {
    translate(msg.content, {from: 'en', to: language})
    .then(res => {
      incrementPoints(id, language);
      usersCooldown.add(id);
      setTimeout(() => {
        usersCooldown.delete(id);
      }, cooldown);
      msg.channel.send(`( (${flag}) ${res.text} )`);
    })
    .catch(err => {
      console.error(err);
    });
  }
}

commands.clownfish = {
  'languages': function(msg, args) {
    let embed = new Discord.RichEmbed()
    .setColor(msg.member.displayHexColor)
    .setTitle('Languages available for the clownfish plugin');
    for (let key in fullLanguages) {
      const language = fullLanguages[key];
      const flag = languages[language];
      embed.addField(key.charAt(0).toUpperCase() + key.slice(1), `(${flag}) ${language}`, true);
    }
    msg.channel.send(embed);
  },
  'points': function(msg, args) {
    const authorData = points[msg.author.id];
    const arg0 = args[0];
    // clownfish points -> all author's points
    // clownfish points @member -> all member's points
    // clownfish points language -> author's language points
    // clownfish points language @member -> member's language points
    // clownfish points @member language -> member's language points
    if (arg0) {
      const arg1 = args[1];
      if (arg1) {
        const member0 = utils.convertToMember(msg.channel, arg0);
        const member1 = utils.convertToMember(msg.channel, arg1);
        if (!member0 && !member1) {
          msg.channel.send('Could not find member');
          return;
        }
        if (member0) {
          const memberData = points[member0.id];
          if (!memberData) {
            msg.channel.send('That member hasn\'t obtained any points');
            return;
          }
          sendLanguagePoints(msg, arg1, member0, memberData);
        } else {
          const memberData = points[member1.id];
          if (!memberData) {
            msg.channel.send('That member hasn\'t obtained any points');
            return;
          }
          sendLanguagePoints(msg, arg0, member1, memberData);
        }
      } else {
        const member = utils.convertToMember(msg.channel, arg0);
        if (member) {
          const memberData = points[member.id];
          if (!memberData) {
            msg.channel.send('That member hasn\'t obtained any points');
            return;
          }
          msg.channel.send(getClownfishProfile(member, memberData));
        } else {
          if (!authorData) {
            msg.channel.send('You haven\'t obtained any points');
            return;
          }
          sendLanguagePoints(msg, arg0, msg.member, authorData);
        }
      }
    } else {
      if (!authorData) {
        msg.channel.send('You haven\'t obtained any points');
        return;
      }
      msg.channel.send(getClownfishProfile(msg.member, authorData));
    }
  },
  'reset': function(msg, args) {
    client.promptYesNo(msg, 10 * 1000, 'Are you sure you want to delete ALL of your clownfish data? (yes/no)')
    .then(
      (response, responseMsg) => {
        if (response) {
          delete points[msg.author.id];
          client.clownfish.set('points', points);
          msg.channel.send('Successfully deleted your clownfish data');
        } else {
          msg.channel.send('Okay, I won\'t delete your clownfish data');
        }
      },
      () => {
        msg.channel.send('Okay, I won\'t delete your clownfish data');
      }
    );
  },
  'translate': {
    'from': function(msg, args) {
      let languageQuery = args[0];
      const text = args.slice(1).join(' ');
      if (!languageQuery || !text) {
        msg.channel.send(`Correct usage: ${client.prefix}clownfish translate from <language> <text>`);
        return;
      }
      languageQuery = languageQuery.toLowerCase();
      const language = Object.keys(languages).includes(languageQuery) ? languageQuery : flagsIndex[languageQuery] || fullLanguages[languageQuery];
      if (!language) {
        msg.channel.send('I\'m sorry, I don\'t have that language in my database.');
        return;
      }
      const flag = languages[language];
      translate(text, {from: language, to: 'en'})
      .then(res => {
        msg.channel.send(`( (${flag}) ${res.text} )`);
      })
      .catch(err => {
        msg.channel.send(`An error has occured: ${err}`);
        console.error(err);
      });
    },
    'to': function(msg, args) {
      let languageQuery = args[0];
      const text = args.slice(1).join(' ');
      if (!languageQuery || !text) {
        msg.channel.send(`Correct usage: ${client.prefix}clownfish translate to <language> <text>`);
        return;
      }
      languageQuery = languageQuery.toLowerCase();
      const language = Object.keys(languages).includes(languageQuery) ? languageQuery : flagsIndex[languageQuery] || fullLanguages[languageQuery];
      if (!language) {
        msg.channel.send('I\'m sorry, I don\'t have that language in my database.');
        return;
      }
      const flag = languages[language];
      translate(text, {from: 'en', to: language})
      .then(res => {
        msg.channel.send(`( (${flag}) ${res.text} )`);
      })
      .catch(err => {
        msg.channel.send(`An error has occured: ${err}`);
        console.error(err);
      });
    }
  }
}

module.exports.commands = commands;
module.exports.events = events;
module.exports.setup = function() {
  client.clownfish = new Enmap({provider: provider});
  client.clownfish.defer.then(() => {
    points = client.clownfish.get('points') || {};
    console.log('Loaded clownfish data.');
  });
}
module.exports.unload = function(reason) {
  return new Promise((resolve, reject) => {
    provider.close();
    resolve();
  });
}
