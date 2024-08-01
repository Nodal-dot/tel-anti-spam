import 'dotenv/config'
import { Bot } from "grammy";
import Redis from 'ioredis';
const redisClient = new Redis({
    host: process.env.REDIS_HOST,
    port: +process.env.REDIS_PORT,
})
const bot = new Bot(process.env.BOT_TOKEN);
const MUTE_DURATION = +process.env.MUTE_DURATION
console.log(MUTE_DURATION)
bot.on('message', async (ctx) => {
    if (ctx.chat.type === 'private') {
       await ctx.reply('Я работаю только в группе!');
        return;
    }
    const { message, from, chatId } = ctx;
    const userId = from.id;
    const messageText = message.text;
    const repeatKey = `repeat:${userId}:${messageText}`;
    const repeatCount = await redisClient.incr(repeatKey);
    await redisClient.expire(repeatKey, 10);
    if (repeatCount >= 3) {
        await ctx.reply(`Прекратите спамить повторяющимися сообщениями, @${from.username}`);
        await muteUser(chatId,userId,MUTE_DURATION)
        await ctx.reply(`Пользователь @${from.username} был замучен на ${MUTE_DURATION} секунд` );
        return;
    }
    const rateLimitKey = `rateLimit:${userId}`;
    const rateLimitCount = await redisClient.incr(rateLimitKey);
    await redisClient.expire(rateLimitKey, 60);
    if (rateLimitCount >= 20) {
        await ctx.reply(`Прекратите спамить, @${from.username}` );
        await muteUser(chatId,userId,300)
        await ctx.reply(`Пользователь @${from.username} был замучен на ${MUTE_DURATION} секунд` );

        return;
    }

});
async function muteUser(chatId:number,userId:number,duration:number):Promise<void>{
    const unixTimeNow = Math.floor(Date.now() / 1000)
    await bot.api.restrictChatMember(chatId, userId, {
        can_send_messages: false,
    },{until_date: unixTimeNow + duration,});
}


bot.start().then(()=>{
    console.log('Бот запущен')
});