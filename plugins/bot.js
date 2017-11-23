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

module.exports.commands = commands;
