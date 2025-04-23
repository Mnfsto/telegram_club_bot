const {Markup} = require("telegraf");
const Training = require("../../../models/training");
const {parseDate, formatDates} = require("../../utils/dateUtils");

const keyboardDeleteWorkout = Markup.inlineKeyboard([
    [Markup.button.callback("Видалити Завтра I❤️A 7:00", "delTomarrow7")],
    [Markup.button.callback("Видалити Завтра I❤️A 8:00", "delTomarrow8")],
    [Markup.button.callback("Видалити Завтра I❤️A 10:00", "delTomarrow10")],
    [Markup.button.callback("Видалити Завтра 🐽 8:00", "delHeel8")],
    [Markup.button.callback("Видалити Завтра 🐽 10:00", "delHeel10")],
    [Markup.button.callback("Видалити Завтра Кава 18:00", "delCoffe18")],
    [Markup.button.callback("Видалити Всі Тренування", "delAllWorkout")],
]);


async function handleDeleteWorkout(ctx) {
    ctx.reply(
        "Щоб видалити тренування /removetraining ДД.ММ.РРРР ГГ:ХХ Місце",
        keyboardDeleteWorkout,
    );

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const formattedTomorrow = formatDates ? formatDates(tomorrow) : `${tomorrow.getDate().toString().padStart(2, '0')}.${(tomorrow.getMonth() + 1).toString().padStart(2, '0')}.${tomorrow.getFullYear()}`;

    try {
        const trainingsTomorrow = await Training.find({ date: formattedTomorrow }).sort({ time: 1 });

        if (!trainingsTomorrow || trainingsTomorrow.length === 0) {
            return ctx.reply('Немає запланованих тренувань на завтра.');
        }

        let message = 'Розклад тренувань на завтра:\n';
        trainingsTomorrow.forEach(t => {
            message += `📅 ${t.date} о ${t.time}, 📍 ${t.location}\n`;
        });
        ctx.reply(message);
    } catch (err){
        console.error('failed checkin training');
        console.log(err);
        ctx.reply('Сталася помилка під час відображення тренувань для видалення.');
    }
}

module.exports = handleDeleteWorkout;
