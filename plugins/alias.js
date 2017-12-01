const Enmap = require('enmap');
const EnmapLevel = require('enmap-level');
const provider = new EnmapLevel({name: 'aliases'});
const main = require('../main.js');
const utils = require('../utils.js');
const client = main.getClient();
const globalCommands = main.getCommands();
const commands = {};
const events = {};
let aliases = {};

events.message = function(msg) {
  if (msg.author.bot || msg.content.indexOf(client.prefix) !== 0) return;
  const args = msg.content.slice(client.prefix.length).trim().split(/ +/g);
  const aliasName = args.shift();
  const alias = aliases[aliasName];
  if (alias) {
    const commandName = alias.commandName;
    const aliasArgs = alias.args;
    const baseCommand = globalCommands[commandName];
    if (baseCommand) {
      const passInArgs = aliasArgs.concat(args);
      const command = main.getCommand('run', baseCommand, passInArgs);
      if (command) {
        command(msg, passInArgs);
      }
    }
  }
}

commands.alias = {
  'set': function(msg, args) {
    const alias = args[0];
    const commandName = args[1];
    if (!alias && !commandName) {
      msg.channel.send(`You must do: ${client.prefix}alias add <alias> <commandToExecute>`);
      return;
    }
    if (globalCommands[alias]) {
      msg.channel.send('Cannot create an alias for that specific command because a command already has that alias');
      return;
    }
    const baseCommand = globalCommands[commandName];
    if (!baseCommand) {
      msg.channel.send('That\'s not a valid command');
      return;
    }
    const command = main.getCommand('run', baseCommand, args.slice(2));
    if (!command) {
      msg.channel.send('An error occured while trying to add that alias');
      return;
    }
    aliases[alias] = {
      'commandName': commandName,
      'args': args.slice(2)
    };
    client.aliases.set('aliases', aliases);
    msg.channel.send('Successfully created an alias for that specific command');
  },
  'remove': function(msg, args) {
    const alias = args[0];
    if (!alias) {
      msg.channel.send(`You must do: ${client.prefix}alias remove <alias>`);
      return;
    }
    if (!aliases[alias]) {
      msg.channel.send('That alias doesn\'t exist');
      return;
    }
    delete aliases[alias];
    client.aliases.set('aliases', aliases);
    msg.channel.send('Successfully removed that alias');
  },
  'list': function(msg, args) {
    const aliasesTable = {};
    for (const alias in aliases) {
      const commandName = aliases[alias].commandName;
      const args = aliases[alias].args;
      aliasesTable[alias] = `${client.prefix}${commandName} ${args.join(' ')}`;
    }
    msg.channel.send(utils.getEmbedFromObject(aliasesTable));
  }
};

module.exports.events = events;
module.exports.commands = commands;
module.exports.setup = function() {
  client.aliases = new Enmap({provider: provider});
  client.aliases.defer.then(() => {
    aliases = client.aliases.get('aliases') || {};
    console.log('Loaded aliases data.');
  });
}
module.exports.unload = function(reason) {
  return new Promise((resolve, reject) => {
    provider.close();
    resolve();
  });
}
