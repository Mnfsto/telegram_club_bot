const {getOrCreateUser} = require("../../middlewares/auth");
const Training = require("../../../models/training");
const {Markup} = require("telegraf");
const { formatDates } = require("../../utils/dateUtils");

module.exports = function(bot) {
    return async function handleSendWorkout (ctx) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const formattedDate = formatDates ? formatDates(tomorrow) : `${tomorrow.getDate().toString().padStart(2, '0')}.${(tomorrow.getMonth() + 1).toString().padStart(2, '0')}.${tomorrow.getFullYear()}`;

        console.log('Sending workout for:', formattedDate);
        const user = await getOrCreateUser(ctx);
        console.log(user.username);
        const threadId = Number(process.env.GROUP_CHAT_THREAD_TRAINING);

        try {

            const trainingsTomorrow = await Training.find({ date: formattedDate }).sort({ time: 1 });

            if (!trainingsTomorrow || trainingsTomorrow.length === 0) {
                return ctx.reply('Немає запланованих тренувань на завтра.');
            }

            for (const training of trainingsTomorrow) {
                const { date, time, location, _id } = training;

                await bot.telegram.sendMessage(
                    process.env.GROUP_CHAT_ID,
                    `Тренування ${date} о ${time} ${location}`,
                    {
                        message_thread_id: threadId,
                        reply_markup: Markup.inlineKeyboard([
                            Markup.button.callback("+", `go_${_id}`),
                            Markup.button.callback("-", `notgo_${_id}`)
                        ]).reply_markup
                    }
                );
            }


            ctx.reply(`Повідомлення про тренування (${trainingsTomorrow.length} шт.) на ${formattedDate} відправлено в групу.`);

        } catch (err) {
            console.error('Failed to send workout:', err);
            ctx.reply('Сталася помилка.');
        }
    }};