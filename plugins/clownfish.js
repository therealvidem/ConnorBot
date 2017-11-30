const translate = require('google-translate-api');
const Enmap = require('enmap');
const EnmapLevel = require('enmap-level');
const provider = new EnmapLevel({name: 'clownfish'});
const events = {};
const commands = {};
const client = require('../main.js').getClient();
const chance = Math.floor(Math.random() * 50);
const cooldown = 30 * 1000;
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
const languages = [
  'es',
  'fr',
  'ja',
  'km',
  'zh-cn',
  'de',
  'ko',
  'ru'
];
const usersCooldown = new Set();

function randomFromList(list) {
  return list[Math.floor(Math.random() * list.length)];
}

commands.clownfish = {
  'points': function(msg, args) {
    const pointsString = client.clownfish[msg.author.id] ? `You have ${client.clownfish[msg.author.id]} points.` : 'You don\'t have any points.';
    msg.channel.send(pointsString);
  }
}

events.message = function(msg) {
  if (msg.content.length < 1 || usersCooldown.has(msg.author.id) || msg.author.bot) return;
  const num = Math.floor(Math.random() * 50);
  const language = randomFromList(languages);
  const flag = flags[language];
  const id = msg.author.id
  if (num === chance) {
    translate(msg.content, {from: 'en', to: language})
    .then(res => {
      msg.channel.send(`( (${flag}) ${res.text} )`);
      if (!client.clownfish[id]) {
        client.clownfish[id] = 0;
      }
      client.clownfish[id]++;
      usersCooldown.add(id);
      setTimeout(() => {
        usersCooldown.remove(msg.author.id);
      }, cooldown);
    })
    .catch(err => {
      console.error(err);
    });
  }
}

module.exports.commands = commands;
module.exports.events = events;
module.exports.setup = function() {
  client.clownfish = new Enmap({provider: provider});
  client.clownfish.defer.then(() => {
    if (!client.clownfish) {
      client.clownfish = {};
    }
    console.log('Loaded clownfish data.');
  });
}
module.exports.unload = function(reason) {
  return new Promise((resolve, reject) => {
    provider.close();
    resolve();
  });
}
