const commands = {};
const https = require('https');
const Discord = require('discord.js');
const querystring = require('querystring');
const Enmap = require('enmap');
const EnmapLevel = require('enmap-level');
const provider = new EnmapLevel({name: 'dictionary'});
const client = require('../main.js').getClient();
const utils = require('../utils.js');

function errorNotify(msg, err) {
  if (err === 404) {
    msg.channel.send('Could not find that word');
  } else {
    msg.channel.send('An error occured');
    console.log(err);
  }
}

function parseSynonymEntries(entries) {
  let text = '';
  for (let i = 0; i < entries.length; i++) {
    let entry = entries[i];
    for (let j = 0; j < entry.senses.length; j++) {
      let sense = entry.senses[j];
      let synonyms = sense.synonyms.map(s => s.text).join(', ');
      let subsesnses = sense.subsesnses;
      text += `${synonyms}\n`;
      if (subsesnses) {
        for (let k = 0; k < subsesnses.length; k++) {
          let subsense = subsesnses[k];
          let subSynonyms = subsense.synonyms.map(s => s.text).join(', ');
          let registers = subsense.registers ? subsense.registers.join(' ') : '';
          let regions = subsense.regions ? subsense.regions.join(' ') : '';
          text += registers || regions ? `${regions} ${registers}: ` : '';
          text += `${prefix}${subSynonyms}\n`;
        }
      }
    }
  }
  return text;
}

function parseDefEntries(entries) {
  let text = '';
  for (let i = 0; i < entries.length; i++) {
    let entry = entries[i];
    for (let j = 0; j < entry.senses.length; j++) {
      let sense = entry.senses[j];
      let definitions = sense.definitions || sense.crossReferenceMarkers;
      if (definitions) {
        text += `${j + 1}) ${definitions[0]}\n`;
        let subsenses = sense.subsenses;
        if (subsenses) {
          for (let k = 0; k < subsenses.length; k++) {
            let subsense = subsenses[k];
            let definitions = subsense.definitions || subsense.crossReferenceMarkers;
            text += `  ${j + 1}.${k + 1}) ${definitions[0]}\n`;
          }
        }
      }
    }
    text += '\n';
  }
  return text;
}

function get(msg, path) {
  const options = {
    hostname: 'od-api.oxforddictionaries.com',
    port: 443,
    path: `/api/v1/${path}`,
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'app_id': client.dictionary.get('id') || '',
      'app_key': client.dictionary.get('key') || ''
    }
  };
  return new Promise(function(resolve, err) {
    https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      })
      .on('end', () => {
        if (res.statusCode === 200) {
          try {
            jsonData = JSON.parse(data);
            resolve(jsonData);
          } catch (exc) {
            err(exc);
          }
        } else if (res.statusCode === 404) {
          err(404)
        }
      })
      .on('error', (er) => {
        err(er);
      });
    });
  });
}

commands.dictionary = {
  'setidandkey': function(msg, args) {
    const id = args[0];
    const key = args[1];
    if (!key || !id || !client.checkOwner(msg)) return;
    if (msg.channel.type != 'dm') {
      msg.channel.send('You can only use that command in DMs');
      return;
    }
    client.dictionary.set('id', id);
    client.dictionary.set('key', key);
    msg.channel.send(`Successfully set id to ${id} and key to ${key}`);
  },
  'define': function(msg, args) {
    const word = args.join(' ');
    if (!word) {
      msg.channel.send(`Correct usage: ${client.prefix}dictionary define <word>`);
      return;
    }
    get(msg, `entries/en/${word}`).then(
      (data) => {
        const lexicalEntries = data.results[0].lexicalEntries;
        if (lexicalEntries) {
          for (let i = 0; i < lexicalEntries.length; i++) {
            setTimeout(() => {
              const lexicalEntry = lexicalEntries[i]
              const text = parseDefEntries(lexicalEntry.entries);
              if (text) {
                let embed = new Discord.RichEmbed()
                .setColor(0x00bdf2)
                .setTitle(`${word} (${lexicalEntry.lexicalCategory.toLowerCase()})`)
                .setDescription('```json\n' + text + '```')
                .setFooter('Using the Oxford English Dictionary');
                msg.channel.send(embed);
              }
            }, i * 500);
          }
        } else {
          msg.channel.send('No entries found');
        }
      },
      (err) => {
        errorNotify(msg, err);
      }
    );
  },
  'synonyms': function(msg, args) {
    const word = args.join(' ');
    if (!word) {
      msg.channel.send(`Correct usage: ${client.prefix}dictionary synonyms <word>`);
      return;
    }
    get(msg, `entries/en/${word}/synonyms`).then(
      (data) => {
        const lexicalEntries = data.results[0].lexicalEntries;
        if (lexicalEntries) {
          for (let i = 0; i < lexicalEntries.length; i++) {
            setTimeout(() => {
              const lexicalEntry = lexicalEntries[i];
              const text = parseSynonymEntries(lexicalEntry.entries);
              if (text) {
                let embed = new Discord.RichEmbed()
                .setColor(0x00bdf2)
                .setTitle(`Synonyms for: ${word} (${lexicalEntry.lexicalCategory.toLowerCase()})`)
                .setDescription('```json\n' + text + '```')
                .setFooter('Using the Oxford English Dictionary');
                msg.channel.send(embed);
              }
            }, i * 500);
          }
        } else {
          msg.channel.send('No entries found');
        }
      },
      (err) => {
        errorNotify(msg, err);
      }
    );
  }
}

module.exports.commands = commands;
module.exports.setup = function() {
  client.dictionary = new Enmap({provider: provider});
  client.dictionary.defer.then(() => {
    console.log('Loaded dictionary data.');
  });
}
module.exports.unload = function(reason) {
  return new Promise((resolve, reject) => {
    provider.close();
    resolve();
  });
}
