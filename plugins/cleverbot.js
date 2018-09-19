const querystring = require('querystring');
const request = require('request');
const cleverbotUrl = 'https://cleverbot.io/1.0/';
const Enmap = require('enmap');
const Discord = require('discord.js')
const client = require('../main.js').getClient();
const userStates = {};
const events = {};
const commands = {};

function init(user, key, nick) {
  console.log(user, key, nick);
  request.post({
    url: cleverbotUrl + 'create',
    form: {
      'user': user,
      'key': key,
      'nick': nick
    }
  }, (err, httpResponse, body) => {
    if (err) {
      console.log(err);
      return;
    }
    const jsonBody = JSON.parse(body);
    if (!jsonBody.status === 'success') {
      console.log(jsonBody.status);
    }
  });
}

function reply(msg, channel, userId) {
  const user = client.cleverBot.get('user');
  const key = client.cleverBot.get('key');
  if (!userStates[userId]) {
    init(user, key, userId);
  }
  channel.startTyping();
  request.post({
    url: cleverbotUrl + 'ask',
    form: {
      'user': user,
      'key': key,
      'nick': userId,
      'text': msg
    }
  }, (err, httpResponse, body) => {
    if (err) {
      channel.send('An error occured');
      console.log(err);
      channel.stopTyping();
      return;
    }
    const jsonBody = JSON.parse(body);
    if (jsonBody.status === 'success') {
      channel.send(jsonBody.response);
      channel.stopTyping();
      userStates[userId] = true;
    } else {
      channel.send('An error occured');
      console.log(jsonBody.status);
      channel.stopTyping();
      return;
    }
  });
}

events.message = function(msg) {
  // Checks if the user isn't a bot and if the user has mentioned the bot.
  if (msg.author.bot || !msg.isMemberMentioned(client.user) || msg.mentions.everyone) return;
  // Since the message could look like "@Bot hello there", we have to
  // split the content into an array of strings, delete the mention part,
  // then join the strings together again, and finally pass in the result: "hello there".
  let content = msg.content.trim();
  let test_mention = Discord.MessageMentions.USERS_PATTERN.exec(content);
  Discord.MessageMentions.USERS_PATTERN.lastIndex = 0;
  let cleanContent = msg.cleanContent.trim().split(/ +/g).slice(1);
  if (!test_mention || test_mention.index !== 0 || content.charAt(test_mention.index + test_mention[0].length) !== ' ') return;
  reply(encodeURI(cleanContent.join(' ')), msg.channel, msg.author.id);
}

commands.cleverbot = function(msg, args) {
  if (!args[0]) return;
  let cleanContent = msg.cleanContent;
  cleanContent = cleanContent.slice(client.prefix.length + 10); // "c;cleverbot test" -> "test"
  reply(encodeURI(cleanContent.join(' ')), msg.channel, msg.author.id);
}

commands.setcleverbot = function(msg, args) {
  let user = args[0];
  let key = args[1];
  if (!key || !user || !client.checkOwner(msg)) return;
  if (msg.channel.type != 'dm') {
    msg.channel.send('You can only use that command in DMs');
    return;
  }
  client.cleverBot.set('user', user);
  client.cleverBot.set('key', key);
  msg.channel.send(`Successfully set user and key`);
}

module.exports.events = events;
module.exports.commands = commands;
module.exports.setup = function() {
  client.cleverBot = new Enmap({ name: 'cleverBot' });
  client.cleverBot.defer.then(() => {
    console.log('Loaded Cleverbot data');
  });
}