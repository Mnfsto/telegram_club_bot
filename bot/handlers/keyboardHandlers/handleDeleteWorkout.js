const {Markup} = require("telegraf");
const Training = require("../../../models/training");
const {parseDate, formatDates} = require("../../utils/dateUtils");

const keyboardDeleteWorkout = Markup.inlineKeyboard([
    [Markup.button.callback("Ланжерон 🌊 10:00", "del_l_10"), Markup.button.callback("11:00", "del_l_11"), Markup.button.callback("12:00", "del_l_12")],
    [Markup.button.callback("Санаторій-Аркадія 🏥 10:00", "del_s_10"), Markup.button.callback("11:00", "del_s_11"), Markup.button.callback("12:00", "del_s_12")],
    [Markup.button.callback("ТЗ-Аркадія 🏃‍♂️ 07:00", "del_tz_07"), Markup.button.callback("08:00", "del_tz_08"), Markup.button.callback("09:00", "del_tz_09")],
    [Markup.button.callback("411-Батарея ⚔️ 17:00", "del_411_17"), Markup.button.callback("18:00", "del_411_18")],
    [Markup.button.callback("🗑️ Видалити Всі Тренування", "delAllWorkout")],
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
