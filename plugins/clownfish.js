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
  'ru': '🇷🇺'
};
const fullLanguages = {
  'spanish': 'es',
  'french': 'fr',
  'japanese': 'ja',
  'khmer': 'km',
  'chinese': 'zh-cn',
  'german': 'de',
  'korean': 'ko',
  'russian': 'ru'
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
  'points': function(msg, args) {
    const data = points[msg.author.id];
    if (!data) {
      msg.channel.send('You haven\'t gotten any points.');
      return;
    }
    let languageQuery = args[0];
    if (languageQuery) {
      languageQuery = languageQuery.toLowerCase();
      const language = Object.keys(languages).includes(languageQuery) ? languageQuery : flagsIndex[languageQuery] || fullLanguages[languageQuery];
      if (!language) {
        msg.channel.send('I\'m sorry, I don\'t have that language in my database.');
        return;
      }
      if (!data[language]) {
        msg.channel.send(`You haven\'t gotten any points for ${languageQuery}.`);
        return;
      }
      const article = data[language] > 1 ? 's' : '';
      msg.channel.send(`You have ${data[language]} point${article} for ${languages[language]}.`);
    } else {
      let embed = utils.getBaseProfile(msg.member);
      const embedData = {};
      Object.keys(data).forEach((language) => {
        embedData[languages[language]] = data[language];
      });
      embed = utils.getEmbedFromObject(embedData, false, embed);
      msg.channel.send(embed);
    }
  },
  'reset': function(msg, args) {
    client.promptYesNo(msg, 10 * 1000, 'Are you sure you want to delete ALL of your clownfish data? (yes/no)')
    .then(
      (response, responseMsg) => {
        console.log(response);
        if (response) {
          delete points[msg.author.id];
          client.clownfish.set('points', points);
          msg.channel.send('Successfully deleted your clownfish data.');
        } else {
          msg.channel.send('Okay, I won\'t delete your clownfish data.');
        }
      },
      () => {
        msg.channel.send('Okay, I won\'t delete your clownfish data.');
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
