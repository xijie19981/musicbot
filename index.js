const { executionAsyncResource } = require('async_hooks');
const Discord = require('discord.js');
const ytdl = require('ytdl-core');

const { YTSearcher } = require('ytsearcher');

const searcher = new YTSearcher({
    key: process.env.youtube_api,
    revealed: true
});

const client = new Discord.Client();

const queue = new Map();

client.on("ready", () => {
    console.log("I am online!")
})

client.on("message", async(message) => {
    const prefix = '-j';

    const serverQueue = queue.get(message.guild.id);

    const args = message.content.slice(prefix.length).trim().split(/ +/g)
    const command = args.shift().toLowerCase();

    switch(command){
        case 'play':
            execute(message, serverQueue);
            break;
        case 'stop':
            stop(message, serverQueue);
            break;
        case 'skip':
            skip(message, serverQueue);
            break;
        case 'pause':
            pause(serverQueue);
            break;
        case 'resume':
            resume(serverQueue);
            break;
        case 'loop':
            Loop(args, serverQueue);
            break;
        case 'queue':
            Queue(serverQueue);
            break;
        }

    async function execute(message, serverQueue){
        let vc = message.member.voice.channel;
        if(!vc){
            return message.channel.send("PlEaSe JoIn A vOiCe ChAt FiRsT");
        }else{
            let result = await searcher.search(args.join(" "), { type: "video" }) 
            const songInfo = await ytdl.getInfo(result.first.url)

            let song = {
                title: songInfo.videoDetails.title,
                url: songInfo.videoDetails.video_url
            };

            if(!serverQueue){
                const queueConstructor = {
                    txtChannel: message.channel,
                    vChannel: vc,
                    connection: null,
                    songs: [],
                    volume: 10,
                    playing: true,
                    loopone: false,
                    loopall: false
                };
                queue.set(message.guild.id, queueConstructor);

                queueConstructor.songs.push(song);

                try{
                    let connection = await vc.join();
                    queueConstructor.connection = connection;
                    play(message.guild, queueConstructor.songs[0]);
                }catch (err){
                    console.error(err);
                    queue.delete(message.guild.id);
                    return message.channel.send(`UnAbLe tO jOiN a VoIcE cHaT ${err}`)
                }
            }else{
                serverQueue.songs.push(song);
                return message.channel.send(`THe sOnG hAs bEeN aDdEd ${song.url}`);
            }
        }
    }
    function play(guild, song){
        const serverQueue = queue.get(guild.id);
        if(!song){
            serverQueue.vChannel.leave();
            queue.delete(guild.id);
            return;
        }
        const dispatcher = serverQueue.connection
            .play(ytdl(song.url))
            .on('finish', () =>{
                if(serverQueue.loopone){  
                    play(guild, serverQueue.songs[0]);
                }
                else if(serverQueue.loopall){
                    serverQueue.songs.push(serverQueue.songs[0])
                    serverQueue.songs.shift()
                }else{
                    serverQueue.songs.shift()
                }
                play(guild, serverQueue.songs[0]);
            })
            serverQueue.txtChannel.send(`NoW pLaYiNg ${serverQueue.songs[0].url}`)
    }
    function stop (message, serverQueue){
        if(!message.member.voice.channel)
            return message.channel.send("YoU nEeD tO jOiN a VoIcE cHat FirSt")
        serverQueue.songs = [];
        serverQueue.connection.dispatcher.end();
    }
    function skip (message, serverQueue){
        if(!message.member.voice.channel)
            return message.channel.send("YoU nEeD tO jOiN a VoIcE cHat FirSt");
        if(!serverQueue)
            return message.channel.send("ThErE iS nTh tO sKiP");
        serverQueue.connection.dispatcher.end();
    }
    function pause(serverQueue){
        if(!serverQueue.connection)
            return message.channel.send("No MuSiC CuRrEnTlY pLaYiNg");
        if(!message.member.voice.channel)
            return message.channel.send("YoU nEeD tO jOiN a VoIcE cHat FirSt")
        if(serverQueue.connection.dispatcher.paused)
            return message.channel.send("ThE sOnG iS aLrEaDy pAuSeD");
        serverQueue.connection.dispatcher.pause();
        message.channel.send("sOnG pAuSeD");
    }
    function resume(serverQueue){
        if(!serverQueue.connection)
            return message.channel.send("ThErS iS nO mUsIc cUrReNtLy pLaYiNg");
        if(!message.member.voice.channel)
            return message.channel.send("YoU nEeD tO jOiN a VoIcE cHat FirSt")
        if(serverQueue.connection.dispatcher.resumed)
            return message.channel.send("ThE sOnG iS aLrEaDy PlAyInG");
        serverQueue.connection.dispatcher.resume();
        message.channel.send("SoNg ResUmEd");
    }
    function Loop(args, serverQueue){
        if(!serverQueue.connection)
            return message.channel.send("ThE iS nO MuSiC cUrReNtLy pLaYiNg");
        if(!message.member.voice.channel)
            return message.channel.send("YoU nEeD tO jOiN a VoIcE cHat FirSt")

        switch(args[0].toLowerCase()){
           case 'all':
               serverQueue.loopall = !serverQueue.loopall;
               serverQueue.loopone = false;

               if(serverQueue.loopall === true)
                   message.channel.send("LoOp aLl HaS bEeN tUrNeD oN");
               else
                    message.channel.send("LoOp aLl HaS bEeN tUrNeD oFf");

               break;
            case 'one':
                serverQueue.loopone = !serverQueue.loopone;
                serverQueue.loopall = false;

                if(serverQueue.loopone === true)
                    message.channel.send("LoOp aLl HaS bEeN tUrNeD oN");
                else
                    message.channel.send("LoOp aLl HaS bEeN tUrNeD oFf");
                break;
            case 'off':
                    serverQueue.loopall = false;
                    serverQueue.loopone = false;

                    message.channel.send("LoOp aLl HaS bEeN tUrNeD oFf");
                break;
            default:
                message.channel.send("PlEaSe sPeCiFy wHaT lOoP yOu WaNt. !loop <one/all/off>"); 
        }
    }
    function Queue(serverQueue){
        if(!serverQueue.connection)
            return message.channel.send("ThEreS iS nO mUsIc cUrReNtLy pLaYiNg");
        if(!message.member.voice.channel)
            return message.channel.send("YoU nEeD tO jOiN a VoIcE cHat FirSt")

        let nowPlaying = serverQueue.songs[0];
        let qMsg =  `Now playing: ${nowPlaying.title}\n--------------------------\n`

        for(var i = 1; i < serverQueue.songs.length; i++){
            qMsg += `${i}. ${serverQueue.songs[i].title}\n`
        }

        message.channel.send('```' + qMsg + 'Requested by: ' + message.author.username + '```');
    }
})
client.login(process.env.token)