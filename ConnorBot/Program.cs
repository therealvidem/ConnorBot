using System;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using ConnorBot.Commands;
using Discord;
using Discord.Commands;
using Discord.WebSocket;
using Microsoft.Extensions.Configuration;

namespace ConnorBot
{
    /// <summary>
    /// The entry-point class for starting the Discord client.
    /// </summary>
    public class Program
    {
        /// <summary>
        /// The Discord client.
        /// </summary>
        private DiscordSocketClient _client;

        /// <summary>
        /// The command handler.
        /// </summary>
        private CommandHandler _commandHandler;

        /// <summary>
        /// The entry-point method for starting the main asynchronous process.
        /// </summary>
        /// <param name="args">Unused argument.</param>
        public static void Main(string[] args) => new Program().MainAsync().GetAwaiter().GetResult();

        /// <summary>
        /// The entry-point method for starting the Discord client.
        /// </summary>
        /// <returns>Void.</returns>
        public async Task MainAsync()
        {
            if (!File.Exists("settings.json"))
            {
                CreateNewSettings();
            }

            IConfiguration config = new ConfigurationBuilder()
                                            .SetBasePath(Directory.GetCurrentDirectory())
                                            .AddJsonFile("settings.json")
                                            .Build();

            if (config["token"] == null)
            {
                CreateNewSettings();
            }

            _client = new DiscordSocketClient();

            _client.Log += Logger.Log;

            await _client.LoginAsync(TokenType.Bot, config["token"]);
            await _client.StartAsync();

            _commandHandler = new CommandHandler(_client, new CommandService(), config);
            await _commandHandler.InstallCommandAsync();

            await Task.Delay(-1);
        }

        /// <summary>
        /// Creates new settings based on <c>GetSettings()</c>.
        /// </summary>
        public void CreateNewSettings()
        {
            Settings settings = GetSettings();
            string settingsJsonString = JsonSerializer.Serialize(settings, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = true
            });
            File.WriteAllText("settings.json", settingsJsonString);
        }

        /// <summary>
        /// Gets the setting from console input, if <c>settings.json</c> is not found.
        /// </summary>
        /// <returns>A <see cref="Settings"/> object representing the inputted settings</returns>
        public Settings GetSettings()
        {
            Console.WriteLine("A settings.json file was not found.");

            Console.Write("Input bot token: ");
            string token = Console.ReadLine().Replace("\n", string.Empty);

            Console.Write("Input owner id (optional): ");
            string ownerID = Console.ReadLine().Replace("\n", string.Empty);

            return new Settings()
            {
                Token = token,
                OwnerID = ownerID
            };
        }
    }
}