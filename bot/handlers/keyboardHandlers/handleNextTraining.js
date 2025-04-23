const Training = require("../../../models/training");
const {parseDate, formatDates} = require("../../utils/dateUtils");

async function handleNextTraining (ctx) {
    const now = new Date();
    const today = formatDates(now);
    const tomorrowDay = new Date(now); // Create a new date object
    tomorrowDay.setDate(tomorrowDay.getDate() + 1);
    const tomorrow = formatDates(tomorrowDay);

    try {

        const allFutureTrainings = await Training.find({ date: { $gte: today } }).sort({ date: 1, time: 1 });

        const trainingsToday = allFutureTrainings.filter(training => training.date === today);
        const tomorrowTrainings = allFutureTrainings.filter(training => training.date === tomorrow);

        if (!trainingsToday || trainingsToday.length === 0) {
             ctx.reply('Немає запланованих тренувань на сьогодні.');
        }

        let message = 'Розклад тренувань на сьогодні:\n';
        trainingsToday.forEach(t => {
            message += `📅 ${t.date} о ${t.time}, 📍 ${t.location}\n`;
        });

        console.log(tomorrowTrainings)
        if (tomorrowTrainings.length > 0) {
            message = '\nЗавтра:\n';
            tomorrowTrainings.forEach(t => {
                 message += `📅 ${t.date} о ${t.time}, 📍 ${t.location}\n`;
            });
        } else {
            return message = `Немає запланованих тренувань на завтра`;
        }
        ctx.reply(message);
    } catch (err){
        console.error('failed checkin training');
        console.log(err);
        ctx.reply('Сталася помилка під час отримання інформації про наступні тренування.');
    }
}

module.exports = handleNextTraining;