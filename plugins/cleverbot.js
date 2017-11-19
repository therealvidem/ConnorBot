const https = require('https');
const querystring = require('querystring');
const Enmap = require('enmap');
const EnmapLevel = require('enmap-level');
const provider = new EnmapLevel({name: 'cleverBot'});
const client = require('../main.js').getClient();
const events = {};
const commands = {};
const userStates = {};
const errors = {
  401: `Missing API key; set using ${client.prefix}setcleverbot <key>`,
  404: 'API not found',
  502: 'An error occured with the Cleverbot API',
  504: 'An error occured with the Cleverbot API',
  503: 'Too many requests are being made to the Cleverbot API'
}

function getReply(msg, userId, success) {
  const params = {
    key: client.cleverBot.get('key') || '',
    cs: userStates[userId] || ''
  }
  const stringified = querystring.stringify(params);
  const options = {
    host: 'www.cleverbot.com',
    path: `/getreply?${stringified}`,
    method: 'GET',
    headers: {'Content-Type': 'text/javascript'}
  };
  let req = https.request(options, function(res) {
    let resData = [];
    res.on('data', function(data) {
      resData.push(data);
    });
    res.on('end', function() {
      resData = Buffer.concat(resData).toString();
      let resObj = JSON.parse(resData);
      success(resObj);
    })
  });
  req.end();
}

function reply(msg, channel, userId) {
  channel.startTyping();
  getReply(msg, userId, function(data) {
    if (data.status) {
      channel.send(errors[data.status]);
      return;
    }
    userStates[userId] = data.cs;
    channel.send(data.output);
    channel.stopTyping();
  });
}

events.message = function(msg) {
  // Checks if the user isn't a bot and if the user has mentioned the bot.
  if (msg.author.bot || !msg.isMemberMentioned(client.user)) return;
  // Since the message could look like "@Bot hello there", we have to
  // split the content into an array of strings, delete the mention part,
  // then join the strings together again, and finally pass in the result: "hello there".
  let content = msg.content.trim().split(/ +/g);
  content.shift();
  reply(content.join(' '), msg.channel, msg.author.id);
}

commands.cleverbot = function(msg, args) {
  reply(args.join(' '), msg.channel, msg.author.id);
}

commands.setcleverbot = function(msg, args) {
  let key = args[0];
  if (!key || msg.author.id != client.ownerId) return;
  if (msg.channel.type != 'dm') {
    msg.channel.send('You can only use that command in DMs');
    return;
  }
  client.cleverBot.set('key', key);
  msg.channel.send(`Successfully set key to ${key}`);
}

module.exports.events = events;
module.exports.commands = commands;
module.exports.setup = function() {
  client.cleverBot = new Enmap({provider: provider});
  client.cleverBot.defer.then(() => {
    console.log('Loaded Cleverbot data.');
  });
}
