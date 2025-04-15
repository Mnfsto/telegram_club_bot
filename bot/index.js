const {Telegraf} = require("telegraf");
const bot = new Telegraf(process.env.BOT_TOKEN);
// Функция для преобразования строки "DD.MM.YYYY" в объект Date
const {parseDate} = require('./utils/dateUtils.js')
const Training = require('../models/training');



//User Authentication
const {getOrCreateUser, checkAdmin, checkUserName, getParticipants, greetedUsers} = require('./middlewares/auth.js');
//Commands ./bot/commands
const {
    startCommand,
    trainingListCommand,
    addTrainingCommand,
    checkInCommand,
    checkOutCommand,

} = require('./commands')

//Command /start
bot.start(startCommand);
bot.command('trainingList',trainingListCommand);
bot.command('addtraining',checkAdmin, addTrainingCommand);
bot.command('checkout', checkAdmin, checkOutCommand);
bot.command('checkin', checkAdmin, checkInCommand);
/// User Interface
const textHandlers = require('./handlers')
const http = require("node:http");
bot.on('text', textHandlers);


// ACTION
const { handleCallbackQuery } = require('./action')
bot.on('callback_query', handleCallbackQuery);

bot.on('message', async (ctx, next) => {
    const chatId = ctx.chat.id;
    const messageText = ctx.message.text;
    const chatType = ctx.chat.type; // "private", "group", "supergroup"
    const threadId = ctx.message.message_thread_id;
    const telegramId = ctx.from.id;

    console.log(`Получено сообщение из чата ${chatId} - ${threadId}: ${messageText}`);

    if (chatType === 'group' || chatType === 'supergroup') {
        const user = await getOrCreateUser(ctx);

        // // Если пользователь ещё не вступил в клуб и не получил приветствие
        // if (!user.joinedClub && !greetedUsers.has(telegramId)) {
        //     const threadId = Number(process.env.GROUP_CHAT_THREAD_TRAINING);
        //
        //     await bot.telegram.sendMessage(
        //         process.env.GROUP_CHAT_ID,
        //         `Привет, @${ctx.from.username || ctx.from.id}! Хочешь вступить в наш клуб?`,
        //         {
        //             message_thread_id: threadId,
        //             reply_markup: Markup.inlineKeyboard([
        //                 Markup.button.callback('Join Club', `join_${telegramId}`)
        //             ]).reply_markup
        //         }
        //     );
        //     greetedUsers.add(telegramId); // Отмечаем, что пользователь получил приветствие
        // }
    }
    return next();
});

module.exports ={ bot };