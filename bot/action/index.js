const Training = require('../../models/training.js');
const User = require('../../models/user.js');
const { Scenes } = require('telegraf');
const { PROFILE_SCENE_ID } = require('../scenes');
const { JOIN_CLUB_SCENE_ID } = require('../scenes/joinClub.scene');
const { getOrCreateUser, checkUserName, checkAdmin } = require('../middlewares/auth.js');
const { parseDate } = require('../utils/dateUtils');
const { getText } =  require('../../locales');

const { isAdmin } = require('../middlewares/auth.js');
const {Telegraf} = require("telegraf");
const bot = new Telegraf(process.env.BOT_TOKEN);

const actionCache = new Set();

async function addTrainingHelper(ctx, time, location) {

    if (!await isAdmin(ctx)) return ctx.answerCbQuery('Тільки для адмінів');

    const today = new Date();
    today.setDate(today.getDate() + 1);
    const date = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
    try {

        const existing = await Training.findOne({ date, time, location });
        if (existing) {
            await ctx.answerCbQuery('Тренування вже існує');
            return;
        }
        const newTraining = new Training({ date, time, location, participants: [] });
        await newTraining.save();
        await ctx.reply(`➕ Тренування додано: ${date} в ${time} (${location})`);
        await ctx.answerCbQuery('Додано!');
    } catch (err) {
        console.error(`Action Error (add ${time} ${location}):`, err);
        await ctx.answerCbQuery('Помилка додавання');
    }
}

async function deleteTrainingHelper(ctx, time, location) {

    if (!await isAdmin(ctx)) return ctx.answerCbQuery('Тільки для адмінів');

    const today = new Date();
    today.setDate(today.getDate() + 1); // Search for tomorrow
    const date = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
    try {
        const result = await Training.deleteOne({ date, time, location });
        if (result.deletedCount > 0) {
            await ctx.reply(`➖ Тренування видалено: ${date} в ${time} (${location})`);
            await ctx.answerCbQuery('Видалено!');
        } else {
            await ctx.answerCbQuery('Тренування не знайдено');
        }
    } catch (err) {
        console.error(`Action Error (delete ${time} ${location}):`, err);
        await ctx.answerCbQuery('Помилка видалення');
    }
}

async function deleteAllUpcomingTrainings(ctx) {
    if (!await isAdmin(ctx)) return ctx.answerCbQuery('Тільки для адмінів');

    const today = new Date();

    try {
        const trainings = await Training.find();
        const upcomingTrainings = trainings.filter(t => parseDate(t.date) >= today);

        if (!upcomingTrainings.length) {
            return ctx.answerCbQuery('Немає майбутніх тренувань для видалення.');
        }

        const idsToDelete = upcomingTrainings.map(t => t._id);
        const result = await Training.deleteMany({ _id: { $in: idsToDelete } });

        await ctx.reply(`🗑️ Видалено ${result.deletedCount} майбутніх тренувань.`);
        await ctx.answerCbQuery('Майбутні видалено!');
    } catch (err) {
        console.error('Action Error (deleteAllUpcoming):', err);
        await ctx.answerCbQuery('Помилка видалення');
    }
}

async function handleCustomWorkout(ctx) {
    if (!await isAdmin(ctx)) return ctx.answerCbQuery('Тільки для адмінів');
    const today = new Date();
    today.setDate(today.getDate() + 1);
    const date = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
    const location = "Місце";
    const time = '08:30';
    const draftMessage = `/addtraining ${date} ${time} ${location}`;
    await ctx.reply( `Скопіюйте та змініть за потребою: \`${draftMessage}\``, { parse_mode: 'MarkdownV2' });
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
        return ctx.answerCbQuery('Ви вже відповіли');
    }

    try {
        const user = await getOrCreateUser(ctx);
        const groupId = process.env.GROUP_CHAT_ID;

        if (groupId) {
            await bot.telegram.sendMessage(groupId, `@${user.username || user.name} не зможе приєднатись :-(`, { message_thread_id: threadId });
        }
        actionCache.add(cacheKey);
        ctx.answerCbQuery('Шкода :(');
    } catch (err) {
        console.error('Error in notgo action:', err);
        ctx.answerCbQuery('Сталася помилка');
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
        return ctx.answerCbQuery('Ви вже відповіли');
    }

    try {
        const user = await getOrCreateUser(ctx);
        const training = await Training.findById(trainingId);
        const groupId = process.env.GROUP_CHAT_ID;

        if (!training) {
            if (groupId && threadId) await bot.telegram.sendMessage(groupId, 'Тренування не знайдено.', { message_thread_id: threadId });
            return ctx.answerCbQuery('Тренування не знайдено.');
        }

        if (!training.participants.some(id => id.equals(user._id))) {
            training.participants.push(user._id);

            await training.save();

            if (groupId) {
                await bot.telegram.sendMessage(
                    process.env.GROUP_CHAT_ID,
                    `✅ @${ctx.from.username} відзначений на тренуванні.`,
                );
            }
            actionCache.add(cacheKey);
            ctx.answerCbQuery('Ви записалися!');
        } else {
            ctx.answerCbQuery('Ви вже записані');
        }
    } catch (err) {
        console.error('Error in go action:', err);

        ctx.answerCbQuery('Сталася помилка');
    }
}



async function handleJoinAgreeAdult(ctx) {
    const groupLink = process.env.GROUP_LINK || 'https://t.me/your_group_invite_link';
    try {
        const user = await getOrCreateUser(ctx);

        if (user.joinedClub) {
            await ctx.editMessageText(`Ви вже в клубі! Ось посилання на групу:\n${groupLink}`);
            return ctx.answerCbQuery('Ви вже в клубі!');
        }

        await ctx.editMessageText(
            'Чудово! Ви обрали реєстрацію як Дорослий. Тепер давайте заповнимо вашу анкету.'
        );
        ctx.answerCbQuery('Ласкаво просимо!');

        await ctx.scene.enter(JOIN_CLUB_SCENE_ID);

    } catch (err){
        console.error('Failed Join club agree adult:', err);
        ctx.answerCbQuery('Сталася помилка.');
    }
}

async function handleJoinAgreeKid(ctx) {
    const groupLink = process.env.GROUP_LINK || 'https://t.me/your_group_invite_link';
    try {
        const user = await getOrCreateUser(ctx);

        if (user.joinedClub) {
            await ctx.editMessageText(`Ви вже в клубі! Ось посилання на групу:\n${groupLink}`);
            return ctx.answerCbQuery('Ви вже в клубі!');
        }

        await ctx.editMessageText(
            'Чудово! Ви обрали реєстрацію як Дитина. Тепер давайте заповнимо ваш профіль.'
        );
        ctx.answerCbQuery('Ласкаво просимо!');

        await ctx.scene.enter(PROFILE_SCENE_ID);

    } catch (err){
        console.error('Failed Join club agree kid:', err);
        ctx.answerCbQuery('Сталася помилка.');
    }
}

async function handleJoinDecline(ctx) {
    try {
        const joinClubBtn = getText('joinClubBtn');
        await ctx.editMessageText(
            `Шкода, що ви відмовилися. Якщо передумаєте, просто натисніть \`${joinClubBtn}\` знову!`

        );
        await ctx.answerCbQuery();
    } catch (err) {
        console.error('Failed Join club decline:', err);

        try { await ctx.answerCbQuery(); } catch {}
    }
}

const regexActionHandlers = [
    { regex: /notgo_(.+)/, handler: handleNotGoAction },
    { regex: /go_(.+)/, handler: handleGoAction },
    {
             regex: /tgl_atn_(.+)_(.+)/,
             handler: async (ctx, match) => {
                 const [_, trainingId, userId] = match;
                 const training = await Training.findById(trainingId);

                const index = training.attended.findIndex(id => id.toString() === userId);
                if (index > -1) {
                    training.attended.splice(index, 1);
                } else {
                    training.attended.push(userId);
                }

                await training.save();
                const { showParticipantList } = require('../commands/check');
                await showParticipantList(ctx, training, true);
                await ctx.answerCbQuery();
            }
       },
       {
                regex: /award_atn_(.+)/,
                handler: async (ctx, match) => {
                    const trainingId = match[1];
                    const training = await Training.findById(trainingId).populate('attended');
                    const { awardPixels } = require('../utils/pixelSystem');

                    let count = 0;
                    const points = training.type === 'competition' ? 5 : 1;

                    for (const user of training.attended) {
                        await awardPixels(user, points, ctx.telegram, user.telegramId);
                        count++;
                    }

                    await ctx.editMessageText(`✅ Перевірку завершено!\nВідмічено: ${count} чол.\nНараховано по ${points} Піксель.`);
                    await ctx.answerCbQuery('Готово!');
                }
            },
            {
                regex: /check_tr_(.+)/,
                handler: async (ctx, match) => {
                        const trainingId = match[1];
                        const training = await Training.findById(trainingId);
                        const { showParticipantList } = require('../commands/check');
                        await showParticipantList(ctx, training, true);
                        await ctx.answerCbQuery();
                    }
                },



    // { regex: /join_(.+)/, handler: handleGroupJoinAction }
];

const actionHandlersMap = {
    // Lanzheron
    'add_l_10': (ctx) => addTrainingHelper(ctx, '10:00', 'Ланжерон'),
    'add_l_11': (ctx) => addTrainingHelper(ctx, '11:00', 'Ланжерон'),
    'add_l_12': (ctx) => addTrainingHelper(ctx, '12:00', 'Ланжерон'),
    'del_l_10': (ctx) => deleteTrainingHelper(ctx, '10:00', 'Ланжерон'),
    'del_l_11': (ctx) => deleteTrainingHelper(ctx, '11:00', 'Ланжерон'),
    'del_l_12': (ctx) => deleteTrainingHelper(ctx, '12:00', 'Ланжерон'),

    // Sanatorium-Arkadia
    'add_s_10': (ctx) => addTrainingHelper(ctx, '10:00', 'Санаторій-Аркадія'),
    'add_s_11': (ctx) => addTrainingHelper(ctx, '11:00', 'Санаторій-Аркадія'),
    'add_s_12': (ctx) => addTrainingHelper(ctx, '12:00', 'Санаторій-Аркадія'),
    'del_s_10': (ctx) => deleteTrainingHelper(ctx, '10:00', 'Санаторій-Аркадія'),
    'del_s_11': (ctx) => deleteTrainingHelper(ctx, '11:00', 'Санаторій-Аркадія'),
    'del_s_12': (ctx) => deleteTrainingHelper(ctx, '12:00', 'Санаторій-Аркадія'),

    // TZ-Arkadia
    'add_tz_07': (ctx) => addTrainingHelper(ctx, '07:00', 'ТЗ-Аркадія'),
    'add_tz_08': (ctx) => addTrainingHelper(ctx, '08:00', 'ТЗ-Аркадія'),
    'add_tz_09': (ctx) => addTrainingHelper(ctx, '09:00', 'ТЗ-Аркадія'),
    'del_tz_07': (ctx) => deleteTrainingHelper(ctx, '07:00', 'ТЗ-Аркадія'),
    'del_tz_08': (ctx) => deleteTrainingHelper(ctx, '08:00', 'ТЗ-Аркадія'),
    'del_tz_09': (ctx) => deleteTrainingHelper(ctx, '09:00', 'ТЗ-Аркадія'),

    // 411-Batareya
    'add_411_17': (ctx) => addTrainingHelper(ctx, '17:00', '411-Батарея'),
    'add_411_18': (ctx) => addTrainingHelper(ctx, '18:00', '411-Батарея'),
    'del_411_17': (ctx) => deleteTrainingHelper(ctx, '17:00', '411-Батарея'),
    'del_411_18': (ctx) => deleteTrainingHelper(ctx, '18:00', '411-Батарея'),

    'delAllWorkout': deleteAllUpcomingTrainings,
    'customWorkout': handleCustomWorkout,
    'join_agree_adult': handleJoinAgreeAdult,
    'join_agree_kid': handleJoinAgreeKid,
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
            try { await ctx.answerCbQuery('Сталася помилка'); } catch {}
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
                try { await ctx.answerCbQuery('Сталася помилка'); } catch {}
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
    handleCallbackQuery
};