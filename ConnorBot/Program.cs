using System;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using Discord;
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
        private DiscordSocketClient client;

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
            string environment = Environment.GetEnvironmentVariable("Environment");

            if (!File.Exists("settings.json") && environment != "development")
            {
                Settings settings = GetSettings();
                using (FileStream settingsFile = File.Create("settings.json"))
                {
                    JsonSerializer.Serialize<Settings>(settings, new JsonSerializerOptions
                    {
                        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                        WriteIndented = true
                    });
                }
            }

            IConfigurationRoot config = new ConfigurationBuilder()
                                            .SetBasePath(Directory.GetCurrentDirectory())
                                            .AddJsonFile("settings.json")
                                            .Build();

            client = new DiscordSocketClient();

            client.Log += Logger.Log;
            client.MessageReceived += MessageReceived;

            await client.LoginAsync(TokenType.Bot, config["token"]);
            await client.StartAsync();

            await Task.Delay(-1);
        }

        public async Task MessageReceived(SocketMessage message)
        {
            if (message.Content == "c.ping")
            {
                await message.Channel.SendMessageAsync("Pong!");
            }
        }

        public Settings GetSettings()
        {
            Console.WriteLine("A settings.json file was not found.");

            Console.Write("Input bot token: ");
            string token = Console.ReadLine().Replace("\n", string.Empty);

            Console.WriteLine();

            Console.Write("Input owner id (optional):");
            string ownerID = Console.ReadLine().Replace("\n", string.Empty);

            return new Settings()
            {
                Token = token,
                OwnerID = ownerID
            };
        }
    }
}