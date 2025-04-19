const Training = require('../../models/training.js');
const User = require('../../models/user.js');
const { getOrCreateUser, checkUserName, checkAdmin } = require('../middlewares/auth.js');
const { parseDate } = require('../utils/dateUtils');

const { isAdmin } = require('../middlewares/auth.js');
const {Telegraf} = require("telegraf");
const bot = new Telegraf(process.env.BOT_TOKEN);

const actionCache = new Set();

async function addTrainingHelper(ctx, time, location) {

    if (!await isAdmin(ctx)) return ctx.answerCbQuery('Только для админов');

    const today = new Date();
    today.setDate(today.getDate() + 1);
    const date = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
    try {

        const existing = await Training.findOne({ date, time, location });
        if (existing) {
            await ctx.answerCbQuery('Тренировка уже существует');
            return;
        }
        const newTraining = new Training({ date, time, location, participants: [] });
        await newTraining.save();
        await ctx.reply(`➕ Тренировка добавлена: ${date} в ${time} (${location})`);
        await ctx.answerCbQuery('Добавлено!');
    } catch (err) {
        console.error(`Action Error (add ${time} ${location}):`, err);
        await ctx.answerCbQuery('Ошибка добавления');
    }
}

async function deleteTrainingHelper(ctx, time, location) {

    if (!await isAdmin(ctx)) return ctx.answerCbQuery('Только для админов');

    const today = new Date();
    today.setDate(today.getDate() + 1); // Ищем на завтра
    const date = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
    try {
        const result = await Training.deleteOne({ date, time, location });
        if (result.deletedCount > 0) {
            await ctx.reply(`➖ Тренировка удалена: ${date} в ${time} (${location})`);
            await ctx.answerCbQuery('Удалено!');
        } else {
            await ctx.answerCbQuery('Тренировка не найдена');
        }
    } catch (err) {
        console.error(`Action Error (delete ${time} ${location}):`, err);
        await ctx.answerCbQuery('Ошибка удаления');
    }
}

async function deleteAllUpcomingTrainings(ctx) {
    if (!await isAdmin(ctx)) return ctx.answerCbQuery('Только для админов');

    const today = new Date();

    try {
        const trainings = await Training.find();
        const upcomingTrainings = trainings.filter(t => parseDate(t.date) >= today);

        if (!upcomingTrainings.length) {
            return ctx.answerCbQuery('Нет предстоящих тренировок для удаления.');
        }

        const idsToDelete = upcomingTrainings.map(t => t._id);
        const result = await Training.deleteMany({ _id: { $in: idsToDelete } });

        await ctx.reply(`🗑️ Удалено ${result.deletedCount} предстоящих тренировок.`);
        await ctx.answerCbQuery('Предстоящие удалены!');
    } catch (err) {
        console.error('Action Error (deleteAllUpcoming):', err);
        await ctx.answerCbQuery('Ошибка удаления');
    }
}

async function handleCustomWorkout(ctx) {
    if (!await isAdmin(ctx)) return ctx.answerCbQuery('Только для админов');
    const today = new Date();
    today.setDate(today.getDate() + 1);
    const date = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
    const location = "Локация";
    const time = '08:30';
    const draftMessage = `/addtraining ${date} ${time} ${location}`;
    await ctx.reply( `Скопируй и измени: \`${draftMessage}\``, { parse_mode: 'MarkdownV2' });
    await ctx.answerCbQuery();
}

async function handleNotGoAction(ctx, match) {
    await checkUserName(ctx, next => {});
    const trainingId = match[1];
    const telegramId = ctx.from.id;
    const cacheKey = `${telegramId}_${trainingId}_notgo`;
    const cacheKeyOther = `${telegramId}_${trainingId}_go`;

    if (actionCache.has(cacheKey) || actionCache.has(cacheKeyOther)) {
        console.log(`Action already processed for user ${telegramId}, training ${trainingId}`);
        return ctx.answerCbQuery('Вы уже ответили');
    }

    try {
        const user = await getOrCreateUser(ctx);
        const threadId = Number(process.env.GROUP_CHAT_THREAD_TRAINING);
        const groupId = process.env.GROUP_CHAT_ID;

        if (groupId && threadId) {
            await bot.telegram.sendMessage(groupId, `:_( @${user.username || user.name} не сможет`, { message_thread_id: threadId });
        }
        actionCache.add(cacheKey); // Добавляем в кэш
        ctx.answerCbQuery('Жаль :(');
    } catch (err) {
        console.error('Error in notgo action:', err);
        ctx.answerCbQuery('Произошла ошибка');
    }
}

async function handleGoAction(ctx, match) {
    await checkUserName(ctx, () => {});
    const trainingId = match[1];
    const telegramId = ctx.from.id;
    const cacheKey = `${telegramId}_${trainingId}_go`;
    const cacheKeyOther = `${telegramId}_${trainingId}_notgo`;


    if (actionCache.has(cacheKey) || actionCache.has(cacheKeyOther)) {
        console.log(`Action already processed for user ${telegramId}, training ${trainingId}`);
        return ctx.answerCbQuery('Вы уже ответили');
    }

    try {
        const user = await getOrCreateUser(ctx);
        const training = await Training.findById(trainingId);
        const threadId = Number(process.env.GROUP_CHAT_THREAD_TRAINING);
        const groupId = process.env.GROUP_CHAT_ID;

        if (!training) {
            if (groupId && threadId) await bot.telegram.sendMessage(groupId, 'Тренировка не найдена.', { message_thread_id: threadId });
            return ctx.answerCbQuery('Тренировка не найдена');
        }

        if (!training.participants.some(id => id.equals(user._id))) {
            training.participants.push(user._id);

            user.pixels = (user.pixels || 0) + 1; // Безопасное инкрементирование
            await training.save();
            await user.save();

            if (groupId && threadId) {
                await bot.telegram.sendMessage(
                    process.env.GROUP_CHAT_ID,
                    `✅ @${ctx.from.username} отмечен на тренировке.`,
                    { message_thread_id: threadId }
                );
            }
            actionCache.add(cacheKey); // Добавляем в кэш
            ctx.answerCbQuery('Вы записались!');
        } else {
            ctx.answerCbQuery('Вы уже записаны');
        }
    } catch (err) {
        console.error('Error in go action:', err);

        ctx.answerCbQuery('Произошла ошибка');
    }
}



async function handleJoinAgree(ctx) {
    const groupLink = process.env.GROUP_LINK || 'https://t.me/your_group_invite_link'; //
    try {
        const user = await getOrCreateUser(ctx);

        if (user.joinedClub) {
            await ctx.editMessageText(`Вы уже в клубе! Вот ссылка на группу:\n${groupLink}`);
            return ctx.answerCbQuery('Вы уже в клубе!');
        }

        user.joinedClub = true;
        await user.save();

        await ctx.editMessageText(
            `Отлично! Вы согласились с клубной политикой. Присоединяйтесь к нашей группе в Telegram:\n${groupLink}`
        );

        ctx.answerCbQuery('Добро пожаловать!');
    } catch (err){
        console.error('Failed Join club agree:', err);
        ctx.answerCbQuery('Произошла ошибка.');
    }
}

async function handleJoinDecline(ctx) {
    try {
        await ctx.editMessageText(
            'Жаль, что вы отказались. Если передумаете, просто нажмите "🚴 Join Club 🚴" снова!'

        );
        await ctx.answerCbQuery();
    } catch (err) {
        console.error('Failed Join club decline:', err);

        try { await ctx.answerCbQuery(); } catch {}
    }
}

const regexActionHandlers = [
    { regex: /go_(.+)/, handler: handleGoAction },
    { regex: /notgo_(.+)/, handler: handleNotGoAction },
    // { regex: /join_(.+)/, handler: handleGroupJoinAction }
];

const actionHandlersMap = {
    'addTomarrow7': (ctx) => addTrainingHelper(ctx, '07:00', 'I❤️Arcadia - ТЗ'),
    'addTomarrow8': (ctx) => addTrainingHelper(ctx, '08:00', 'I❤️Arcadia - ТЗ'),
    'addTomarrow10': (ctx) => addTrainingHelper(ctx, '10:00', 'I❤️Arcadia - ТЗ'),
    'addHeel8': (ctx) => addTrainingHelper(ctx, '08:00', 'Маршал-Пятак 🐽'),
    'addHeel10': (ctx) => addTrainingHelper(ctx, '10:00', 'Маршал-Пятак 🐽'),
    'addCoffe18': (ctx) => addTrainingHelper(ctx, '18:00', 'I❤️Arcadia - ТЗ'),
    'delTomarrow7': (ctx) => deleteTrainingHelper(ctx, '07:00', 'I❤️Arcadia - ТЗ'),
    'delTomarrow8': (ctx) => deleteTrainingHelper(ctx, '08:00', 'I❤️Arcadia - ТЗ'),
    'delTomarrow10': (ctx) => deleteTrainingHelper(ctx, '10:00', 'I❤️Arcadia - ТЗ'),
    'delHeel8': (ctx) => deleteTrainingHelper(ctx, '08:00', 'Маршал-Пятак 🐽'),
    'delHeel10': (ctx) => deleteTrainingHelper(ctx, '10:00', 'Маршал-Пятак 🐽'), // delHeel0 -> delHeel10
    'delCoffe18': (ctx) => deleteTrainingHelper(ctx, '18:00', 'I❤️Arcadia - ТЗ'),
    'delAllWorkout': deleteAllUpcomingTrainings,
    'customWorkout': handleCustomWorkout,
    'join_agree': handleJoinAgree,
    'join_decline': handleJoinDecline,
};

async function handleCallbackQuery(ctx) {
    const data = ctx.callbackQuery.data;
    console.log(`Callback query received: ${data}`);


    if (actionHandlersMap[data]) {
        try {
            await actionHandlersMap[data](ctx);
        } catch (err) {
            console.error(`Error executing exact action handler for "${data}":`, err);
            try { await ctx.answerCbQuery('Произошла ошибка'); } catch {}
        }
        return;
    }


    for (const item of regexActionHandlers) {
        const match = data.match(item.regex);
        if (match) {
            try {
                await item.handler(ctx, match);
            } catch (err) {
                console.error(`Error executing regex action handler for "${data}" (Regex: ${item.regex}):`, err);
                try { await ctx.answerCbQuery('Произошла ошибка'); } catch {}
            }
            return;
        }
    }


    console.warn(`No handler found for callback query data: ${data}`);
    try {
        await ctx.answerCbQuery();
    } catch (err) {
        console.error("Error answering fallback callback query:", err);
    }
}

module.exports = {
    handleCallbackQuery};