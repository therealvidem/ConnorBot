const commands = {};
const Rand = require('seedrandom');

commands.choose = function(msg, args) {
    if (!args || args.length < 2) {
        msg.channel.send("You must provide at least two options");
        return;
    }
    const gen = Rand(msg.author.id);
    const randomItem = args[Math.floor(gen() * args.length)];
    msg.channel.send(`Hmm... I choose ${randomItem}!`);
}

module.exports.commands = commands;