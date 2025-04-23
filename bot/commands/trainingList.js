const Training = require('../../models/training');
const {parseDate, formatDates} = require("../utils/dateUtils");

async function trainingListCommand (ctx){

    const now = new Date();
    const today = formatDates(now);
    const tomorrowDay = new Date(now); // Create a new Date object for tomorrow
    tomorrowDay.setDate(tomorrowDay.getDate() + 1);
    const tomorrow = formatDates(tomorrowDay);

    console.log(today)
    console.log(tomorrow)
    try {
        // Find trainings starting from today onwards
        const trainingsFromToday = await Training.find({ date: { $gte: today } }).sort({ date: 1, time: 1 }); // Sort by date and time

        // Filter for today's trainings
        const nextTrainings = trainingsFromToday.filter(training => training.date === today);

        // Filter for tomorrow's trainings
        const nextTrainingsTomorrow = trainingsFromToday.filter(training => training.date === tomorrow);

        // Check if there are no trainings for today or tomorrow
        if (nextTrainings.length === 0 && nextTrainingsTomorrow.length === 0) {
            return ctx.reply('Немає запланованих тренувань.'); // Translation
        }

        let message = 'Розклад тренувань:\n'; // Translation
        if (nextTrainings.length > 0) {
            message += '\nСьогодні:\n'; // Add header for today
            nextTrainings.forEach(t => {
                message += `📅 ${t.date} о ${t.time}, 📍 ${t.location}\n`; // Translation: 'в' -> 'о'
            });
        }

        if (nextTrainingsTomorrow.length > 0) {
            message += '\nЗавтра:\n'; // Add header for tomorrow
            nextTrainingsTomorrow.forEach(t => {
                message += `📅 ${t.date} о ${t.time}, 📍 ${t.location}\n`; // Translation: 'в' -> 'о'
            });
        }

        // Send the compiled message
        ctx.reply(message);

    } catch (err){
        console.error('failed checkin training'); // Keep English log
        console.log(err);
        ctx.reply('Сталася помилка під час отримання розкладу тренувань.'); // Add user-facing error message in Ukrainian
    }
};

module.exports = trainingListCommand;