const Discord = require('discord.js');
const Keyv = require('keyv');
const https = require('https');
const fs = require('fs');
const url = require('url');
const path = require('path');
const events = {};
const commands = {};
const dir = './data/channellogger';
const logDbDir = 'sqlite://data/channellogger';
const loggingChannels = new Keyv('sqlite://data.db', { namespace: 'loggingChannels' });
const emojisSaved = new Keyv('sqlite://data.db', { namespace: 'loggedEmojis' });
const client = require('../main.js').getClient();
const utils = require('../utils.js');
const downloadTasks = new utils.TimerQueue();
const downloadInterval = 2 * 1000;
let shuttingDown = false; // We need this because sometimes the bot logs "<prefix>;shutdown"
let loggingChannelIds = {};
let savedEmojis = {};

function makeDir(guildDir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  if (!fs.existsSync(guildDir)) {
    fs.mkdirSync(guildDir);
  }
}

function formatDate(date) {
  return {
    dateString: `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`,
    timeString: `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}.${date.getMilliseconds()}`
  };
}

function databaseExists(channelId) {
  return loggingChannelIds[channelId]
}

function hasEmoji(emojiId) {
  return savedEmojis[emojiId];
}

async function initializeDatabase(guild, channel) {
  if (databaseExists(channel.id)) return;
  makeDir(`${dir}/${guild.id}`);
  const database = new Keyv(`${logDbDir}/${guild.id}/log.db`, { namespace: channel.id });
  await database.set('guildId', guild.id);
  await database.set('guildName', guild.name);
  await database.set('channelName', channel.name);
  loggingChannelIds[channel.id] = database;
  return database;
}

function downloadImage(guildDir, channelName, fileName, url, emoji = true) {
  makeDir(guildDir);
  let filesDir = `${guildDir}/files`;
  if (!fs.existsSync(filesDir)) {
    fs.mkdirSync(filesDir);
  }
  const date = new Date();
  let fileDir = '';
  if (!emoji) {
    fileDir += `${filesDir}/${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-`;
    fileDir += `${date.getHours()}.${date.getMinutes()}.${date.getSeconds()}-`;
    fileDir += `#${channelName}-${fileName}`;
  } else {
    fileDir = `${filesDir}/${fileName}`;
  }
  if (!fs.existsSync(fileDir)) {
    const file = fs.createWriteStream(fileDir);
    https.get(url, response => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
      });
    })
    .on('error', err => {
      fs.unlink(fileName);
      console.log(err);
    });
  }
}

async function log(msg, edited = false) {
  if (!msg.guild || shuttingDown) return;
  const guildId = msg.guild.id;
  const channel = msg.channel;
  const channelId = channel.id;
  const database = loggingChannelIds[channelId];
  if (!database) return;
  const author = msg.author;
  const attachments = msg.attachments;
  const content = String.raw`${msg.cleanContent}`;
  const formattedDateTime = formatDate(edited ? msg.editedAt : msg.createdAt);
  const guildDir = `${dir}/${guildId}`;
  const channelFile = `${guildDir}/${channelId}.log`;
  makeDir(guildDir, channelFile);
  const messageData = {
    logDate: formattedDateTime.dateString,
    logTime: formattedDateTime.timeString,
    logChannelName: `${channel.name}`,
    logAuthor: `${author.username}#${author.discriminator}`,
    logContent: `${content}`,
    downloadedAttachment: false,
    attachmentUrl: undefined
  };
  // Log string => channelid.log
  let log = `${messageData.logDate} `;
  log += `${messageData.logTime} `;
  log += `#${messageData.logChannelName} `;
  log += `${messageData.logAuthor}:\n`;
  if (messageData.logContent.length) {
    log += `${messageData.logContent}\n\n`;
  }
  if (attachments.size) {
    const attachmentUrl = attachments.first().url;
    const parsedUrl = url.parse(attachmentUrl);
    downloadTasks.addTask(downloadImage, downloadInterval, guildDir, channel.name, path.basename(parsedUrl.pathname), attachmentUrl);
    log += `ATTACHMENT: ${attachmentUrl}\n\n`;
    messageData['downloadedAttachment'] = true;
    messageData['attachmentUrl'] = attachmentUrl;
  }
  let emojiRegex = /(<a?:[\w\d]+:\d+>)/g;
  let match = emojiRegex.exec(msg.content);
  while (match) {
    let emojiProps = Discord.Util.parseEmoji(match[0]);
    if (emojiProps && !hasEmoji(emojiProps.id)) {
      let emoji = client.emojis.get(emojiProps.id) || new Discord.Emoji(msg.guild, {
        id: emojiProps.id,
        name: emojiProps.name,
        requiresColon: true,
        managed: false,
        animated: emojiProps.animated
      });
      if (emoji) {
        savedEmojis[emoji.id] = true;
        await emojisSaved.set('savedEmojis', savedEmojis);
        let emojiName = `${emoji.name}-${emoji.id}`;
        if (!emoji.animated) {
          emojiName += '.png';
        } else {
          emojiName += '.gif';
        }
        downloadTasks.addTask(downloadImage, downloadInterval, guildDir, channel.name, emojiName, emoji.url, true);
      }
    }
    match = emojiRegex.exec(msg.content);
  }
  fs.appendFile(channelFile, log, (err) => {
    if (err) {
      console.log(err);
    }
  });
  // Log database => log.db
  database.set(`${messageData.logDate}-${messageData.logTime}`, messageData).then((success) => {
    if (!success) {
      console.log(`Unable to log message in database: https://discordapp.com/channels/${guildId}/${chanenlId}/${msg.id}`);
    }
  });
}

async function editLog(oldmsg, newmsg) {
  let newmsgContentHolder = newmsg.content;
  let oldraw = String.raw`${oldmsg.cleanContent}`;
  let newraw = String.raw`${newmsg.cleanContent}`;
  newmsg.content = `EDIT:\nBefore: ${oldraw}\nAfter: ${newraw}`;
  log(newmsg, true);
  newmsg.content = newmsgContentHolder;
}

events.message = log;

events.messageUpdate = editLog;

commands.channellogger = async function(msg, args) {
  if (!client.checkOwner(msg)) return;
  if (args[0] === 'all' && msg.guild.available) {
    client.channels.tap(async (channel) => {
      await loggingChannels.set(channel.id, true);
      initializeDatabase(guild, channel.id);
    });
    msg.channel.send('Enabled logging for all channels in this guild');
  } else {
    const channel = msg.channel;
    if (loggingChannelIds[channel.id]) {
      delete loggingChannelIds[channel.id];
    } else {
      initializeDatabase(guild, channel.id);
    }
    await loggingChannels.set(channel.id, loggingChannelIds[channel.id] ? true : false);
    const abled = loggingChannelIds[channel.id]
    ? 'Enabled'
    : 'Disabled';
    channel.send(`${abled} logging for this channel`);
  }
}

module.exports.events = events;
module.exports.commands = commands;
module.exports.setup = function() {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  client.channels.tap((channel) => {
    loggingChannels.get(channel.id).then((logging) => {
      if (logging) {
        loggingChannelIds[channel.id] = new Keyv(`${logDbDir}/${channel.guild.id}/log.db`, { namespace: channel.id });
      }
    });
  });
  loggingChannels.on('error', err => console.log('Log Plugin Connection Error', err));
}
module.exports.unload = function(reason) {
  return new Promise((resolve, reject) => {
    if (reason === 'shutdown') {
      shuttingDown = true;
      client.channels.tap(async (channel) => {
        const database = loggingChannelIds[channel.id];
        if (database) {
          const guildDir = `${dir}/${channel.guild.id}`;
          const channelFile = `${guildDir}/${channel.id}.log`;
          const formattedDateTime = formatDate(new Date());
          const shutdownMessage = `*** BOT SHUTDOWN AT ${formattedDateTime.dateString} ${formattedDateTime.timeString}`;
          fs.access(channelFile, fs.F_OK, (err) => {
            if (err) {
              reject(err);
              return;
            }
            fs.appendFile(channelFile, shutdownMessage, function (err) {
              if (err) {
                reject(err);
              }
            });
          })
          await database.set(`${formattedDateTime.dateString}-${formattedDateTime.timeString}`, { 
            msg: '*** BOT SHUTDOWN ***', 
            date: formattedDateTime.dateString,
            time: formattedDateTime.timeString
          });
        }
      });
      resolve();
    }
  });
}