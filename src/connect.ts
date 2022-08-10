import * as voice from '@discordjs/voice';
import { Message, StageChannel, VoiceChannel } from 'discord.js';
import { Info } from "./info";

//ギルド
class Guilds {
    [key: string]: Connection;
}

class Connection {
    textChannelID: string;
    connection: voice.VoiceConnection | undefined;
    constructor() {
        this.textChannelID = '';
        this.connection = undefined;
    }
}

export class ConnectionManager {
    private guilds: Guilds = new Guilds();

    constructor() {

    }

    getConnection(message: Message) {
        let guildID = message.guildId;
        if (guildID) {
            //もしギルドが登録されていなかったらギルドを登録
            if (!(guildID in this.guilds)) {
                this.guilds[guildID] = new Connection();
            }

            //もし指定されたテキストチャンネルなら
            if (message.channelId == this.guilds[guildID].textChannelID) {
                let connection = this.guilds[guildID].connection;
                return connection;
            }
            return undefined;

        }
        else {
            throw new Error("メッセージはギルド内ではありません");

        }
    }

    connect(message: Message): Info {
        //メッセージを送信したユーザが参加しているボイスチャンネルを取得
        let voiceChannel: VoiceChannel | StageChannel | null = null;
        if (message.member) {
            voiceChannel = message.member.voice.channel;
        }

        //もしボイスチャンネルに接続されていなかったら
        if (!voiceChannel) {
            return new Info("ボイスチャンネルに接続されていません", 3);
        }

        let guildID: string = voiceChannel.guildId;

        //もしギルドが登録されていなかったらギルドを登録
        if (!(guildID in this.guilds)) {
            this.guilds[guildID] = new Connection();
        }

        //もしボイスチャンネルの接続権限がなかったら
        if (!voiceChannel.joinable) {
            return new Info("ボイスチャンネルに接続できません", 3);
        }
        //もしすでに接続しているのならば
        else if (this.guilds[guildID].connection) {
            return new Info("すでに接続されています", 3);
        }
        else {
            //コネクションを生成
            const connection = voice.joinVoiceChannel({
                adapterCreator: voiceChannel.guild.voiceAdapterCreator as unknown as voice.DiscordGatewayAdapterCreator,
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                selfDeaf: true,
                selfMute: false,
            });

            //必要な情報を登録する
            this.guilds[guildID].connection = connection;
            this.guilds[guildID].textChannelID = message.channelId;

            return new Info("接続しました", 2);
        }
    }

    disConnect(message: Message): Info {
        let guildID = message.guildId;

        return this.deleteConnect(guildID);
    }

    deleteConnect(guildID: string | null): Info {
        if (!guildID) {
            throw new Error('ギルドではありません');

        }
        //もしギルドが登録されていなかったらギルドを登録
        if (!(guildID in this.guilds)) {
            this.guilds[guildID] = new Connection();
        }

        let connection = this.guilds[guildID].connection;

        //もしコネクションが存在したなら
        if (connection != undefined) {
            //コネクションを破棄
            connection.destroy();
            this.guilds[guildID].textChannelID = '';
            this.guilds[guildID].connection = undefined;
            return new Info("切断しました", 2);
        }
        else {
            this.guilds[guildID].textChannelID = '';
            this.guilds[guildID].connection = undefined;
            return new Info("接続されていません", 3);
        }
    }
}

export function speech(connection: voice.VoiceConnection | undefined, fileName: string) {
    //もし_voiceConnectionがundefinedではないなら読み上げる
    if (connection != undefined) {
        const player = voice.createAudioPlayer();
        connection.subscribe(player);
        player.play(voice.createAudioResource(`./wav/${fileName}.wav`));
    }
    else {
        throw new Error('connectionはundefinedです');
    }
}