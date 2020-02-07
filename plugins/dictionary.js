const commands = {};
const https = require('https');
const querystring = require('querystring');
const Discord = require('discord.js');
const Keyv = require('keyv');
const client = require('../main.js').getClient();
const validLanguages = {
    'en-us': 'English',
    'es': 'Spanish'
};

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
    let exceedsLimit = false;
    for (let i = 0; i < entries.length; i++) {
        if (exceedsLimit) break;
        let entry = entries[i];
        for (let j = 0; j < entry.senses.length; j++) {
            if (exceedsLimit) break;
            let sense = entry.senses[j];
            let synonyms = '';
            for (let k = 0; k < sense.synonyms.length; k++) {
                let synonymText = sense.synonyms[k].text;
                if ((text + synonymText + ', ').length >= 2020) {
                    exceedsLimit = true;
                    break;
                } else {
                    synonyms += (sense.synonyms[k].text + ', ');
                }
            }
            text += `${synonyms}\n`;
            let subsesnses = sense.subsesnses;
            if (subsesnses) {
                for (let l = 0; l < subsesnses.length; l++) {
                    if (exceedsLimit) break;
                    let subsense = subsesnses[k];
                    let subSynonyms = '';
                    for (let m = 0; m < subsense.synonyms.length; m++) {
                        if (exceedsLimit) break;
                        let subSynonymText = subsense.synonyms[m].text;
                        if ((text + subSynonymText + ', ').length >= 2020) {
                            exceedsLimit = true;
                            break;
                        } else {
                            synonyms += (subsense.synonyms[m].text + ', ');
                        }
                    }
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
        let senses = entry.senses;
        if (senses) {
            for (let j = 0; j < senses.length; j++) {
                let sense = senses[j];
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
        }
        text += '\n';
    }
    return text;
}

async function getSuggestion(query) {
    const options = {
        hostname: 'api.datamuse.com',
        port: 443,
        path: `/sug?${query}`,
        method: 'GET',
        headers: {
            'Accept': 'application/json'
        }
    };
    return new Promise((resolve, reject) => {
        https.get(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            }).on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        jsonData = JSON.parse(data);
                        resolve(jsonData);
                    } catch (exc) {
                        reject(exc);
                    }
                } else if (res.statusCode === 404) {
                    reject(404);
                }
            }).on('error', (err) => {
                reject(err);
            });
        });
    });
}

async function getOxford(path) {
    const appId = await client.dictionary.get('id');
    const appKey = await client.dictionary.get('key');
    const options = {
        hostname: 'od-api.oxforddictionaries.com',
        port: 443,
        path: `/api/v2/${path}`,
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'app_id': appId || '',
            'app_key': appKey || ''
        }
    };
    return new Promise((resolve, reject) => {
        https.get(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            }).on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        jsonData = JSON.parse(data);
                        resolve(jsonData);
                    } catch (exc) {
                        reject(exc);
                    }
                } else if (res.statusCode === 404) {
                    reject(404);
                }
            }).on('error', (err) => {
                reject(err);
            });
        });
    });
}

async function getRootOf(query, language) {
    return new Promise((resolve, reject) => {
        getSuggestion(querystring.stringify({
            's': query,
            'max': 1,
            'v': language == 'en-us' ? '' : language
        })).then(
            (data) => {
                const firstResult = data[0];
                if (firstResult) {
                    resolve(firstResult.word);
                } else {
                    reject(404);
                }
            },
            (err) => {
                reject(err);
            }
        );
    });
}

commands.dictionary = {
    'setidandkey': async function (msg, args) {
        const id = args[0];
        const key = args[1];
        if (!key || !id || !client.checkOwner(msg)) return;
        if (msg.channel.type != 'dm') {
            msg.channel.send('You can only use that command in DMs');
            return;
        }
        await client.dictionary.set('id', id);
        await client.dictionary.set('key', key);
        msg.channel.send(`Successfully set id to ${id} and key to ${key}`);
    },
    'languages': function (msg, args) {
        let embed = new Discord.RichEmbed()
            .setColor(msg.member.displayHexColor)
            .setTitle('Languages available for the dictionary plugin');
        for (let language in validLanguages) {
            embed.addField(`${language}`, `${validLanguages[language]}`);
        }
        msg.channel.send(embed);
    },
    'ipa': function (msg, args) {
        msg.channel.send('https://images.sampletemplates.com/wp-content/uploads/2016/03/05123102/Phonetic-Alphabets-Reference-Chart.jpg');
    },
    'define': function (msg, args) {
        let word = args.join('_');
        let plain_word = args.join(' ');
        if (!word) {
            msg.channel.send(`Correct usage: ${client.prefix}dictionary define <word> [$language]`);
            return;
        }
        if (word === 'life') {
            msg.channel.send('Something you don\'t have');
            return;
        } else if (word === 'death') {
            msg.channel.send('Something I want');
            return;
        }
        let language = 'en-us';
        if (args && args.length > 1) {
            full_arg = args[args.length - 1];
            if (full_arg.charAt(0) === '$' && validLanguages.hasOwnProperty(language)) {
                language = args[args.length - 1].slice(1);
                word = args.slice(0, -1).join('_');
                plain_word = args.slice(0, -1).join(' ');
            }
        }
        getRootOf(word, language).then((wordId) => {
            getOxford(`entries/${language}/${querystring.escape(wordId)}`).then(
                (data) => {
                    const lexicalEntries = data.results[0].lexicalEntries;
                    if (lexicalEntries) {
                        for (let i = 0; i < lexicalEntries.length; i++) {
                            setTimeout(() => {
                                const lexicalEntry = lexicalEntries[i];
                                const text = parseDefEntries(lexicalEntry.entries);
                                let pronunciationString = '';
                                if (lexicalEntry.pronunciations) {
                                    const pronunciations = lexicalEntry.pronunciations.map(p => p.phoneticSpelling).join('/ /');
                                    pronunciationString = ("/" + pronunciations + "/");
                                }
                                if (text) {
                                    let embed = new Discord.RichEmbed()
                                        .setColor(0x00bdf2)
                                        .setTitle(`${wordId} (${lexicalEntry.lexicalCategory.text.toLowerCase()}) ${pronunciationString}`)
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
            )
        }).catch((err) => {
            errorNotify(msg, err);
        });
    },
    'synonyms': function (msg, args) {
        let word = args.join('_');
        let plain_word = args.join(' ');
        if (!word) {
            msg.channel.send(`Correct usage: ${client.prefix}dictionary synonyms <word> [$language]`);
            return;
        }
        let language = 'en-us';
        if (args && args.length > 1) {
            full_arg = args[args.length - 1];
            if (full_arg.charAt(0) === '$' && validLanguages.hasOwnProperty(language)) {
                language = args[args.length - 1].slice(1);
                word = args.slice(0, -1).join('_');
                plain_word = args.slice(0, -1).join(' ');
            }
        }
        getOxford(`thesaurus/${language}/${word}`).then(
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
                                    .setTitle(`Synonyms for: ${plain_word} (${lexicalEntry.lexicalCategory.toLowerCase()})`)
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
module.exports.setup = function () {
    client.dictionary = new Keyv('sqlite://data.db', {
        namespace: 'dictionary'
    });
    client.dictionary.on('error', err => console.log('Dictionary Plugin Connection Error', err));
}