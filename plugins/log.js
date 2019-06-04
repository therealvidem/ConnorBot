const Enmap = require('enmap');
const fs = require('fs');
const events = {};
const commands = {};
const dir = './data/channellogger';
const client = require('../main.js').getClient();
let shuttingDown = false; // We need this because sometimes the bot logs "<prefix>;shutdown"

function makeDir(guildDir, channelFile) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  if (!fs.existsSync(guildDir)) {
    fs.mkdirSync(guildDir);
  }
}

function log(msg) {
  if (!msg.guild || shuttingDown) return;
  const guildId = msg.guild.id;
  const channel = msg.channel;
  const channelId = channel.id;
  if (!client.loggingChannels.get(channelId)) return;
  const author = msg.author;
  const attachments = msg.attachments;
  const content = String.raw`${msg.cleanContent}`;
  const timestamp = msg.createdTimestamp;
  const guildDir = `${dir}/${guildId}`;
  const channelFile = `${guildDir}/${channelId}.log`;
  makeDir(guildDir, channelFile);
  const date = new Date(timestamp);
  let log = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} `;
  log += `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}.${date.getMilliseconds()} `;
  log += `#${channel.name} `;
  log += `${author.username}#${author.discriminator}:\n`;
  if (content.length) {
    log += `${content}\n\n`;
  }
  if (attachments.size) {
    log += `ATTACHMENT: ${attachments.first().url}\n\n`;
  }
  fs.appendFile(channelFile, log, function (err) {
    if (err) {
      console.log(err);
    }
  });
}

events.message = log;

events.messageUpdate = function(oldmsg, newmsg) {
  let newmsgContentHolder = newmsg.content;
  let oldraw = String.raw`${oldmsg.cleanContent}`;
  let newraw = String.raw`${newmsg.cleanContent}`;
  newmsg.content = `EDIT:\nBefore: ${oldraw}\nAfter: ${newraw}`;
  log(newmsg);
  newmsg.content = newmsgContentHolder;
}

commands.channellogger = function(msg, args) {
  if (!client.checkOwner(msg)) return;
  if (args[0] === 'all') {
    for (const channel in client.channels) {
      client.loggingChannels.set(channel.id, true);
    }
    msg.channel.send('Enabled logging for all channels in this guild');
  } else {
    const channel = msg.channel;
    let logging = client.loggingChannels.get(channel.id);
    if (logging === undefined) {
      logging = false;
    }
    client.loggingChannels.set(channel.id, !logging);
    const abled = !logging
    ? 'Enabled'
    : 'Disabled';
    channel.send(`${abled} logging for this channel.`);
  }
}

module.exports.events = events;
module.exports.commands = commands;
module.exports.setup = function() {
  client.loggingChannels = new Enmap({ name: 'loggingChannels' });
  client.loggingChannels.defer.then(() => {
    console.log('Loaded loggingChannels data.');
  });
}
module.exports.unload = function(reason) {
  return new Promise((resolve, reject) => {
    if (reason === 'shutdown') {
      shuttingDown = true;
      const loggingChannels = client.channels.filter((channel) => {
        return channel.type === 'text' && client.loggingChannels.get(channel.id);
      });
      loggingChannels.forEach((channel) => {
        const guildDir = `${dir}/${channel.guild.id}`;
        const channelFile = `${guildDir}/${channel.id}.log`;
        const date = new Date();
        let log = `*** BOT SHUTDOWN AT ${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} `;
        log += `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}.${date.getMilliseconds()} ***\n\n`;
        fs.appendFile(channelFile, log, function (err) {
          if (err) {
            console.log(err);
          }
        });
      });
    }
  });
}
