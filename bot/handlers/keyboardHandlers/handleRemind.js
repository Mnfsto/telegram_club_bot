const Training = require("../../../models/training");
const User = require("../../../models/user");
const { formatDates } = require("../../utils/dateUtils");

module.exports = function (bot){
    return async function handleRemind (ctx) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const formattedDate = formatDates ? formatDates(tomorrow) : `${tomorrow.getDate().toString().padStart(2, '0')}.${(tomorrow.getMonth() + 1).toString().padStart(2, '0')}.${tomorrow.getFullYear()}`;

        try {

            const trainingsTomorrow = await Training.find({ date: formattedDate }).sort({ time: 1 });

            if (!trainingsTomorrow || trainingsTomorrow.length === 0) {
                return ctx.reply("Немає запланованих тренувань на завтра для надсилання нагадувань.");
            }

            let totalParticipants = 0;
            let totalSuccessCount = 0;

            console.log(`Розсилаю нагадування про тренування користувачам на ${formattedDate}`);

            for (const training of trainingsTomorrow) {
                if (!training.participants || training.participants.length === 0) {
                    console.log(`Немає учасників для тренування ${training.date} о ${training.time}.`);
                    continue;
                }

                const participants = training.participants;
                const users = await User.find({ _id: { $in: participants } });
                totalParticipants += users.length;

                const trainInfo = `📅 ${training.date} о ${training.time}, 📍 ${training.location}\n`;
                console.log(`Нагадування для: ${trainInfo}`);

                let successCount = 0;
                for (const user of users) {
                    const message = `Привіт, @${user.username || user.telegramId}! Завтра тренування 💪\n${trainInfo}`;
                    try {
                        await bot.telegram.sendMessage(user.telegramId, message);
                        successCount++;
                        console.log(`Сповіщення надіслано ${user.username || user.telegramId}`);
                    } catch (err) {

                        if (err.code === 403 || err.description.includes('chat not found') || err.description.includes('bot was blocked')) {
                            console.warn(`Не вдалося надіслати повідомлення користувачу ${user.telegramId} (${user.username || 'N/A'}): ${err.description}. Можливо, користувач заблокував бота.`);

                        } else {
                            console.error(`Помилка надсилання ${user.telegramId}:`, err);
                        }
                    }
                }
                totalSuccessCount += successCount;
                console.log(`Сповіщено ${successCount} з ${users.length} учасників для тренування ${training.time}.`);
            }

            ctx.reply(`Загалом сповіщено ${totalSuccessCount} з ${totalParticipants} учасників про тренування на ${formattedDate}.`);

        } catch (err){
            console.error('failed sending reminders');
            console.log(err);
            ctx.reply('Сталася помилка під час надсилання нагадувань.');
        }
    }
};