const {Markup} = require("telegraf");
const Training = require('../../../models/training');
const {parseDate, formatDates} = require("../../utils/dateUtils"); // Assuming formatDates exists from previous examples

const keyboardAddWorkout = Markup.inlineKeyboard([
    [Markup.button.callback("Ланжерон 🌊 10:00", "add_l_10"), Markup.button.callback("11:00", "add_l_11"), Markup.button.callback("12:00", "add_l_12")],
    [Markup.button.callback("Санаторій-Аркадія 🏥 10:00", "add_s_10"), Markup.button.callback("11:00", "add_s_11"), Markup.button.callback("12:00", "add_s_12")],
    [Markup.button.callback("ТЗ-Аркадія 🏃‍♂️ 07:00", "add_tz_07"), Markup.button.callback("08:00", "add_tz_08"), Markup.button.callback("09:00", "add_tz_09")],
    [Markup.button.callback("411-Батарея ⚔️ 17:00", "add_411_17"), Markup.button.callback("18:00", "add_411_18")],
    [Markup.button.callback("➕ Додати Вручну", "customWorkout")],
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