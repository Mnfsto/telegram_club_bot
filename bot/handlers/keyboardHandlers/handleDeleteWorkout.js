const {Markup} = require("telegraf");
const Training = require("../../../models/training");
const {parseDate} = require("../../utils/dateUtils");

const keyboardDeleteWorkout = Markup.inlineKeyboard([

        [Markup.button.callback("Remove Tomarrow I❤️A 7:00", "delTomarrow7")],
        [Markup.button.callback("Remove Tomarrow I❤️A 8:00", "delTomarrow8")],
        [Markup.button.callback("Remove Tomarrow I❤️A 10:00", "delTomarrow10")],
        [Markup.button.callback("Remove Tomarrow 🐽 8:00", "delHeel8")],
        [Markup.button.callback("Remove Tomarrow 🐽 10:00", "delHeel0")],
        [Markup.button.callback("Remove Tomarrow Coffe 18:00", "delCoffe18")],
        [Markup.button.callback("Remove All Workout", "delAllWorkout")],
    ]
);


async function handleDeleteWorkout(ctx) {
    ctx.reply(
        "Чтобы удалить тренировку /removetraining ДД.ММ.ГГГГ ЧЧ:ММ Место",
        keyboardDeleteWorkout,
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
}

module.exports = handleDeleteWorkout;