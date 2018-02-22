//if have Error: OPUS_ENGINE_MISSING => npm install opusscript
const Discord = require("discord.js");
const client = new Discord.Client();
const ytdl = require('ytdl-core');
const request = require('request');
const fs = require('fs');
const getYoutubeID = require('get-youtube-id');
const fetchVideoInfo = require('youtube-info');

var config = JSON.parse(fs.readFileSync('./setting.json', 'utf-8'));

const yt_api_key = config.youtube_api_key;
const bot_controller = config.bot_controller;
const prefix = config.prefix;
const discord_token = config.discord_token;

var guilds = {};

client.login(discord_token);
client.on('message', function (message) {
    const member = message.member;
    const mess = message.content.toLocaleLowerCase();
    const args = message.content.split(' ').slice(1).join(" ");
    if (!guilds[message.guild.id]) {
        guilds[message.guild.id] = {
            queue: [],
            queueName: [],
            isPlaying: false,
            dispatcher: null,
            voiceChannel: null,
            skipRep: 0,
            skippers: []
        }
    }

    if (mess.startsWith(prefix + 'play') || mess.startsWith(prefix + 'p')) { //---------------- play
        message.delete(1000);
        if (!message.member.voiceChannel) {
            message.reply("กรุณาเลือกเข้าสัก ** Channel ** เเล้วพิมคำสั่งเพิ่่มเพลงใหม่");
            return;
        }
        if (guilds[message.guild.id].queue.length > 0 || guilds[message.guild.id].isPlaying) {
            getID(args, function (id) {
                add_to_queue(id, message);
                fetchVideoInfo(id, function (err, videoInfo) {
                    if (err) throw new Error(err);
                    message.reply("เพิ่มเพลงนี้ **" + videoInfo.title + "** เรียบร้อยเเล้ว");
                    guilds[message.guild.id].queueName.push(videoInfo.title);
                });
            })
        } else {
            guilds[message.guild.id].isPlaying = true;
            getID(args, function (id) {
                if (guilds[message.guild.id].queue.length == 0) {
                    guilds[message.guild.id].queue.push('-39vr7SKaRk');
                    playMusic('-39vr7SKaRk', message)
                    setTimeout(() => {
                        guilds[message.guild.id].queue.push(id);
                        playMusic(id, message);
                        fetchVideoInfo(id, function (err, videoInfo) {
                            if (err) throw new Error(err);
                            message.reply("กำลังเล่นเพลงนี้ **" + videoInfo.title + "**");
                        });
                    }, 18000);
                } else {
                    guilds[message.guild.id].queue.push(id);
                    playMusic(id, message);
                    fetchVideoInfo(id, function (err, videoInfo) {
                        if (err) throw new Error(err);
                        message.reply("กำลังเล่นเพลงนี้ **" + videoInfo.title + "**");
                    });
                }
            });
        }
    } else if (mess.startsWith(prefix + 'skip')) { //-------------------------------- skip
        message.delete(1000);
        if (guilds[message.guild.id].skippers.indexOf(message.author.id) === -1) {
            guilds[message.guild.id].skippers.push(message.author.id);
            guilds[message.guild.id].skipRep++;
            if (guilds[message.guild.id].skipRep >= Math.ceil((guilds[message.guild.id].voiceChannel.members.size - 1) / 2)) {
                skip_song(message);
                message.reply("skip เพลงเรียบร้อยเเล้ว!");
            } else {
                message.reply("การ skip ต้องการ votes อีก**" + Math.ceil((guilds[message.guild.id].voiceChannel.members.size - 1) / 2) - guilds[message.guild.id].skipRep) = "** !";
            }
        } else {
            message.reply("คุณ votes ซ้ำ");
        }
    } else if (mess.startsWith(prefix + 'queue') || mess.startsWith(prefix + 'q')) { //-------------------------------- queue
        message.delete(1000);
        if (guilds[message.guild.id].queueName.length > 0) {
            var message2 = "```";
            for (let i = 0; i < guilds[message.guild.id].queueName.length; i++) {
                var temp = (i + 1) + " : " + guilds[message.guild.id].queueName[i] + (i === 0 ? " **เพลงต่อไป** " : "") + "\n";
                if ((message2 + temp).length <= 2000 - 3) {
                    message2 += temp
                } else {
                    message2 += "```";
                    message.channel.send(message2);
                    message2 = "```";
                }
            }
            message2 += "```";
            message.channel.send(message2);
        } else {
            message.channel.send("``` **ไม่มีเพลงสักเพลง เจ้าโง่ เพิ่มเพลงอีกสิ** ```");
        }
    } else if (mess.startsWith(prefix + 'stop')) { //-------------------------------- stop
        message.delete(1000);
        leaveChannel(message);
    } else if (mess.startsWith(prefix + 'help') || mess.startsWith(prefix + 'h')) { //-------------------------------- help
        message.delete(1000);
        let messagehelp = "```";
        messagehelp += "-play หรือ -p (ชื่อเพลง หรือ Link)  : เพิ่มเพลงโดยใช้คำสั่งนี้ \n";
        messagehelp += "-skip  : คำสั่งที่ใช้ข้ามเพลง (ต้องมีคน vote มากกว่าครึ่ง) \n";
        messagehelp += "-stop  : หยุดการทำงานของ Deedoo bot \n";
        messagehelp += "-queue หรือ -q : ดู queue เพลงตอนนี้ \n";
        messagehelp += "-help หรือ -h  : ดูคำสั่งต่างๆ \n";
        messagehelp += "** Create by [B]BJ**\n";
        messagehelp += "```";
        message.channel.send(messagehelp);
    } 
});


client.on('ready', function () {
    console.log('Runing....');
});

function skip_song(message) {
    guilds[message.guild.id].dispatcher.end();
    if (guilds[message.guild.id].queue.length > 1) {
        playMusic(guilds[message.guild.id].queue[0], message);
    } else {
        skipRep = 0;
        skippers = [];
    }
}

function leaveChannel(message) {
    guilds[message.guild.id].voiceChannel = message.member.voiceChannel;
    guilds[message.guild.id].queue = [];
    guilds[message.guild.id].queueName = [];
    guilds[message.guild.id].isPlaying = false;
    guilds[message.guild.id].voiceChannel.leave();
}

function playMusic(id, message) {
    guilds[message.guild.id].voiceChannel = message.member.voiceChannel;
    guilds[message.guild.id].voiceChannel.join()
        .then((connection) => {
            guilds[message.guild.id].voiceChannel.join().then(
                function (connection) {
                    stream = ytdl("https://www.youtube.com/watch?v=" + id, {
                        filter: 'audioonly'
                    });
                    guilds[message.guild.id].skipRep = 0;
                    guilds[message.guild.id].skippers = [];
                    guilds[message.guild.id].dispatcher = connection.playStream(stream);
                    guilds[message.guild.id].dispatcher.on('end', function () {
                        guilds[message.guild.id].skipRep = 0;
                        guilds[message.guild.id].skippers = [];
                        guilds[message.guild.id].queue.shift();
                        guilds[message.guild.id].queueName.shift();
                        if (guilds[message.guild.id].queue.length === 0) {
                            guilds[message.guild.id].queue = [];
                            guilds[message.guild.id].queueName = [];
                            guilds[message.guild.id].isPlaying = false;
                        } else {
                            setTimeout(() => {
                                playMusic(guilds[message.guild.id].queue[0], message);
                            }, 500);
                        }
                    });
                });
        })
        .catch(console.error);
}

function getID(str, cb) {
    if (isYoutube(str)) {
        cb(getYoutubeID(str))
    } else {
        search_video(str, function (id) {
            cb(id);
        });
    }
}

function add_to_queue(strID, message) {
    if (isYoutube(strID)) {
        guilds[message.guild.id].queue.push(getYoutubeID(strID));
    } else {
        guilds[message.guild.id].queue.push(strID);
    }
}

function isYoutube(str) {
    return str.toLowerCase().indexOf("youtube.com") > -1;
}

function search_video(query, callback) {
    //console.log(encodeURIComponent(query));
    request("https://www.googleapis.com/youtube/v3/search?part=id&type=video&q=" + encodeURIComponent(query) + "&key=" + yt_api_key, function (error, response, body) {
        let json = JSON.parse(body);
        if (!json.items[0]) callback("3_-a9nVZYjk");
        else {
            callback(json.items[0].id.videoId);
        }
    });
}