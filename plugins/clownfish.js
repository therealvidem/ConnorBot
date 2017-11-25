const translate = require('google-translate-api');
const events = {};
const client = require('../main.js').getClient();
const chance = Math.floor(Math.random() * 50);
const flags = {
  'es': '🇪🇸',
  'fr': '🇫🇷',
  'ja': '🇯🇵',
  'km': '🇰🇭',
  'zh-cn': '🇨🇳',
  'de': '🇩🇪',
  'ko': '🇰🇷'
};
const languages = [
  'es',
  'fr',
  'ja',
  'km',
  'zh-cn',
  'de',
  'ko'
];

function randomFromList(list) {
  return list[Math.floor(Math.random() * list.length)];
}

events.message = function(msg) {
  if (msg.content < 1 || msg.author.bot) return;
  const num = Math.floor(Math.random() * 50);
  const language = randomFromList(languages);
  const flag = flags[language];
  if (num === chance) {
    translate(msg.content, {from: 'en', to: language})
    .then(res => {
      msg.channel.send(`( (${flag}) ${res.text} )`);
    })
    .catch(err => {
      console.error(err);
    });
  }
}

module.exports.events = events;
