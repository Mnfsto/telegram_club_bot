const {Markup} = require("telegraf");
const Training = require('../../../models/training');
const {parseDate} = require("../../utils/dateUtils");

const keyboardAddWorkout = Markup.inlineKeyboard([

    [Markup.button.callback("Add Tomarrow I❤️A 7:00", "addTomarrow7")],
    [Markup.button.callback("Add Tomarrow I❤️A 8:00", "addTomarrow8")],
    [Markup.button.callback("Add Tomarrow I❤️A 10:00", "addTomarrow10")],
    [Markup.button.callback("Add Tomarrow 🐽 8:00", "addHeel8")],
    [Markup.button.callback("Add Tomarrow 🐽 10:00", "addHeel10")],
    [Markup.button.callback("Add Tomarrow Coffe 18:00", "addCoffe18")],
    [Markup.button.callback("Custom Workout", "customWorkout")],

]);

async function handleAddWorkout (ctx){
    ctx.reply(
        "Чтобы добавить тренировку /addtraining ДД.ММ.ГГГГ ЧЧ:ММ Место",
        keyboardAddWorkout,
    );

    const today = new Date();
    const formattedDate =`${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
    try {
        const trainings = await Training.find({ date: { $gte: formattedDate } }).sort({ date: 1 });
        const nextTrainings = trainings.filter(training => {
            const trainingDate = parseDate(training.date);
            return trainingDate >= today;
        });
        if (!trainings.length) return ctx.reply('Нет запланированных тренировок.');

        let message = 'Расписание тренировок на завтра:\n';
        nextTrainings.forEach(t => {
            message += `📅 ${t.date} в ${t.time}, 📍 ${t.location}\n`;
        });
        ctx.reply(message);
    } catch (err){
        console.error('failed checkin training');
        console.log(err);
    }
};

module.exports = handleAddWorkout;