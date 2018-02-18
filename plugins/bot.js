const commands = {};
const config = require('../config.json');
const main = require('../main.js');
const client = main.getClient();

function shutdownProcess(msg, args, reason) {
  return new Promise((resolve, reject) => {
    const plugins = main.getPlugins();
    for (const pluginName in plugins) {
      const plugin = plugins[pluginName];
      if (plugin.unload) {
        plugin.unload('shutdown');
      }
      main.shutdownPlugin(pluginName);
      delete require.cache[require.resolve(`./${pluginName}`)];
    }
    client.destroy();
    resolve();
  });
}

module.exports.shutdownProcess = shutdownProcess;

commands.shutdown = function(msg, args) {
  msg.channel.send('Shutting down...')
  .then(shutdownProcess(msg, args, 'shutdown'))
  .then(() => {
    process.exit();
  });
}

commands.restart = function(msg, args) {
  msg.channel.send('Restarting...')
  .then(shutdownProcess(msg, args, 'restart'))
  .then(() => {
    client.ownerId = config.ownerId;
    client.prefix = config.prefix;
    client.login(config.token).catch((error) => {
      console.error(error);
    }); // Not sure if this catch is necessary...
  });
}

commands.bot = {
  'set': {
    'avatar': function(msg, args) {
      if (!client.checkOwner(msg)) return;
      const attachment = msg.attachments.first();
      const url = attachment ? attachment.url : args[0];
      if (!url) {
        msg.channel.send(`Correct usage: ${client.prefix}bot set avatar <url> (or add an attachment after ${client.prefix}bot set avatar)`);
        return;
      }
      client.user.setAvatar(url)
      .then(user => {
        msg.channel.send('Successfully set avatar');
      })
      .catch(err => {
        msg.channel.send('Input a valid URL');
      });
    },
    'name': function(msg, args) {
      if (!client.checkOwner(msg)) return;
      const newName = args[0];
      if (!newName) {
        msg.channel.send(`Correct usage: ${client.prefix}bot set name <newName>`);
        return;
      }
      client.user.setUsername(newName)
      .then(user => {
        msg.channel.send('Successfully set name');
      })
      .catch(err => {
        msg.channel.send('An error occured while trying to set name');
      });
    }
  }
}

module.exports.commands = commands;
