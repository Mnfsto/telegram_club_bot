const Training = require("../../../models/training");
const {Markup} = require("telegraf");

async function handleShare (ctx) {
    const today = new Date();
    today.setDate(today.getDate());
    const formattedDate = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;

    const nextTraining = await Training.findOne({ date: formattedDate });
    if (!nextTraining) {
        return ctx.reply('Тренировка не найдена.');
    }

    const shareText = `Присоединяйся к тренировке!\n📅 ${nextTraining.date} в ${nextTraining.time}\n📍 ${nextTraining.location}\nУзнай подробности у бота!`;

    const botUsername = '@PixelCoachBot';
    const shareLink = `https://t.me/${botUsername}?start=training_${nextTraining._id}`;


    await ctx.reply(
        `${shareText}\n\nПригласи друзей по ссылке ниже:`,
        Markup.inlineKeyboard([
            Markup.button.switchToChat('Поделиться', `${shareText}\n${shareLink}`)
        ])
    );
}

module.exports = handleShare;