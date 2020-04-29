namespace ConnorBot
{
    /// <summary>
    /// A Json structure representing <c>settings.json</c>.
    /// </summary>
    public class Settings
    {
        /// <summary>
        /// The bot token.
        /// </summary>
        public string Token { get; set; }

        /// <summary>
        /// The bot owner's Discord ID.
        /// </summary>
        public string OwnerID { get; set; }
    }
}