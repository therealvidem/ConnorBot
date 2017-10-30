const Discord = require('discord.js');
const fs = require('fs');
const client = new Discord.Client();
const config = require('./config.json');
const dataDir = './data';
const commands = {};

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

/*
Iterates through the events and commands (both of which are objects) of each plugin.
Each event is hooked onto their respective event name, and each command is put into a map,
which is accessed later on in a message event for executing commands.
*/
function setupPlugin(plugin) {
  plugin.setup(client);
  let events = plugin.events;
  let pluginCommands = plugin.commands;
  for (const eventName in events) {
    client.on(eventName, events[eventName]);
  }
  for (const commandName in pluginCommands) {
    commands[commandName] = pluginCommands[commandName];
  }
}

// Simply iterates through each plugin file and sets it up.
fs.readdir('./plugins', function(err, files) {
  files.forEach(file => {
    let plugin = require(`./plugins/${file}`);
    setupPlugin(plugin);
  });
});

client.on('ready', () => {
  console.log(`Logged into ${client.guilds.size} guilds.`);
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
      command(client, msg, args);
    }
  } catch (e) {
    console.error(e);
  }
});

if (config.token) {
  client.login(config.token);
} else {
  console.error('Add a valid token to the "config.json"');
}
