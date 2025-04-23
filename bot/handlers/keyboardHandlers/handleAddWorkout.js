const {Markup} = require("telegraf");
const Training = require('../../../models/training');
const {parseDate, formatDates} = require("../../utils/dateUtils"); // Assuming formatDates exists from previous examples

const keyboardAddWorkout = Markup.inlineKeyboard([
    [Markup.button.callback("Додати Завтра 411 Б. 18:00", "add411_18")],
    [Markup.button.callback("Додати Завтра I❤️A 10:00", "addILA_10")],
    [Markup.button.callback("Додати Завтра Ланж. 11:00", "addLanzh_11")],
    [Markup.button.callback("Додати Вручну", "customWorkout")],
]);

async function handleAddWorkout (ctx){
    ctx.reply(
        "Щоб додати тренування /addtraining ДД.ММ.РРРР ГГ:ХХ Місце",
        keyboardAddWorkout,
    );

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const formattedTomorrow = formatDates(tomorrow);

    try {

        const trainingsTomorrow = await Training.find({ date: formattedTomorrow }).sort({ time: 1 }); // Sort by time for tomorrow

        if (!trainingsTomorrow.length) {

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

        ctx.reply('Сталася помилка під час отримання розкладу тренувань.');
    }
};

module.exports = handleAddWorkout;