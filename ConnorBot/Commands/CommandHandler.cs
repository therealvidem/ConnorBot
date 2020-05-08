using System.Reflection;
using System.Threading.Tasks;
using Discord.Commands;
using Discord.WebSocket;
using Microsoft.Extensions.Configuration;

namespace ConnorBot.Commands
{
    /// <summary>
    /// The class handling commands sent to the bot.
    /// </summary>
    public class CommandHandler
    {
        /// <summary>
        /// The Discord client.
        /// </summary>
        private readonly DiscordSocketClient _client;

        /// <summary>
        /// The service handling all of the modules and commands.
        /// </summary>
        private readonly CommandService _commands;

        /// <summary>
        /// The config containing information about the bot, such as prefix.
        /// </summary>
        private readonly IConfiguration _config;

        /// <summary>
        /// The prefix of the bot.
        /// </summary>
        private readonly string _prefix;

        /// <summary>
        /// The default prefix on which to fall back if <c>_config</c> does not provide one.
        /// </summary>
        public const string DefaultPrefix = "c.";

        /// <summary>
        /// Creates a new CommandHandler.
        /// </summary>
        /// <param name="client">The Discord client.</param>
        /// <param name="commands">The service handling all of the modules and commands.</param>
        /// <param name="config">The config containing information about the bot, such as prefix.</param>
        public CommandHandler(DiscordSocketClient client, CommandService commands, IConfiguration config)
        {
            _commands = commands;
            _client = client;
            _config = config;
            _prefix = _config.GetValue<string>("prefix", DefaultPrefix);
        }

        /// <summary>
        /// Installs all of the commands through reflection.
        /// </summary>
        /// <returns>Void.</returns>
        public async Task InstallCommandAsync()
        {
            // Allows for HandleCommandAsync to receive all incoming Discord
            // messages to handle them accordingly.
            _client.MessageReceived += HandleCommandAsync;

            // Adds all of the modules through C# reflection. In essence, finds all classes
            // which implement ModuleBase<SocketCommandContext> and adds all of them here.
            await _commands.AddModulesAsync(assembly: Assembly.GetEntryAssembly(),
                                                 services: null);
        }

        /// <summary>
        /// Processes a message to determine if it is a command, then handles it accordingly.
        /// </summary>
        /// <param name="messageParam">The m</param>
        /// <returns>Void.</returns>
        private async Task HandleCommandAsync(SocketMessage messageParam)
        {
            // Do not process the message if it is not a user message.
            var message = messageParam as SocketUserMessage;
            if (message == null) return;

            // A number to track where the prefix ends and where the command begins
            int argPos = 0;
            if (!(message.HasStringPrefix(_prefix, ref argPos)) ||
                message.Author.IsBot)
            {
                return;
            }

            // Construct a new context based off the received message.
            var context = new SocketCommandContext(_client, message);

            var result = await _commands.ExecuteAsync(
                context: context,
                argPos: argPos,
                services: null);
        }
    }
}