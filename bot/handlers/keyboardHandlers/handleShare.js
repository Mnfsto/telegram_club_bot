const Training = require("../../../models/training");
const {Markup} = require("telegraf");

async function handleShare (ctx) {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    const formattedDate = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;

    const nextTraining = await Training.findOne({ date: formattedDate });
    if (!nextTraining) {
        return ctx.reply('Тренировка не найдена.');
    }

    // Текст для шаринга
    const shareText = `Присоединяйся к тренировке!\n📅 ${nextTraining.date} в ${nextTraining.time}\n📍 ${nextTraining.location}\nУзнай подробности у бота!`;

    // Генерируем ссылку на бота с параметром
    const botUsername = '@PixelCoachBot'; // Замените на имя вашего бота (например, @MyTrainingBot)
    const shareLink = `https://t.me/${botUsername}?start=training_${nextTraining._id}`;

    // Отправляем сообщение с кнопкой "Поделиться"
    await ctx.reply(
        `${shareText}\n\nПригласи друзей по ссылке ниже:`,
        Markup.inlineKeyboard([
            Markup.button.switchToChat('Поделиться', `${shareText}\n${shareLink}`)
        ])
    );
}

module.exports = handleShare;