const Training = require('../../../models/training.js');
const {formatDates} = require("../../utils/dateUtils");
const {getText} = require("../../../locales");

async function handleListTrainings (ctx){

    const now = new Date();
    const today = formatDates(now);
    const tomorrowDay = new Date(now);
    tomorrowDay.setDate(tomorrowDay.getDate() + 1);
    const tomorrow = formatDates(tomorrowDay);

    console.log(today)
    console.log(tomorrow)
    try {
        // Translate the informational text block
        const trainingInfo = getText('scheduleInfoPlaceholder')
        await ctx.reply(trainingInfo);

        // Fetch trainings from today onwards, sorted by date and time
        const allFutureTrainings = await Training.find({ date: { $gte: today } }).sort({ date: 1, time: 1 });

        const todayTrainings = allFutureTrainings.filter(training => training.date === today);
        const tomorrowTrainings = allFutureTrainings.filter(training => training.date === tomorrow);

        if (todayTrainings.length === 0 && tomorrowTrainings.length === 0) {
            ctx.reply('Немає запланованих тренувань.');
        }

        let message = 'Заплановані тренування.';
        if (todayTrainings.length > 0) {
            message += '\nСьогодні:\n';
            todayTrainings.forEach(t => {
                message += `📅 ${t.date} о ${t.time}, 📍 ${t.location}\n`;
            });
        }
        if (tomorrowTrainings.length > 0) {
            message += '\nЗавтра:\n';
            tomorrowTrainings.forEach(t => {
                message += `📅 ${t.date} о ${t.time}, 📍 ${t.location}\n`;
            });
        }

        await ctx.reply(message);

    } catch (err){
        console.error('failed fetching training list'); // Keep English log
        console.log(err);
        await ctx.reply('Сталася помилка при отриманні списку тренувань.'); // Add user-facing error
    }
};
module.exports = handleListTrainings;