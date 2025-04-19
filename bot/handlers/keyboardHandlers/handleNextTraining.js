const Training = require("../../../models/training");
const {parseDate} = require("../../utils/dateUtils");


async function handleNextTraining (ctx) {
    const today = new Date();
    today.setDate(today.getDate());
    const formattedDate = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
    try {
        const trainings = await Training.find({ date: { $gte: formattedDate } }).sort({ date: 1 });
        const nextTrainings = trainings.filter(training => {
            const trainingDate = training.date;
            return trainingDate <= formattedDate;
        });
        if (!nextTrainings.length) return ctx.reply('Нет запланированных тренировок.');

        let message = 'Расписание тренировок:\n';
        nextTrainings.forEach(t => {
            message += `📅 ${t.date} в ${t.time}, 📍 ${t.location}\n`;
        });
        ctx.reply(message);
    } catch (err){
        console.error('failed checkin training');
        console.log(err);
    }
}

module.exports = handleNextTraining;