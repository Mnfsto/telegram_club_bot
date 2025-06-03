const {Markup} = require("telegraf");
const Training = require("../../../models/training");
const {parseDate, formatDates} = require("../../utils/dateUtils");

const keyboardDeleteWorkout = Markup.inlineKeyboard([
    [Markup.button.callback("Видалити Завтра Ланж. 09:00", "delLanzh_09"), Markup.button.callback("Видалити Завтра Ланж. 10:00", "delLanzh_10")],
    [Markup.button.callback("Видалити Завтра Ланж. 12:00", "delLanzh_12"), Markup.button.callback("Видалити Завтра Ланж. 13:00", "delLanzh_13")],
    [Markup.button.callback("Видалити Завтра Ланж. 15:00", "delLanzh_15")],
    [Markup.button.callback("Видалити Всі Тренування", "delAllWorkout")],
]);r

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
