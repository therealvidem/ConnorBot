using System;
using System.Threading.Tasks;
using Discord.Commands;

namespace ConnorBot.Commands.Common
{
    /// <summary>
    /// The module for common commands, such as ping.
    /// </summary>
    public class CommonCommands : ModuleBase<SocketCommandContext>
    {
        /// <summary>
        /// Replies with the ping of the message relay.
        /// </summary>
        /// <returns></returns>
        [Command("ping")]
        [Summary("Pings the bot.")]
        public async Task Ping()
        {
            var messagePing = DateTimeOffset.Now - Context.Message.CreatedAt;
            await ReplyAsync($"Pong! ({messagePing.TotalMilliseconds} ms)");
        }
    }
}