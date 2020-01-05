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
const cooldown = 20 * 1000;
const usersCooldown = new Set();
const commands = {};

function play(msg, stream) {
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

commands.polly = {
    'say': async function (msg, args) {
        if (!msg.guild) return;
        const voiceConnection = client.voiceConnections[msg.guild.id];
        if (msg.member.voiceChannel) {
            if (usersCooldown.has(msg.author.id)) {
                msg.channel.send('You must wait before you may use this command again');
                return;
            }

            const params = {
                'Text': args.join(' '),
                'OutputFormat': 'ogg_vorbis',
                'VoiceId': 'Miguel'
            };

            Polly.synthesizeSpeech(params, (err, data) => {
                if (err) {
                    msg.channel.send('An error occured');
                    console.log(err.code);
                } else if (data) {
                    if (data.AudioStream instanceof Buffer) {
                        // https://stackoverflow.com/questions/47089230/how-to-convert-buffer-to-stream-in-nodejs
                        let stream = new Stream.Readable({
                            read() {
                                this.push(data.AudioStream);
                                this.push(null);
                            }
                        });

                        if (voiceConnection && voiceConnection.dispatcher && !voiceConnection.dispatcher.destroyed) {
                            voiceConnection.dispatcher.end();
                            setTimeout(() => {
                                play(msg, stream);
                            }, 1 * 1000);
                        } else {
                            play(msg, stream);
                        }

                        usersCooldown.add(msg.author.id);
                        setTimeout(() => {
                            usersCooldown.delete(msg.author.id);
                        }, cooldown);

                    }
                }
            });
        } else {
            msg.channel.send('You must be in a vc to use that command');
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