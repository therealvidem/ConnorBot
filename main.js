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

/*
Iterates through the events and commands (both of which are objects) of each plugin.
Each event is hooked onto their respective event name, and each command is put into a map,
which is accessed later on in a message event for executing commands.
*/
function setupPlugin(plugin, pluginName) {
  if (plugin.setup) {
    plugin.setup();
  }
  let pluginEvents = plugin.events;
  let pluginCommands = plugin.commands;
  for (const eventName in pluginEvents) {
    events[`${pluginName}:${eventName}`] = {
      fun: pluginEvents[eventName],
      eventType: eventName,
      pluginName: pluginName
    };
    client.on(eventName, events[`${pluginName}:${eventName}`].fun);
  }
  for (const commandName in pluginCommands) {
    commands[commandName] = {
      run: pluginCommands[commandName],
      pluginName: pluginName
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

// Simply removes the events and commands of the specified plugin, then sets it back up again.
commands.load = {
  run: function(msg, args) {
    let filename = `${args[0]}.js`;
    let file = `./plugins/${filename}`;
    if (!fs.existsSync(file)) {
      if (plugins[filename]) {
        msg.channel.send(`Unloading plugin '${filename}' because it was deleted...`);
        shutdownPlugin(filename);
      } else {
        msg.channel.send(`Plugin '${filename}' doesn't exist.`);
      }
      return;
    }
    if (plugins[filename]) {
      plugins[filename].unload();
    }
    shutdownPlugin(filename);
    delete require.cache[require.resolve(file)];
    let plugin = require(file);
    msg.channel.send(`Loading plugin '${filename}'...`);
    setupPlugin(plugin, filename);
    msg.channel.send('Successfully loaded.');
  }
};

commands.unload = {
  run: function(msg, args) {
    let filename = `${args[0]}.js`;
    let file = `./plugins/${filename}`;
    if (!fs.existsSync(file)) {
      msg.channel.send(`Plugin '${filename}' doesn't exist.`);
      return;
    }
    if (plugins[filename]) {
      plugins[filename].unload();
    }
    msg.channel.send(`Unloading plugin '${filename}'...`);
    shutdownPlugin(filename);
    msg.channel.send('Successfully unloaded.');
  }
}

client.on('ready', () => {
  console.log(`Logged into ${client.guilds.size} guilds.`);
  // Simply iterates through each plugin file and sets it up.
  fs.readdir('./plugins', function(err, files) {
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
Taken directly from the Command Handler example on the anidiots.guide for discord.js.
Takes the args of a command by splitting it between (multiple) spaces, as well as the commandName.
Then, if the command exists in the commands map, it'll execute it.

However, before all of this happens, it checks to make sure the messanger isn't a bot, and that
there's a prefix within the message.
*/
client.on('message', (msg) => {
  if (msg.author.bot || msg.content.indexOf(config.prefix) !== 0) return;
  const args = msg.content.slice(config.prefix.length).trim().split(/ +/g);
  const commandName = args.shift().toLowerCase();
  try {
    let command = commands[commandName];
    if (command) {
      command.run(msg, args);
    }
  } catch (e) {
    console.error(e);
  }
});

if (config.token) {
  client.ownerId = config.ownerId;
  client.prefix = config.prefix;
  client.login(config.token);
} else {
  console.error('Add a valid token to the "config.json"');
}
