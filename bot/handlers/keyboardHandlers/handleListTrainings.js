const Training = require('../../../models/training.js');
const {formatDates} = require("../../utils/dateUtils");

async function handleListTrainings (ctx){

    const now = new Date();
    const today = formatDates(now);
    const tomorrowDay = now;
    tomorrowDay.setDate(tomorrowDay.getDate() +1);
    const tomorrow = formatDates(tomorrowDay);

    console.log(today)
    console.log(tomorrow)
    try {
        const trainingsToday = await Training.find({ date: { $gte: today } }).sort({ date: 1 });
        const nextTrainings = trainingsToday.filter(training => {
            const trainingDate = training.date;
            return trainingDate <= today;
        });
        const trainingTomorrow = await Training.find({ date: { $gte: tomorrow } }).sort({ date: 1 });
        const nextTrainingsTomorrow = trainingTomorrow.filter(training => {
            const trainingDate = training.date;
            return trainingDate <= tomorrow;
        });
        if (!nextTrainings.length && nextTrainingsTomorrow) return ctx.reply('Нет запланированных тренировок.');

        let message = 'Расписание тренировок:\n';
        nextTrainings.forEach(t => {
            message += `📅 ${t.date} в ${t.time}, 📍 ${t.location}\n`;
        });
        nextTrainingsTomorrow.forEach(t => {
            message += `📅 ${t.date} в ${t.time}, 📍 ${t.location}\n`;
        });
        ctx.reply(message);
    } catch (err){
        console.error('failed checkin training');
        console.log(err);
    }
};
module.exports = handleListTrainings;