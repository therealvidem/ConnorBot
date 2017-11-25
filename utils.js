const Discord = require('discord.js');
const dateFormat = require('dateformat');
const presenceFormat = {
  'online': 'Online',
  'offline': 'Offline',
  'idle': 'Idle',
  'dnd': 'Do Not Disturb'
};

function removeNonASCII(arg) {
  return arg.replace(/[^\x00-\x7F]/g, '').trim();
}

module.exports.convertToMember = function(channel, arg) {
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
    return (username.indexOf(query) !== -1 || displayName.indexOf(query) !== -1 || m.user.id === query);
  });
  return member;
}

module.exports.getEmbedFromObject = function(obj, inline, title) {
  const embed = new Discord.RichEmbed();
  if (title) {
    embed.setTitle(title);
  }
  for (const key in obj) {
    embed.addField(key, obj[key], inline);
  }
  return embed;
}

module.exports.getUserProfile = function(member) {
  const user = member.user;
  const nameTag = `${user.username}#${user.discriminator}`;
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
