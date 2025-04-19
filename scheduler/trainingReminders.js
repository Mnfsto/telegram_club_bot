const cron = require("node-cron");
const {bot} = require("../bot");
const {Markup} = require("telegraf");
const Training = require('../models/training');
const User = require("../models/user");

async function sendDailyRemindFirst (ctx) {
    const today = new Date();
    today.setDate(today.getDate() +1);
    const formattedDate = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
    console.log('Sending workout for:', formattedDate);

    const threadId = Number(process.env.GROUP_CHAT_THREAD_TRAINING);

    try {
        const nextTraining = await Training.findOne({ date: formattedDate });
        if (!nextTraining) {
            ctx.reply('Нет запланированных тренировок.');
        }

        const { date, time, location } = nextTraining;

        await bot.telegram.sendMessage(
            process.env.GROUP_CHAT_ID,
            `Тренировка ${date} ${time} ${location}`,
            {
                message_thread_id: threadId,
                reply_markup: Markup.inlineKeyboard([
                    Markup.button.callback("+", `go_${nextTraining._id}`),
                    Markup.button.callback("-", `notgo_${nextTraining._id}`)
                ]).reply_markup
            }
        );
    } catch (err){
        console.error('failed checkin training');
        console.log(err);
    }
};

async function sendDailyRemindSecond (ctx) {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    const formattedDate = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
    try {
        const trainings = await Training.find({date: formattedDate});
        if (trainings.length) {
            trainings.forEach(training => {
                bot.telegram.sendMessage(process.env.GROUP_CHAT_ID, `Напоминание о тренировке! 📅 ${training.date} в ${training.time}, 📍 ${training.location}`,  { message_thread_id: process.env.GROUP_CHAT_THREAD_TRAINING });
            });
        }
    } catch (err){
        console.error('failed checkin training');
        console.log(err);
    }
}


async function sendDailyRemindMorning (ctx) {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    const formattedDate = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
    const nextTraining = await Training.findOne({date: formattedDate});
    const participants = nextTraining.participants;
    const user = await User.find({ _id: { $in: participants } });
    console.log(user);
    console.log(participants);
    try {

        console.log("Рассылаю тренировки пользователям", formattedDate);
        const train = `📅 ${nextTraining.date} в ${nextTraining.time}, 📍 ${nextTraining.location}\n`;
        console.log(train);
        user.forEach(u => {
            let message = `Привет ${u.name}! Сегодня тренировка 💪 \n`;
            message += train;
            bot.telegram.sendMessage(u.telegramId, message)
        });
    } catch (err){
        console.error('failed checkin training');
        console.log(err);
    }
}

async function scheduleReminders(bot) {
    cron.schedule('0 21 * * *', sendDailyRemindSecond, {
        scheduled: true,
        timezone: 'Europe/Kiev'
    });

    cron.schedule('0 6 * * *', sendDailyRemindMorning, {
        scheduled: true,
        timezone: 'Europe/Kiev'
    });

    cron.schedule('2 18 * * *', sendDailyRemindFirst, {
        scheduled: true,
        timezone: 'Europe/Kiev'
    });
}



module.exports = scheduleReminders;