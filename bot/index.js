const { Telegraf, Scenes, session} = require("telegraf");
const bot = new Telegraf(process.env.BOT_TOKEN);

const {parseDate} = require('./utils/dateUtils.js')
const Training = require('../models/training');
const { profileScene, PROFILE_SCENE_ID } = require('./scenes');


const stage = new Scenes.Stage([profileScene /*, other scenes... */]);
bot.use(session());
bot.use(stage.middleware());
//User Authentication
const {getOrCreateUser, checkAdmin, checkUserName, getParticipants, greetedUsers} = require('./middlewares/auth.js');
//Commands ./bot/commands
const {
    startCommand,
    trainingListCommand,
    addTrainingCommand,
    checkInCommand,
    checkOutCommand,
    trainingInfoCommand,

} = require('./commands')

//Command /start
bot.start(startCommand);
bot.command('traininglist',trainingListCommand);
bot.command('addtraining',checkAdmin, addTrainingCommand);
bot.command('checkout', checkAdmin, checkOutCommand);
bot.command('checkin', checkAdmin, checkInCommand);
bot.command('training_info', trainingInfoCommand);
/// User Interface
const textHandlers = require('./handlers')
const http = require("node:http");
bot.on('text', textHandlers);


// ACTION
const createHandleRemind = require('../bot/handlers/keyboardHandlers/handleRemind')
const createHandleSendWorkout = require('../bot/handlers/keyboardHandlers/handleSendWorkout.js');
const handleSendWorkout = createHandleSendWorkout(bot);
const handleRemind = createHandleRemind(bot);
bot.hears('🗣️ Send a workout', checkAdmin, handleSendWorkout);
bot.hears("📢 Remind everyone", checkAdmin, handleRemind);


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

    }
    return next();
});

module.exports ={ bot };