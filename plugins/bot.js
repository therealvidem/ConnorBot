const commands = {};
const config = require('../config.json');
const main = require('../main.js');
const client = main.getClient();

commands.shutdown = function(msg, args) {
  msg.channel.send('Shutting down...');
  client.destroy().then(() => {
    process.exit();
  });
}

commands.restart = function(msg, args) {
  msg.channel.send('Restarting...');
  const plugins = main.getPlugins();
  for (const pluginName in plugins) {
    const plugin = plugins[pluginName];
    if (plugin.unload) {
      plugin.unload();
    }
    delete require.cache[require.resolve(`./${pluginName}`)];
  }
  client.destroy().then(() => {
    client.ownerId = config.ownerId;
    client.prefix = config.prefix;
    client.login(config.token).catch((error) => {
      console.error(error);
    }); // Not sure if we need an error here...
  });
}

module.exports.commands = commands;
