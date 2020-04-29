using Discord;
using System;
using System.Threading.Tasks;

namespace ConnorBot
{
    /// <summary>
    /// A basic logger.
    /// </summary>
    public class Logger
    {
        /// <summary>
        /// The method for logging.
        /// </summary>
        /// <param name="message">The <see cref="LogMessage"/> to log.</param>
        /// <returns><see cref="Task.CompletedTask"/></returns>
        public static Task Log(LogMessage message)
        {
            Console.WriteLine(message.ToString());
            return Task.CompletedTask;
        }
    }
}