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
const cooldown = 1 * 60 * 1000;
const usersCooldown = new Set();
let currentVolume = 100;
let dispatcher;
let currentlyPlaying;

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
  msg.member.voiceChannel.join().then(connection => {
    const options = {
      'maxResults': 1,
      'key': googleKey,
      'type': 'video'
    }
    search(query, options, (err, results) => {
      if (err || results.length < 1) {
        msg.channel.send(`I cannot find ${query}`);
        return;
      }
      const result = results[0];
      const stream = ytdl(result.link, {filter: 'audioonly'});
      dispatcher = connection.playStream(stream, {volume: currentVolume / 100});
      dispatcher.on('end', (reason) => {
        if (reason !== 'user') {
          msg.member.voiceChannel.leave();
        }
      });
      currentlyPlaying = {
        'title': result.title,
        'link': result.link
      }
      msg.channel.send(`Playing "${result.title}"`);
    });
  })
  .catch(console.log);
}

events.message = function(msg) {
  if (!msg.guild) return;

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
      if (dispatcher && !dispatcher.destroyed) {
        dispatcher.end();
        setTimeout(() => {
          play(msg, query);
        }, 1 * 1000);
      } else {
        play(msg, query);
      }
    }
  } else if (content.startsWith('alexa, volume') || content.startsWith('connor, volume')) {
    if (msg.member.voiceChannel && dispatcher) {
      const volume = getVolume(msg);
      if (!volume) return;
      currentVolume = volume;
      dispatcher.setVolume(volume / 100);
      msg.channel.send(`Volume is now ${currentVolume}`);
    } else {
      const volume = getVolume(msg);
      if (!volume) return;
      currentVolume = volume;
      msg.channel.send(`Volume is now ${currentVolume}`);
    }
  } else if (content.startsWith('alexa, stop') || content.startsWith('connor, stop')) {
    if (msg.member.voiceChannel && dispatcher) {
      if (!dispatcher.destroyed) {
        dispatcher.end();
      }
      dispatcher = undefined;
      currentlyPlaying = undefined;
      msg.member.voiceChannel.leave();
    }
  } else if (content.startsWith('alexa, what\'s playing') || content.startsWith('connor, what\'s playing')) {
    if (!currentlyPlaying) {
      msg.channel.send('Nothing is currently playing');
    } else {
      msg.channel.send(`Currently playing: "${currentlyPlaying['title']}"\n${currentlyPlaying['link']}`);
    }
  }
}

module.exports.events = events;
