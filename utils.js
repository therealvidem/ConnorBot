const Discord = require('discord.js');
const dateFormat = require('dateformat');
const presenceFormat = {
  'online': 'Online',
  'offline': 'Offline',
  'idle': 'Idle',
  'dnd': 'Do Not Disturb'
};
const MENTIONS_PATTERN = new RegExp('<@!?([0-9]+)>$');
const ARGS_PATTERN = /[^\\\s]?"(.*?[^\\])"|[^\\\s]?'(.*?[^\\])'|[^\\\s]?`(.*?[^\\])`|([^\s]+)/g;
// Got this pattern from: https://github.com/campbellbrendene/discord-command-parser/blob/master/src/regexps.js
const REMAINING_QUOTES_PATTERN = /^"|"$|^'|'$|^`|`$/g;

function removeNonASCII(arg) {
  return arg.replace(/[^\x00-\x7F]/g, '').trim();
}

// https://codereview.stackexchange.com/questions/148363/time-delayed-function-queue
function TimerQueue() {
  this.currentTimer = null;
  this.tasks = [];
}

TimerQueue.prototype.addTask = function(callback, delay, ...args) {
  this.tasks.push({ callback: callback, delay: delay, args: args });
  if (this.currentTimer) return;
  this.launchNextTask();
}

TimerQueue.prototype.launchNextTask = function() {
  if (this.currentTimer) return;
  let self = this;
  let nextTask = this.tasks.shift();
  if (!nextTask) return this.clear();
  nextTask.callback.call(null, ...nextTask.args);
  this.currentTimer = setTimeout(() => {
    self.currentTimer = null;
    self.launchNextTask();
  }, nextTask.delay);
}

TimerQueue.prototype.clear = function() {
  if (this.currentTimer) clearTimeout(this.currentTimer);
  this.currentTimer = null;
  this.tasks.length = 0;
}

module.exports.TimerQueue = TimerQueue;

module.exports.parseArgs = function(argsString) {
  if (argsString) {
    const args = [];
    let arg;
    while ((arg = ARGS_PATTERN.exec(argsString)) !== null) {
      let argString = arg[0];
      args.push(argString.replace(REMAINING_QUOTES_PATTERN, ''));
    }
    return args;
  }
}

module.exports.invertObject = function(obj) {
  const newObj = {};
  for (const prop in obj) {
    newObj[obj[prop]] = prop;
  }
  return newObj;
}

module.exports.convertToRole = function(guild, arg) {
  if (!arg) return;
  const query = arg.toLowerCase();
  const roles = guild.roles;
  // First, try to find by id
  let role = roles.get(arg);
  if (!role) {
    // Second, try to find by name
    role = roles.find((r) => {
      return r.name.toLowerCase() === arg;
    });
  }
  return role;
}

module.exports.convertToMember = function(channel, arg) {
  if (!arg) return;
  const mention = MENTIONS_PATTERN.exec(arg);
  if (mention) {
    return channel.guild.members.get(mention[1]);
  }
  const query = arg.toLowerCase();
  const members = channel.members;
  const discriminator = (arg.length > 5 && arg.indexOf('#') == arg.length - 5) ? arg.slice(-4) : undefined;
  if (discriminator) {
    const name = query.slice(0, -5);
    const hasNonASCII = name.search(/[^\x00-\x7F]/g) !== -1;
    const member = members.find((m) => {
      let username = m.user.username.toLowerCase();
      let displayName = m.displayName.toLowerCase();
      if (!hasNonASCII) { // If non-ASCII characters AREN'T found, remove any from the member's names.
        username = removeNonASCII(username);
        displayName = removeNonASCII(displayName);
      }
      return (username === name || displayName === name) && m.user.discriminator === discriminator;
    });
    return member;
  }
  const hasNonASCII = query.search(/[^\x00-\x7F]/g) !== -1;
  const member = members.find((m) => {
    let username = m.user.username.toLowerCase();
    let displayName = m.displayName.toLowerCase();
    if (!hasNonASCII) {
      username = removeNonASCII(username);
      displayName = removeNonASCII(displayName);
    }
    return (username.indexOf(query) === 0 || displayName.indexOf(query) === 0 || m.user.id === query);
  });
  return member;
}

module.exports.getEmbedFromObject = function(obj, inline, existingEmbed) {
  const embed = existingEmbed || new Discord.RichEmbed();
  for (const key in obj) {
    embed.addField(key, obj[key], inline);
  }
  return embed;
}

module.exports.getBaseProfile = function(member, color, existingEmbed) {
  const embed = existingEmbed || new Discord.RichEmbed();
  const nickname = member.nickname ? member.nickname : member.displayName;
  embed.setColor(color || member.displayHexColor)
  embed.setAuthor(nickname, member.user.displayAvatarURL);
  return embed;
}

module.exports.getUserProfile = function(member) {
  const user = member.user;
  const nameTag = user.tag;
  const hexColor = member.displayHexColor;
  const nickname = member.nickname ? member.nickname : member.displayName;
  const game = user.presence.game ? user.presence.game.name : 'Nothing';
  const creationDate = dateFormat(user.createdAt, 'dddd, mmmm dS, yyyy, h:MM:ss TT Z');
  const joinedDate = dateFormat(member.joinedAt, 'dddd, mmmm dS, yyyy, h:MM:ss TT Z');
  const roles = member.roles.array().slice(1);
  const rolesString = roles.length > 0 ? roles.join(', ') : 'None';
  const embed = new Discord.RichEmbed()
                .setThumbnail(user.displayAvatarURL)
                .setColor(hexColor)
                .addField('Username', nameTag, true)
                .addField('Nickname', nickname, true)
                .addField('ID', user.id, true)
                .addField('Presence', presenceFormat[user.presence.status], true)
                .addField('Display Color', hexColor, true)
                .addField('Playing', game, true)
                .addField('Creation Date', creationDate, true)
                .addField('Joined Date', joinedDate, true)
                .addField('Roles', rolesString);
  return embed;
}

module.exports.MENTIONS_PATTERN = MENTIONS_PATTERN;
