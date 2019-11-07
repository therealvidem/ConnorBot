const events = {};
const commands = {};
const client = require('../main.js').getClient();
const utils = require('../utils.js');
const Discord = require('discord.js');

// events.message = function(msg) {
//   if (msg.author.id == client.ownerId) {
//     console.log(`${msg.author.username}#${msg.author.discriminator}: ${msg.cleanContent}`);
//   }
// }

commands.ping = function(msg, args) {
  msg.channel.send('Pong.');
}

commands.echo = function(msg, args) {
  if (args.length < 1) return;
  msg.channel.send(args.join(' '));
}

commands.gettime = function(msg, args) {
  if (args.length < 1) {
    const currentDate = new Date().toLocaleString();
    msg.channel.send(currentDate);
  } else {
    const snowflake = parseInt(args[0]);
    if (isNaN(snowflake)) {
      msg.channel.send('That is not a valid snowflake');
      return;
    }
    msg.channel.send(Discord.SnowflakeUtil.deconstruct(snowflake).date.toLocaleString());
  }
}

function sendProperty(msg, obj, prop, name) {
  msg.channel.send(obj[prop] ? obj[prop].toString() : `Could not get ${prop} from ${name}`);
}

function getMember(msg, args) {
  const query = args.join(' ');
  let member = msg.member;
  if (args.length > 0) {
    member = msg.mentions.members.first() || utils.convertToMember(msg.channel, query);
  }
  if (!member) {
    msg.channel.send(`Could not find member "${query}"`);
    return;
  }
  return member;
}

function getRoleAndMember(msg, args) {
  let query;
  let member = msg.mentions.members.first() || utils.convertToMember(msg.channel, args[0]);
  // Default to message author if member not found
  if (!member) {
    member = msg.member;
    query = args.join(' ');
  } else {
    query = args.slice(1).join(' ');
  }
  const role = utils.convertToRole(msg.guild, query);
  if (!role) {
    msg.channel.send(`Could not find role "${query}"`);
    return;
  }
  return {
    'role': role,
    'member': member
  }
}

function getRolesAndMember(msg, args) {
  let query1;
  let query2;
  let member = msg.mentions.members.first() || utils.convertToMember(msg.channel, args[0]);
  // Default to message author if member not found
  if (!member) {
    member = msg.member;
    query1 = args[0];
    query2 = args[1];
  } else {
    query1 = args[1];
    query2 = args[2];
  }
  const role1 = utils.convertToRole(msg.guild, query1);
  if (!role1) {
    msg.channel.send(`Could not find role "${query1}"`);
    return;
  }
  const role2 = utils.convertToRole(msg.guild, query2);
  if (!role2) {
    msg.channel.send(`Could not find role "${query2}"`);
    return;
  }
  return {
    'roles': [role1, role2],
    'member': member
  }
}

function checkRolePermissions(msg, member, role) {
  if (!msg.guild.me.hasPermission('MANAGE_ROLES') || msg.guild.me.highestRole.comparePositionTo(role) < 0) {
    msg.channel.send('I do not have permission to add that role');
    return false;
  }
  if (!msg.member.hasPermission('MANAGE_ROLES') || msg.member.highestRole.comparePositionTo(role) < 0) {
    msg.channel.send('You do not have permission to add that role');
    return false;
  }
  return true;
}

commands.server = {
  'image': function(msg, args) {
    sendProperty(msg, msg.guild, 'iconURL', 'this guild');
  },
  'owner': function(msg, args) {
    const embed = utils.getUserProfile(msg.guild.owner);
    msg.channel.send(embed);
  },
  'member': function(msg, args) {
    let member = getMember(msg, args);
    if (!member) return;
    const embed = utils.getUserProfile(member);
    msg.channel.send(embed);
  }
}

commands.member = {
  'avatar': function(msg, args) {
    const member = getMember(msg, args);
    if (!member) return;
    const user = member.user;
    sendProperty(msg, user, 'avatarURL', user.tag);
  },
  'id': function(msg, args) {
    const member = getMember(msg, args);
    if (!member) return;
    const user = member.user;
    sendProperty(msg, user, 'id', user.tag);
  },
  'username': function(msg, args) {
    const member = getMember(msg, args);
    if (!member) return;
    msg.channel.send(user.tag);
  },
  'nickname': function(msg, args) {
    const member = getMember(msg, args);
    if (!member) return;
    const name = member.nickname || member.user.tag;
    msg.channel.send(name);
  },
  'role': {
    'add': function(msg, args) {
      const roleAndMember = getRoleAndMember(msg, args);
      if (!roleAndMember) return;
      const role = roleAndMember.role;
      const member = roleAndMember.member;
      if (member.roles.has(role.id)) {
        msg.channel.send(`${member} already has that role`);
        return;
      }
      if (!checkRolePermissions(msg, member, role)) return;
      member.addRole(role).then(() => {
        msg.channel.send('Successfully added role');
      }).catch(() => {
        msg.channel.send('An error occured');
      });
    },
    'remove': function(msg, args) {
      const roleAndMember = getRoleAndMember(msg, args);
      if (!roleAndMember) return;
      const role = roleAndMember.role;
      const member = roleAndMember.member;
      if (!member.roles.has(role.id)) {
        msg.channel.send(`${member} does not have that role`);
        return;
      }
      if (!checkRolePermissions(msg, member, role)) return;
      member.removeRole(role).then(() => {
        msg.channel.send('Successfully removed role');
      }).catch(() => {
        msg.channel.send('An error occured');
      });
    },
    'replace': function(msg, args) {
      if (args.length < 3) {
        msg.channel.send(`Correct usage: ${client.prefix}member role replace <member> <roletoreplace> <newrole>`);
        return;
      }
      const rolesAndMember = getRolesAndMember(msg, args);
      if (!rolesAndMember) return;
      const role1 = rolesAndMember.roles[0];
      const role2 = rolesAndMember.roles[1];
      const member = rolesAndMember.member;
      if (!member.roles.has(role1.id)) {
        msg.channel.send(`${member} does not have that role`);
        return;
      }
      if (!checkRolePermissions(msg, member, role1) || !checkRolePermissions(msg, member, role2)) return;
      member.removeRole(role1).then(() => {
        member.addRole(role2).then(() => {
          msg.channel.send('Successfully replaced role');
        }).catch(() => {
          msg.channel.send('An error occured');
        });
      }).catch(() => {
        msg.channel.send('An error occured');
      });
    }
  }
}

module.exports.events = events;
module.exports.commands = commands;
