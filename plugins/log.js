const Enmap = require('enmap');
const EnmapLevel = require('enmap-level');
const provider = new EnmapLevel({name: 'loggingChannels'});
const fs = require('fs');
const events = {};
const commands = {};
const dir = './data/channellogger';
var client;

function makeDir(guildDir, channelFile) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  if (!fs.existsSync(guildDir)) {
    fs.mkdirSync(guildDir);
  }
}

function log(msg) {
  const guildId = msg.guild.id;
  const channel = msg.channel;
  const channelId = channel.id;
  if (!client.loggingChannels.get(channelId)) return;
  const author = msg.author;
  const attachments = msg.attachments;
  const content = msg.cleanContent;
  const timestamp = msg.createdTimestamp;
  const guildDir = `${dir}/${guildId}`;
  const channelFile = `${guildDir}/${channelId}.log`;
  makeDir(guildDir, channelFile);
  const date = new Date(timestamp);
  let log = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} `;
  log += `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}.${date.getMilliseconds()} `;
  log += `#${channel.name} `;
  log += `${author.username}#${author.discriminator}:\n`;
  log += attachments.size
         ? `ATTACHMENT: ${attachments.first().url}`
         : String.raw`${content}`;
  log += '\n\n';
  fs.appendFile(channelFile, log, function (err) {
    if (err) {
      console.log(err);
    }
  });
}

events.message = log;

events.messageUpdate = function(oldmsg, newmsg) {
  oldraw = String.raw`${oldmsg.cleanContent}`;
  newraw = String.raw`${newmsg.cleanContent}`;
  newmsg.content = `EDIT:\nBefore: ${oldraw}\nAfter: ${newraw}`;
  log(newmsg);
}

commands.channellogger = function(client, msg, args) {
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

module.exports.events = events;
module.exports.commands = commands;
module.exports.setup = function(passedClient) {
  client = passedClient;
  client.loggingChannels = new Enmap({provider: provider});
  client.loggingChannels.defer.then(() => {
    console.log('Loaded loggingChannels data.');
  });
}
