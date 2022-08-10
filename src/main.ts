import { Client, GuildMember, Intents, Message, MessageEmbed, StageChannel, User, VoiceChannel } from 'discord.js';

import { ConnectionManager, speech } from './connect';
let connectionManager = new ConnectionManager();

//設定ファイルの読み込み
const config = require(process.argv[2]);

import { Voice } from "./voice";
let voice = new Voice(config.url);

//log4jsの初期設定
import * as log4js from 'log4js';
const logger = log4js.getLogger();
logger.level = 'debug';

//クライアントを新規作成
const client = new Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES]
});

//ログインする
client.login(config.token);

//準備完了したら
client.on('ready', () => {
    logger.info(`I am ready!`);
});

function addCommonEmbed(embed: MessageEmbed) {
    embed.setThumbnail((<User>client.user).displayAvatarURL());
}

function levelToColor(level: number) {
    switch (level) {
        case 0:
            return 0x000000;
            break;
        case 1:
            return 0x00ffff;
            break;
        case 2:
            return 0x00ff00;
            break;
        case 3:
            return 0xffff00;
            break;
        case 4:
            return 0xff0000;
            break;
        case 5:
            return 0xff00ff;
            break;
    }

    return 0x000000;
}

function replyError(message: Message) {
    //埋め込みの内容を生成
    const embed = new MessageEmbed()
        .setColor(levelToColor(5))
        .setTitle("エラーが発生しました");
    addCommonEmbed(embed);

    //メッセージに返信
    message.reply({ embeds: [embed] });
}

client.on('messageCreate', async (message: Message) => {
    //もしbotなら
    if (message.author.bot) {
        return;
    }
    if (message.content.startsWith(`${config.prefix}connect`) || message.content.startsWith(`${config.prefix}c`)) {
        //ボイスチャンネルへ接続を試みる
        try {
            let info = connectionManager.connect(message);

            //埋め込みの内容を生成
            const embed = new MessageEmbed()
                .setColor(levelToColor(info.getLevel()))
                .setTitle(info.getMessage());
            addCommonEmbed(embed);

            //メッセージに返信
            message.reply({ embeds: [embed] });

            logger.info(info.getMessage());
        }
        catch (error) {
            replyError(message);

            logger.error(error);
        }
    }
    else if (message.content.startsWith(`${config.prefix}disConnect`) || message.content.startsWith(`${config.prefix}dc`)) {
        //ボイスチャンネルから切断を試みる
        try {
            let info = connectionManager.disConnect(message);

            //埋め込みの内容を生成
            const embed = new MessageEmbed()
                .setColor(levelToColor(info.getLevel()))
                .setTitle(info.getMessage());
            addCommonEmbed(embed);

            //メッセージに返信
            message.reply({ embeds: [embed] });
        }
        catch (error) {
            replyError(message);

            logger.error(error);
        }
    }
    //それ以外なら読み上げを試みる
    else {
        //connectionの取得を試みて、もし取得できたら発声する
        try {
            let connection = connectionManager.getConnection(message);
            if (connection) {
                let name = await voice.createVoice(message.content);
                speech(connection, name);
                logger.info(`speech: ${name}`);
            }
        } catch (error) {
            replyError(message);

            logger.error(error);
        }
    }
})

client.on('voiceStateUpdate', async (oldState, newState) => {
    //もし強制的に切断されたら登録を解除する
    if (oldState.channelId != null && newState.channelId === null) {
        if (client.user != null && newState.id == client.user.id) {
            try {
                connectionManager.deleteConnect(oldState.guild.id);

                logger.info('解除しました');
            }
            catch (error) {
                logger.info(error);
            }
        }
    }
})

client.on('shardReconnecting', (id) => {
    logger.warn(`shardReconnecting: ${id}`);
})

client.on('debug', (message) => {
    logger.debug(message);
})

//なにかよくわからないエラーに遭遇したら
process.on('uncaughtException', async (err) => {
    logger.fatal(err);
    shutdown();
});

//Ctrl+Cとか押されたら
process.on("SIGINT", () => {
    shutdown();
});

//シャットダウンする
function shutdown() {
    logger.info(`shutdown`);
    client.destroy();
    process.exit();
}