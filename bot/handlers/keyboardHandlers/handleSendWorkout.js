const {getOrCreateUser} = require("../../middlewares/auth");
const Training = require("../../../models/training");
const {Markup} = require("telegraf");

async function handleSendWorkout (ctx) {
    const today = new Date();
    today.setDate(today.getDate() +1);
    const formattedDate = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
    console.log('Sending workout for:', formattedDate);
    const user = await getOrCreateUser(ctx);
    console.log(user.username);
    const threadId = Number(process.env.GROUP_CHAT_THREAD_TRAINING);

    try {
        const nextTraining = await Training.findOne({ date: formattedDate });
        if (!nextTraining) {
            return ctx.reply('Нет запланированных тренировок.');
        }

        const { date, time, location } = nextTraining;

        await bot.telegram.sendMessage(
            process.env.GROUP_CHAT_ID,
            `Тренировка ${date} ${time} ${location}`,
            {
                message_thread_id: threadId,
                reply_markup: Markup.inlineKeyboard([
                    Markup.button.callback("+", `go_${nextTraining._id}`),
                    Markup.button.callback("-", `notgo_${nextTraining._id}`)
                ]).reply_markup
            }
        );
        ctx.reply('Сообщение о тренировке отправлено в группу.');
    } catch (err) {
        console.error('Failed to send workout:', err);
        ctx.reply('Произошла ошибка.');
    }
}

module.exports = handleSendWorkout;