const Discord = require('discord.js');
const Keyv = require('keyv');
const https = require('https');
const fs = require('fs');
const urlmod = require('url');
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
const downloadInterval = 15 * 1000;
let shuttingDown = false; // We need this because sometimes the bot logs "<prefix>;shutdown"
let loggingGuilds = {};
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
  const monthString = (date.getMonth() + 1).toString().padStart(2, '0');
  const dateString = date.getDate().toString().padStart(2, '0');
  const hoursString = date.getHours().toString().padStart(2, '0');
  const minutesString = date.getMinutes().toString().padStart(2, '0');
  const secondsString = date.getSeconds().toString().padStart(2, '0');
  const millisecondsString = date.getMilliseconds().toString().padStart(3, '0');
  return {
    dateString: `${date.getFullYear()}-${monthString}-${dateString}`,
    timeString: `${hoursString}:${minutesString}:${secondsString}.${millisecondsString}`
  };
}

function databaseExists(guildId, channelId) {
  if (!loggingGuilds[guildId]) return;
  return loggingGuilds[guildId][channelId];
}

function hasEmoji(emojiId) {
  return savedEmojis[emojiId];
}

async function initializeDatabase(guild, channelId, channelName) {
  if (databaseExists(channelId)) return;
  const guildId = guild.id;
  makeDir(`${dir}/${guildId}`);
  const database = new Keyv(`${logDbDir}/${guildId}/log.db`, { namespace: channelId });
  await database.set('guildId', guildId);
  await database.set('guildName', guild.name);
  await database.set('channelName', channelName);
  if (!loggingGuilds[guildId]) {
    loggingGuilds[guildId] = {};
  }
  loggingGuilds[guildId][channelId] = database;
  return database;
}

function downloadAttachment(guildDir, channelName, fileName, url, emoji) {
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
    if (fileDir.length > 4096 || fileName.length > 255) {
      fileDir = `${filesDir}/${fileName}`;
    }
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

async function logMessage(msg) {
  if (!msg.guild || shuttingDown) return;
  const guildId = msg.guild.id;
  const channel = msg.channel;
  const channelId = channel.id;
  const database = loggingGuilds[guildId][channelId];
  if (!database) return;
  const author = msg.author;
  const attachments = msg.attachments;
  const content = String.raw`${msg.cleanContent}`;
  const formattedDateTime = formatDate(msg.editedAt || msg.createdAt);
  const guildDir = `${dir}/${guildId}`;
  const channelFile = `${guildDir}/${channelId}.log`;
  makeDir(guildDir);
  const messageData = {
    id: msg.id,
    timestamp: msg.editedTimestamp || msg.createdTimestamp,
    channelName: channel.name,
    channelId: channelId,
    author: {
      id: author.id,
      name: `${author.username}#${author.discriminator}`
    },
    content: content,
    downloadedAttachment: false
  };
  if (msg.member && msg.member.nickname) {
    messageData.author.nickname = msg.member.nickname;
  }
  if (msg.embeds.length > 0) {
    messageData.content = '[EMBED]';
    messageData.embeds = [];
    // I don't see why messages would have more than one embed, but just in case...
    msg.embeds.forEach((embed, i) => {
      let embedData = {};
      embedData.color = embed.color;
      embedData.timestamp = embed.timestamp;
      embedData.url = embed.url;
      if (embed.author) {
        embedData.authorName = embed.author.name;
        embedData.authorIconURL = embed.author.iconURL;
        if (embedData.authorIconURL) {
          const parsedUrl = urlmod.parse(embedData.authorIconURL);
          downloadTasks.addTask(downloadAttachment, downloadInterval, guildDir, channel.name, path.basename(parsedUrl.pathname), embedData.authorIconURL);
        }
        if (embedData.authorURL) {
          embedData.authorURL = embed.author.url;
        }
      }
      if (embed.description) {
        embedData.description = embed.description;
      }
      if (embed.footer) {
        embedData.footer = embed.footer;
      }
      if (embed.image && embed.image.url) {
        embedData.imageURL = embed.image.url;
        const parsedUrl = urlmod.parse(embedData.imageURL);
        downloadTasks.addTask(downloadAttachment, downloadInterval, guildDir, channel.name, path.basename(parsedUrl.pathname), embedData.imageURL);
      }
      if (embed.thumbnail && embed.thumbnail.url) {
        embedData.thumbnailURL = embed.thumbnail.url;
        const parsedUrl = urlmod.parse(embedData.thumbnailURL);
        downloadTasks.addTask(downloadAttachment, downloadInterval, guildDir, channel.name, path.basename(parsedUrl.pathname), embedData.thumbnailURL);
      }
      if (embed.title) {
        embedData.title = embed.title;
      }
      if (embed.video) {
        embedData.videoURL = embed.video.url;
      }
      if (embed.fields.length > 0) {
        embedData.fields = [];
        embed.fields.forEach((field) => {
          embedData.fields.push({
            name: field.name,
            value: field.value
          });
        });
      }
      messageData.embeds.push(embedData);
    });
  }
  if (messageData.content.length === 0) {
    messageData.content = '[EMPTY MESSAGE]';
  }
  // Log string => channelid.log
  let log = `${formattedDateTime.dateString} `;
  log += `${formattedDateTime.timeString} `;
  log += `#${messageData.channelName} `;
  log += `${messageData.author.name}:\n`;
  log += `${messageData.content}\n\n`;
  if (attachments.size > 0) {
    messageData.downloadedAttachment = true;
    messageData.attachments = [];
    let i = 0;
    attachments.tap((attachment) => {
      let attachmentData = {
        id: attachment.id,
        name: attachment.filename,
        size: attachment.filesize,
        url: attachment.url
      };
      downloadTasks.addTask(downloadAttachment, downloadInterval, guildDir, channel.name, attachmentData.name, attachmentData.url);
      log += `ATTACHMENT${i}: ${attachmentData.url}\n\n`;
      messageData.attachments.push(attachmentData);
      i += 1;
    });
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
        downloadTasks.addTask(downloadAttachment, downloadInterval, guildDir, channel.name, emojiName, emoji.url, true);
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
  database.set(messageData.timestamp.toString(), messageData).then((success) => {
    if (!success) {
      console.log(`Unable to log message in database: https://discordapp.com/channels/${guildId}/${chanenlId}/${msg.id}`);
    }
  });
}

async function editLog(oldmsg, newmsg) {
  let newmsgDummy = Object.assign({}, newmsg);
  let oldraw = String.raw`${oldmsg.cleanContent}`;
  let newraw = String.raw`${newmsg.cleanContent}`;
  newmsgDummy.content = `EDIT:\nBefore: ${oldraw}\nAfter: ${newraw}`;
  logMessage(newmsgDummy);
}

events.message = logMessage;

events.messageUpdate = editLog;

commands.channellogger = async function(msg, args) {
  if (!client.checkOwner(msg) || !msg.guild.available) return;
  const guild = msg.guild;
  if (args) {
    if (args[0] === 'all') {
      guild.channels.tap(async (channel) => {
        await loggingChannels.set(channel.id, true);
        await initializeDatabase(guild, channel.id, channel.name);
      });
      msg.channel.send('Enabled logging for all channels in this guild');
    } else {
      msg.channel.send(`You only need to execute "${client.prefix}channellogger" inside the channel you want to log`);
    }
  } else {
    const channel = msg.channel;
    const channelId = channel.id;
    if (loggingGuilds[guild.id][channelId] !== undefined) {
      delete loggingGuilds[guild.id][channelId];
    } else {
      await initializeDatabase(guild, channelId, channel.name);
    }
    await loggingChannels.set(channelId, loggingGuilds[guild.id][channelId] !== undefined ? true : false);
    const abled = loggingGuilds[guild.id][channelId] !== undefined
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
        const guildId = channel.guild.id;
        const guildDir = `${dir}/${guildId}`;
        if (!fs.existsSync(guildDir)) {
          fs.mkdirSync(guildDir);
        }
        if (!fs.existsSync(`${guildDir}/log.db`)) {
          initializeDatabase(channel.guild, channel.id, channel.name);
        } else {
          if (!loggingGuilds[guildId]) {
            loggingGuilds[guildId] = {};
          }
          loggingGuilds[guildId][channel.id] = new Keyv(`${logDbDir}/${guildId}/log.db`, { namespace: channel.id });
        }
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
          const shutdownMessage = `*** BOT SHUTDOWN AT ${formattedDateTime.dateString} ${formattedDateTime.timeString}\n\n`;
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