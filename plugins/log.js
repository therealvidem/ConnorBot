const Keyv = require('keyv');
const https = require('https');
const fs = require('fs');
const url = require('url');
const path = require('path');
const events = {};
const commands = {};
const dir = './data/channellogger';
const logDbDir = 'sqlite://data/channellogger';
const client = require('../main.js').getClient();
let shuttingDown = false; // We need this because sometimes the bot logs "<prefix>;shutdown"
let loggingChannelIds = {};

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

function databaseExists(guildDir, guildId, channelId) {
  if (fs.existsSync(dir) && fs.existsSync(guildDir)) {
    const database = new Keyv(`${logDbDir}/${guildId}/log.db`, { namespace: channelId });
    database.get('guildId').then((foundGuildId) => {
      return foundGuildId === guildId;
    })
    .on((err) => {
      console.log(err);
      return false;
    });
  }
  return false;
}

async function initializeDatabase(guild, channel) {
  if (databaseExists(guild, channel.id)) return;
  makeDir(`${dir}/${guild.id}`);
  const database = new Keyv(`${logDbDir}/${guild.id}/log.db`, { namespace: channel.id });
  await database.set('guildId', guild.id);
  await database.set('guildName', guild.name);
  await database.set('channelName', channel.name);
  return database;
}

function downloadImage(guildDir, channelName, fileName, url) {
  return new Promise((resolve, reject) => {
    makeDir(guildDir);
    let filesDir = `${guildDir}/files`;
    if (!fs.existsSync(filesDir)) {
      fs.mkdirSync(filesDir);
    }
    const date = new Date();
    let fileDir = `${filesDir}/${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-`;
    fileDir += `${date.getHours()}.${date.getMinutes()}.${date.getSeconds()}-`;
    fileDir += `#${channelName}-${fileName}`;
    if (!fs.existsSync(fileDir)) {
      const file = fs.createWriteStream(fileDir);
      https.get(url, response => {
        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      })
      .on('error', err => {
        fs.unlink(fileName);
        reject(err.message);
      });
    }
  });
}

async function log(msg, edited) {
  if (!msg.guild || shuttingDown) return;
  const guildId = msg.guild.id;
  const channel = msg.channel;
  const channelId = channel.id;
  const logChannel = loggingChannelIds[channelId];
  if (!logChannel) return;
  const author = msg.author;
  const attachments = msg.attachments;
  const content = String.raw`${msg.cleanContent}`;
  const formattedDateTime = formatDate(msg.createdAt);
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
    downloadImage(guildDir, channel.name, path.basename(parsedUrl.pathname), attachmentUrl).catch((err) => {
      log += `FAILED TO DOWNLOAD ATTACHMENT: ${err}\n`;
      messageData['downloadedAttachment'] = true;
    });
    log += `ATTACHMENT: ${attachmentUrl}\n\n`;
    messageData['attachmentUrl'] = attachmentUrl;
  }
  fs.appendFile(channelFile, log, (err) => {
    if (err) {
      console.log(err);
    }
  });
  // Log database => log.db
  const database = await initializeDatabase(msg.guild, channel);
  database.set(`${messageData.logDate}-${messageData.logTime}`, messageData).then((success) => {
    if (!success) {
      console.log(`Unable to log message in database: https://discordapp.com/channels/${guildId}/${chanenlId}/${msg.id}`);
    }
  });
}

async function editLog() {
  let newmsgContentHolder = newmsg.content;
  let oldraw = String.raw`${oldmsg.cleanContent}`;
  let newraw = String.raw`${newmsg.cleanContent}`;
  newmsg.content = `EDIT:\nBefore: ${oldraw}\nAfter: ${newraw}`;
  log(newmsg);
  newmsg.content = newmsgContentHolder;
}

events.message = log;

events.messageUpdate = editLog;

commands.channellogger = async function(msg, args) {
  if (!client.checkOwner(msg)) return;
  if (args[0] === 'all' && msg.guild.available) {
    client.channels.tap(async (channel) => {
      loggingChannelIds[channel.id] = true;
      await client.loggingChannels.set(channel.id, true);
      initializeDatabase(guild, channel.id);
    });
    msg.channel.send('Enabled logging for all channels in this guild');
  } else {
    const channel = msg.channel;
    if (loggingChannelIds[channel.id]) {
      delete loggingChannelIds[channel.id];
    } else {
      loggingChannelIds[channel.id] = true;
      initializeDatabase(guild, channel.id);
    }
    await client.loggingChannels.set(channel.id, loggingChannelIds[channel.id]);
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
  client.loggingChannels = new Keyv('sqlite://data.db', { namespace: 'loggingChannels' });
  client.channels.tap((channel) => {
    client.loggingChannels.get(channel.id).then((logging) => {
      if (logging) {
        loggingChannelIds[channel.id] = true;
      }
    });
  });
  client.loggingChannels.on('error', err => console.log('Log Plugin Connection Error', err));
}
module.exports.unload = function(reason) {
  return new Promise((resolve, reject) => {
    if (reason === 'shutdown') {
      shuttingDown = true;
      client.channels.tap((channel) => {
        if (loggingChannelIds[channel.id]) {
          const guildDir = `${dir}/${channel.guild.id}`;
          const channelFile = `${guildDir}/${channel.id}.log`;
          const formattedDateTime = formatDate(new Date());
          let log = `*** BOT SHUTDOWN AT ${formattedDateTime.dateString} `;
          log += `${formattedDateTime.timeString} ***\n\n`;
          fs.access(channelFile, fs.F_OK, (err) => {
            if (err) {
              reject(err);
              return;
            }
            fs.appendFile(channelFile, log, function (err) {
              if (err) {
                reject(err);
              }
            });
          })
        }
      });
      resolve();
    }
  });
}