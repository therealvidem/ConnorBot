using System.IO;
using System.Text.Json;
using Microsoft.Extensions.Configuration;

namespace ConnorBot.Config
{
    /// <summary>
    /// Allows for the creation of module configs.
    /// </summary>
    public static class ConfigService
    {
        public static IConfigurationRoot CreateConfiguration(string moduleName)
        {
            IConfigurationRoot newConfig = new ConfigurationBuilder()
                                            .SetBasePath(Directory.GetCurrentDirectory())
                                            .AddJsonFile("settings.json")
                                            .Build();

            return newConfig;
        }
    }
}