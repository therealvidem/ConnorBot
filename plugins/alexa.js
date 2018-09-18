const config = require('../config.json');

if (!config.googleKey) {
  console.log('Alexa plugin disabled; put a "googleKey" into the config file');
  return;
}

const googleKey = config.googleKey;
const events = {};
const ytdl = require('ytdl-core');
const search = require('youtube-search');
const main = require('../main.js');
const client = main.getClient();
const cooldown = 20 * 1000;
const usersCooldown = new Set();
const guilds = {};
const volumes = {};
// let currentVolume = 100;
// let dispatcher;
// let currentlyPlaying;

function getVolume(msg) {
  const args = msg.content.split(/ +/g);
  const volume = parseInt(args[2]);
  if (!volume || volume > 200 || volume < 0) {
    msg.channel.send('Volume must be an integer between 0-200');
    return;
  }
  return volume;
}

function play(msg, query) {
  const options = {
    'maxResults': 1,
    'key': googleKey,
    'type': 'video'
  };
  search(query, options, (err, results) => {
    if (err || results.length < 1) {
      msg.channel.send(`I cannot find ${query}`);
      return;
    }
    const result = results[0];
    const stream = ytdl(result.link, {filter: 'audioonly'});
    const volume = volumes[msg.guild.id] || 100;
    volumes[msg.guild.id] = volume;
    msg.member.voiceChannel.join().then(connection => {
      guilds[msg.guild.id] = {
        'dispatcher': connection.playStream(stream, {'volume': volume / 100}),
        'currentlyPlaying': {
          'title': result.title,
          'link': result.link
        }
      }
      guilds[msg.guild.id].dispatcher.on('end', (reason) => {
        if (reason !== 'user') {
          msg.member.voiceChannel.leave();
        }
      });
      msg.channel.send(`Playing "${result.title}"`);
    }).catch(err => {
      msg.channel.send('Error joining vc');
      console.log(err);
    });
  })
  .catch(console.log);
}

events.message = function(msg) {
  if (!msg.guild) return;
  const guild = guilds[msg.guild.id];
  const content = msg.content.toLowerCase();
  if (content.startsWith('alexa, play') || content.startsWith('connor, play')) {
    if (msg.member.voiceChannel) {
      if (usersCooldown.has(msg.author)) {
        msg.channel.send('You must wait before you may queue again');
        return;
      }
      const query = msg.content.split(/ +/g).splice(2).join(' ');
      if (!query) {
        msg.channel.send('I cannot find what you are trying to search for');
        return;
      }
      usersCooldown.add(msg.author);
      setTimeout(() => {
        usersCooldown.delete(msg.author);
      }, cooldown);
      if (guild && guild.dispatcher && !guild.dispatcher.destroyed) {
        guild.dispatcher.end();
        setTimeout(() => {
          play(msg, query);
        }, 1 * 1000);
      } else {
        play(msg, query);
      }
    }
  } else if (content.startsWith('alexa, volume') || content.startsWith('connor, volume')) {
    if (msg.member.voiceChannel && guild && guild.dispatcher) {
      const volume = getVolume(msg);
      if (!volume) return;
      volumes[msg.guild.id] = volume;
      guild.dispatcher.setVolume(volume / 100);
      msg.channel.send(`Volume is now ${volume}`);
    } else {
      const volume = getVolume(msg);
      if (!volume) return;
      volumes[msg.guild.id] = volume;
      msg.channel.send(`Volume is now ${volume}`);
    }
  } else if (content.startsWith('alexa, stop') || content.startsWith('connor, stop')) {
    if (msg.member.voiceChannel && guild && guild.dispatcher) {
      if (!guild.dispatcher.destroyed) {
        guild.dispatcher.end();
      }
      delete guilds[msg.guild.id];
      msg.member.voiceChannel.leave();
    }
  } else if (content.startsWith('alexa, what\'s playing') || content.startsWith('connor, what\'s playing')) {
    if (guild && guild.currentlyPlaying) {
      msg.channel.send(`Currently playing: "${guild.currentlyPlaying['title']}"\n${guild.currentlyPlaying['link']}`);
    } else {
      msg.channel.send('Nothing is currently playing');
    }
  }
}

module.exports.events = events;
