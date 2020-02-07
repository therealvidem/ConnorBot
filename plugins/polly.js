/*
    NOTE: This does not use config.json to store credentials, rather it
    uses ~/.aws/credentials.
*/

const main = require('../main.js');
const client = main.getClient();
const AWS = require('aws-sdk');
const Stream = require('stream');
const Polly = new AWS.Polly({
    signatureVersion: 'v4',
    region: 'us-west-1'
});
const voiceId = 'Miguel';
const cooldown = 20 * 1000;
const apostrophePattern = /\w(')\w/;
const ampersandPattern = /(&)(?![^\s]+;)/;
const usersCooldown = new Set();
const commands = {};
let waitStart = null;

function playStream(msg, stream) {
    msg.member.voiceChannel.join().then(connection => {
        client.voiceConnections[msg.guild.id] = {
            'dispatcher': connection.playStream(stream, {
                'volume': 100
            })
        }
        client.voiceConnections[msg.guild.id].dispatcher.on('end', (reason) => {
            if (reason !== 'user') {
                delete client.voiceConnections[msg.guild.id];
                msg.member.voiceChannel.leave();
            }
        });
    }).catch(err => {
        msg.channel.send('Error joining vc');
        console.log(err);
    });
}

function say(msg, text, type) {
    
    const params = {
        'Text': text,
        'TextType': type,
        'OutputFormat': 'ogg_vorbis',
        'VoiceId': voiceId
    };
    
    if (waitStart === null || Date.now() - waitStart >= 0) {
        waitStart = null;
        Polly.synthesizeSpeech(params, (err, data) => {
            if (err) {
                if (err.code === 'InvalidSsmlException') {
                    msg.channel.send('That is invalid SSML code');
                    msg.channel.send(err.message);
                } else {
                    msg.channel.send('An error occured');
                    if (err.retryDelay) {
                        if (waitStart) {
                            waitStart += err.retryDelay;
                        } else {
                            waitStart = Date.now() + err.retryDelay;
                        }
                    }
                    console.log(err.code);
                }
            } else if (data) {
                if (data.AudioStream instanceof Buffer) {
    
                    // https://stackoverflow.com/questions/47089230/how-to-convert-buffer-to-stream-in-nodejs
                    let stream = new Stream.Readable({
                        read() {
                            this.push(data.AudioStream);
                            this.push(null);
                        }
                    });
                    
                    const voiceConnection = client.voiceConnections[msg.guild.id];
                    if (voiceConnection && voiceConnection.dispatcher && !voiceConnection.dispatcher.destroyed) {
                        voiceConnection.dispatcher.end();
                        setTimeout(() => {
                            playStream(msg, stream);
                        }, 1 * 1000);
                    } else {
                        playStream(msg, stream);
                    }
    
                    usersCooldown.add(msg.author.id);
                    setTimeout(() => {
                        usersCooldown.delete(msg.author.id);
                    }, cooldown);
    
                }
            }
        });
    } else {
        msg.channel.send('You must wait before you may use this command again');
    }

}

commands.polly = {
    'say': async function (msg, args) {
        if (!msg.guild) return;
        if (msg.member.voiceChannel) {
            if (usersCooldown.has(msg.author.id)) {
                msg.channel.send('You must wait before you may use this command again');
                return;
            }
            say(msg, args.join(' '), 'text');
        } else {
            msg.channel.send('You must be in a VC to use that command');
        }
    },
    'ssml': async function(msg, args) {
        if (!msg.guild) return;
        if (msg.member.voiceChannel) {
            if (usersCooldown.has(msg.author.id)) {
                msg.channel.send('You must wait before you may use this command again');
                return;
            }

            const text = args.join(' ')
                       .replace(apostrophePattern, '&quot;')
                       .replace(ampersandPattern, '&amp;');

            say(msg, text, 'ssml');
        } else {
            msg.channel.send('You must be in a VC to use that command');
        }
    },
    'ipa': async function(msg, args) {
        if (!msg.guild) return;
        if (msg.member.voiceChannel) {
            if (usersCooldown.has(msg.author.id)) {
                msg.channel.send('You must wait before you may use this command again');
                return;
            }

            // https://cuttlesoft.com/blog/pronouncing-things-with-amazons-polly/
            const text = `<speak><phoneme alphabet='ipa' ph='${args.join(' ').replace('/', '').replace("'", '')}'></phoneme></speak>`;

            console.log(text);

            say(msg, text, 'ssml');
        } else {
            msg.channel.send('You must be in a VC to use that command');
        }
    },
    'x-sampa': async function(msg, args) {
        if (!msg.guild) return;
        if (msg.member.voiceChannel) {
            if (usersCooldown.has(msg.author.id)) {
                msg.channel.send('You must wait before you may use this command again');
                return;
            }

            // https://cuttlesoft.com/blog/pronouncing-things-with-amazons-polly/
            const text = `<speak><phoneme alphabet='x-sampa' ph='${args.join(' ').replace('/', '').replace("'", '')}'></phoneme></speak>`;

            console.log(text);

            say(msg, text, 'ssml');
        } else {
            msg.channel.send('You must be in a VC to use that command');
        }
    },
    'stop': async function (msg, args) {
        if (msg.member.voiceChannel && voiceConnection && voiceConnection.dispatcher) {
            if (!voiceConnection.dispatcher.destroyed) {
                voiceConnection.dispatcher.end();
            }
            delete client.voiceConnections[msg.guild.id];
            msg.member.voiceChannel.leave();
        }
    }
}

module.exports.commands = commands;