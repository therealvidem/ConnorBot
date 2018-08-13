const Discord = require('discord.js');
const fs = require('fs');
const client = new Discord.Client();
const config = require('./config.json');
const dataDir = './data';
const commands = {};
const events = {};
const plugins = {};

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

module.exports.getClient = function() {
  return client;
}

module.exports.getCommands = function() {
  return commands;
}

module.exports.getPlugins = function() {
  return plugins;
}

module.exports.shutdownPlugin = shutdownPlugin;

function isCommand(msg) {
  return !msg.author.bot && msg.content.indexOf(config.prefix) === 0;
}

function checkOwner(msg) {
  if (!isOwner(msg.author)) {
    msg.channel.send('You\'re not allowed to use that command.');
    return false;
  }
  return true;
}

function isOwner(author) {
  return author.id == client.ownerId;
}

function promptYesNo(channel, target, waitTime, content) {
  return new Promise((resolve, reject) => {
    channel.send(content).then(() => {
      channel.awaitMessages(response => response.content, {
        max: 1,
        time: waitTime,
        errors: ['time']
      })
      .then((collected) => {
        const responseMsg = collected.first();
        if (!responseMsg) {
          reject();
          return;
        }
        const response = responseMsg.content.toLowerCase() === 'yes';
        resolve(response, responseMsg);
      })
      .catch((collected) => {
        const responseMsg = collected.first();
        if (!responseMsg) {
          reject();
          return;
        }
        const response = responseMsg.content.toLowerCase() === 'yes';
        resolve(response, responseMsg);
      });
    });
  });
}

client.isCommand = isCommand;

client.checkOwner = checkOwner;

client.isOwner = isOwner;

client.promptYesNo = promptYesNo;

/*
Iterates through the events and commands (both of which are objects) of each plugin.
Each event is hooked onto their respective event name, and each command is put into a map,
which is accessed later on in a message event for executing commands.
*/
function setupPlugin(plugin, pluginName) {
  if (plugin.setup) {
    plugin.setup();
  }
  const pluginEvents = plugin.events;
  const pluginCommands = plugin.commands;
  for (const eventName in pluginEvents) {
    events[`${pluginName}:${eventName}`] = {
      'fun': pluginEvents[eventName],
      'eventType': eventName,
      'pluginName': pluginName
    };
    client.on(eventName, events[`${pluginName}:${eventName}`].fun);
  }
  for (const commandName in pluginCommands) {
    commands[commandName] = {
      'run': pluginCommands[commandName],
      'pluginName': pluginName
    };
  }
  plugins[pluginName] = plugin;
}

function shutdownPlugin(pluginName) {
  for (const eventName in events) {
    if (events[eventName].pluginName === pluginName) {
      client.removeListener(events[eventName].eventType, events[eventName].fun);
      delete events[eventName];
    }
  }
  for (const commandName in commands) {
    if (commands[commandName].pluginName === pluginName) {
      delete commands[commandName];
    }
  }
  delete plugins[pluginName];
}

module.exports.shutdownPlugin = shutdownPlugin; // For restarting

// Simply removes the events and commands of the specified plugin, then sets it back up again.
commands.load = function(msg, args) {
  const filename = `${args[0]}.js`;
  const file = `./plugins/${filename}`;
  const cachePlugin = plugins[filename];
  if (!fs.existsSync(file)) {
    if (cachePlugin) {
      msg.channel.send(`Unloading plugin '${filename}' because it was deleted...`);
      shutdownPlugin(filename);
    } else {
      msg.channel.send(`Plugin '${filename}' doesn't exist.`);
    }
    return;
  }
  if (cachePlugin && cachePlugin.unload) {
    cachePlugin.unload('reload');
  }
  shutdownPlugin(filename);
  delete require.cache[require.resolve(file)];
  const plugin = require(file);
  msg.channel.send(`Loading plugin '${filename}'...`);
  setupPlugin(plugin, filename);
  msg.channel.send('Successfully loaded.');
};

commands.unload = function(msg, args) {
  const filename = `${args[0]}.js`;
  const file = `./plugins/${filename}`;
  if (!fs.existsSync(file)) {
    msg.channel.send(`Plugin '${filename}' doesn't exist.`);
    return;
  }
  if (plugins[filename]) {
    plugins[filename].unload('unload');
  }
  msg.channel.send(`Unloading plugin '${filename}'...`);
  shutdownPlugin(filename);
  msg.channel.send('Successfully unloaded.');
};

client.on('ready', () => {
  console.log(`Logged into ${client.guilds.size} guilds.`);
  // Simply iterates through each plugin file and sets it up.
  fs.readdir('./plugins', (err, files) => {
    files
    .filter(file => file.substr(-3) === '.js')
    .forEach(file => {
      let plugin = require(`./plugins/${file}`);
      setupPlugin(plugin, file);
      console.log(`Loaded ${file}.`);
    });
  });
});

/*
command = {
  'run': {
    'subCommand1': function(),
    'subCommand2': {
      'subSubCommand1': function()
    }
  }
}
*/
function getCommand(commandName, context, args) {
  const command = context[commandName];
  if (typeof command === 'function') {
    return command;
  } else if (typeof command === 'object') {
    const subCommand = command[args[0]];
    if (subCommand) {
      return getCommand(args.shift(), command, args);
    } else if (command['_default']) {
      return command['_default'];
    }
  }
}

module.exports.getCommand = getCommand;

/*
Taken directly from the Command Handler example on the anidiots.guide for discord.js.
Takes the args of a command by splitting it between (multiple) spaces, as well as the commandName.
Then, if the command exists in the commands map, it'll execute it.

However, before all of this happens, it checks to make sure the messanger isn't a bot, and that
there's a prefix within the message.
*/
client.on('message', (msg) => {
  if (!isCommand(msg)) return;
  const args = msg.content.slice(config.prefix.length).trim().split(/ +/g);
  const commandName = args.shift();
  const baseCommand = commands[commandName];
  if (baseCommand) {
    const command = getCommand('run', baseCommand, args);
    if (command) {
      command(msg, args);
    }
  }
});

if (config.token) {
  client.ownerId = config.ownerId;
  client.prefix = config.prefix;
  client.login(config.token).catch((error) => {
    console.error('Invalid token');
  });
} else {
  console.error('Add a valid token to the "config.json"');
}

process.on('unhandledRejection', (reason, p) => {
  console.log(p, reason);
});
