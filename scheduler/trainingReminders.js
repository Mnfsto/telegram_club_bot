const cron = require("node-cron");
const {bot} = require("../bot");
const {Markup} = require("telegraf");
const Training = require('../models/training');
const User = require("../models/user");
const {formatDates} = require("../bot/utils/dateUtils");

async function sendDailyRemindFirst () { // Removed ctx as it's not used
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const formattedDate = formatDates ? formatDates(tomorrow) : `${tomorrow.getDate().toString().padStart(2, '0')}.${(tomorrow.getMonth() + 1).toString().padStart(2, '0')}.${tomorrow.getFullYear()}`;

    console.log('Sending workout announcements for:', formattedDate);

    const threadId = Number(process.env.GROUP_CHAT_THREAD_TRAINING);

    try {
        const trainingsTomorrow = await Training.find({ date: formattedDate }).sort({ time: 1 });
        if (!trainingsTomorrow || trainingsTomorrow.length === 0) {
            console.log('Немає запланованих тренувань на завтра для анонсу.');
            return;
        }

        let sentCount = 0;
        for (const training of trainingsTomorrow) {
            const { date, time, location, _id } = training;
            try {
                await bot.telegram.sendMessage(
                    process.env.GROUP_CHAT_ID,
                    `Тренування ${date} о ${time} ${location}`,
                    {
                        message_thread_id: threadId,
                        reply_markup: Markup.inlineKeyboard([
                            Markup.button.callback("+", `go_${_id}`),
                            Markup.button.callback("-", `notgo_${_id}`)
                        ]).reply_markup
                    }
                );
                sentCount++;
            } catch (sendErr) {
                console.error(`Failed to send announcement for training ${date} ${time}:`, sendErr);
            }
        }
        console.log(`Відправлено ${sentCount} анонсів тренувань на ${formattedDate}.`);

    } catch (err){
        console.error('Failed processing training announcements:', err);
    }
};

async function sendDailyRemindSecond () { // Removed ctx as it's not used
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const formattedDate = formatDates ? formatDates(tomorrow) : `${tomorrow.getDate().toString().padStart(2, '0')}.${(tomorrow.getMonth() + 1).toString().padStart(2, '0')}.${tomorrow.getFullYear()}`;

    const threadId = Number(process.env.GROUP_CHAT_THREAD_TRAINING);

    try {
        const trainings = await Training.find({date: formattedDate}).sort({ time: 1 });
        if (trainings.length > 0) {
            console.log(`Sending ${trainings.length} reminders to group for ${formattedDate}`);
            let sentCount = 0;
            for (const training of trainings) {
                try {
                    await bot.telegram.sendMessage(
                        process.env.GROUP_CHAT_ID,
                        `Нагадування про тренування! 📅 ${training.date} о ${training.time}, 📍 ${training.location}`,
                        { message_thread_id: threadId }
                    );
                    sentCount++;
                } catch(sendErr) {
                    console.error(`Failed to send group reminder for training ${training.date} ${training.time}:`, sendErr);
                }
            }
            console.log(`Sent ${sentCount} group reminders.`);
        } else {
            console.log(`No trainings found for ${formattedDate} to send group reminders.`);
        }
    } catch (err){
        console.error('Failed sending group reminders:', err);
    }
}


async function sendDailyRemindMorning () {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const formattedDate = formatDates ? formatDates(tomorrow) : `${tomorrow.getDate().toString().padStart(2, '0')}.${(tomorrow.getMonth() + 1).toString().padStart(2, '0')}.${tomorrow.getFullYear()}`;

    try {
        const trainingsTomorrow = await Training.find({ date: formattedDate }).sort({ time: 1 });

        if (!trainingsTomorrow || trainingsTomorrow.length === 0) {
            console.log(`No trainings scheduled for ${formattedDate} to send morning reminders.`);
            return;
        }

        console.log(`Розсилаю ранкові нагадування користувачам на ${formattedDate}`);
        let totalParticipantsNotified = 0;
        let totalParticipants = 0;

        for (const training of trainingsTomorrow) {
            if (!training.participants || training.participants.length === 0) {
                console.log(`No participants for training ${training.date} ${training.time}`);
                continue;
            }

            const participants = training.participants;
            const users = await User.find({ _id: { $in: participants } });
            totalParticipants += users.length;

            const trainInfo = `📅 ${training.date} о ${training.time}, 📍 ${training.location}\n`;
            console.log(`Reminding for: ${trainInfo}`);
            let successCount = 0;

            for (const u of users) {
                // Use username or telegramId as fallback if name is not available
                const name = u.fullName || u.username || `User ${u.telegramId}`;
                const message = `Привіт ${name}! Сьогодні тренування 💪\n${trainInfo}`;
                try {
                    await bot.telegram.sendMessage(u.telegramId, message);
                    successCount++;
                } catch (err) {
                    if (err.code === 403 || err.description?.includes('chat not found') || err.description?.includes('bot was blocked')) {
                        console.warn(`Failed to send morning reminder to ${u.telegramId} (${name}): User blocked or chat not found.`);
                    } else {
                        console.error(`Failed sending morning reminder to ${u.telegramId} (${name}):`, err);
                    }
                }
            }
            totalParticipantsNotified += successCount;
            console.log(`Notified ${successCount} of ${users.length} participants for training at ${training.time}.`);
        }
        console.log(`Total morning reminders sent: ${totalParticipantsNotified}/${totalParticipants} for ${formattedDate}.`);

    } catch (err){
        console.error('Failed sending morning reminders:', err);
    }
}

async function scheduleWorkoutAnnouncement() {
    console.log('Running scheduled job: scheduleWorkoutAnnouncement (18:02)');
    await sendDailyRemindFirst();
}

async function scheduleEveningGroupReminder() {
    console.log('Running scheduled job: scheduleEveningGroupReminder (21:00)');
    await sendDailyRemindSecond();
}

async function scheduleMorningUserReminder() {
    console.log('Running scheduled job: scheduleMorningUserReminder (06:00)');
    await sendDailyRemindMorning();
}


async function scheduleReminders() {

    cron.schedule('0 21 * * *', scheduleEveningGroupReminder, {
        scheduled: true,
        timezone: 'Europe/Kiev'
    });


    cron.schedule('0 6 * * *', scheduleMorningUserReminder, {
        scheduled: true,
        timezone: 'Europe/Kiev'
    });


    cron.schedule('2 18 * * *', scheduleWorkoutAnnouncement, {
        scheduled: true,
        timezone: 'Europe/Kiev'
    });

    console.log('Cron jobs scheduled: Workout Announcement (18:02), Evening Group Reminder (21:00), Morning User Reminder (06:00)');
}

module.exports = scheduleReminders;