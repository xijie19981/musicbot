const { executionAsyncResource } = require('async_hooks');
const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const { YTSearcher } = require('ytsearcher');

const searcher = new YTSearcher({
    key: "AIzaSyAShyCkgvJbEn8Y9n_A3oSd6sbSQ2oEYPc",
    revealed: true
});

const client = new Discord.Client();

const queue = new Map();

client.on("ready", () => {
    console.log("JOEL is online!")

})

client.on("message", async(message) =>{
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
            pause(serverQueue) ;
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
            return message.channel.send("pLeAsE JoIn A vOiCe ChaT FiRst")
        } else {
            let result = await searcher.search(args.join(" "), {type: "video" })
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
                    return message.channel.send(`uNaBle To JoIn thE VoIcE cHaT ${err}`)
                }
                }else{
                    serverQueue.songs.push(song);
                    return message.channel.send(`tHe SoNg HaS bEeN AdDeD ${song.url}`);
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
            serverQueue.songs.shift();
            play(guild, serverQueue.songs[0]);
        })
            serverQueue.txtChannel.send(`NoW pLaYiNg ${serverQueue.songs[0].url}`)
        
    }
    function stop (message, serverQueue){
        if(!message.member.voice.channel)
        return message.channel.send("yOu NeEd tO JoIn tHe vOiCe ChAt FiRsT")
        serverQueue.songs = [];
        serverQueue.connection.dispatcher.end();
    }
    function skip (message, serverQueue){
        if(!message.member.voice.channel)
        return message.channel.send("yOu NeEd tO jOiN tHe VoIcE cHaT fiRsT");
        if(!serverQueue)
        return message.channel.send("tHeRe iS NoThInG tO sKiP");
        serverQueue.connection.dispatcher.end();
    }
    function pause(serverQueue){
        if(!serverQueue.connection)
        return message.channel.send("nO mUsIc CuRrEnTlY pLaYiNg");
        if(!message.member.voice.channel)
        return message.channel.send("yOu MuSt Be iN a VoIcE cHaNnEl")
        if(serverQueue.connection.dispatcher.paused)
        return message.channel.send("sOnG iS aLrEaDy PaUsEd");
        serverQueue.connection.dispatcher.pause();
        message.channel.send("sOnG pAuSeD");

    }
    function resume(){
        if(!serverQueue.connection)
        return message.channel.send("nO mUsIc CuRrEnTlY pLaYiNg");
        if(!message.member.voice.channel)
        return message.channel.send("yOu MuSt Be iN a VoIcE cHaNnEl")
        if(serverQueue.connection.dispatcher.resumed)
        return message.channel.send("sOnG iS aLrEaDy rEsUmEd");
        serverQueue.connection.dispatcher.resume();
        message.channel.send("sOnG rEsUmEd");

    }
    function Loop(args, serverQueue){
        if(!serverQueue.connection)
        return message.channel.send("nO mUsIc CuRrEnTlY pLaYiNg");
        if(!message.member.voice.channel)
        return message.channel.send("yOu MuSt Be iN a VoIcE cHaNnEl")

        switch(args[0].toLowerCase()){
            case 'all':
                serverQueue.loopall = !serverQueue.loopall;
                serverQueue.loopone = false;

                if(serverQueue.loopall === true)
                message.channel.send("LoOp aLl HaS bEeN tUrNeD On");
                else
                message.channel.send("LoOp aLl hAs bEeN oFfEd");

                break;
            case 'one':
                serverQueue.loopone = !serverQueue.loopone;
                serverQueue.loopall = false;

                if(serverQueue.loopone === true)
                message.channel.send("LoOp OnE HaS bEeN tUrNeD On");
                else
                message.channel.send("LoOp OnE hAs bEeN oFfEd");
                break;
            case 'off':
                serverQueue.loopone = false;
                serverQueue.loopall = false;

                message.channel.send("lOoP hAs bEeN tUrNeD oFf");
                break;
            default:
                message.channel.send("pLeAsE sPeCiFy wHaT lOoP yOu Want. !loop <one/all/off>");
        }
    }
        function Queue(serverQueue){
        if(!serverQueue.connection)
        return message.channel.send("nO mUsIc CuRrEnTlY pLaYiNg");
        if(!message.member.voice.channel)
        return message.channel.send("yOu MuSt Be iN a VoIcE cHaNnEl")

        let nowPlaying = serverQueue.songs[0];
        let qMsg = `Now playing : ${nowPlaying.title}\n------------------------\n`

        for(var i = 1;i < serverQueue.songs.length; i++){
            qMsg += `${i}. ${serverQueue.songs[i].title}\n`
    
        }
        message.channel.send('```' + qMsg + 'ReQuEsTeD bY : ' + message.author.username + '```');
    }


})
client.login("Nzk3NTEyMjMyMDQwMzk4ODc4.X_njJQ.CrBhhNksdyTomdOlwDzb2rFVSLs")