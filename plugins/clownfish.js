const translate = require('google-translate-api');
const Enmap = require('enmap');
const EnmapLevel = require('enmap-level');
const provider = new EnmapLevel({name: 'clownfish'});
const events = {};
const commands = {};
const utils = require('../utils.js');
const main = require('../main.js');
const client = main.getClient();
const chance = Math.floor(Math.random() * 50);
const cooldown = 30 * 1000;
const debug = true;
const flags = {
  'es': '🇪🇸',
  'fr': '🇫🇷',
  'ja': '🇯🇵',
  'km': '🇰🇭',
  'zh-cn': '🇨🇳',
  'de': '🇩🇪',
  'ko': '🇰🇷',
  'ru': '🇷🇺'
};
const languages = new Set([
  'es',
  'fr',
  'ja',
  'km',
  'zh-cn',
  'de',
  'ko',
  'ru'
]);
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
  if (msg.content.length < 1 || (!debug && usersCooldown.has(msg.author.id)) || msg.author.bot || main.isCommand(msg)) return;
  const num = Math.floor(Math.random() * 50);
  const language = randomFromList(languages);
  const flag = flags[language];
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
    const language = args[0];
    if (language) {
      if (!languages.has(language)) {
        msg.channel.send('I\'m sorry, I don\'t have that language in my database.');
        return;
      }
      if (!data[language]) {
        msg.channel.send(`You haven\'t gotten any points for ${language}.`);
        return;
      }
      const article = data[language] > 1 ? 's' : '';
      msg.channel.send(`You have ${data[language]} point${article} for ${flags[language]}.`);
    } else {
      let embed = utils.getBaseProfile(msg.member);
      const embedData = {};
      Object.keys(data).forEach((language) => {
        embedData[flags[language]] = data[language];
      });
      embed = utils.getEmbedFromObject(embedData, false, embed);
      msg.channel.send(embed);
    }
  },
  'reset': function(msg, args) {
    main.promptYesNo(msg, 10 * 1000, 'Are you sure you want to delete ALL of your clownfish data? (yes/no)')
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
