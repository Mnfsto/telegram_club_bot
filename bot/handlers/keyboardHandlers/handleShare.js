const Training = require("../../../models/training");
const {Markup} = require("telegraf");

async function handleShare (ctx) {
    const today = new Date();
    today.setDate(today.getDate()+1);
    const formattedDate = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;

    const nextTraining = await Training.findOne({ date: formattedDate });
    if (!nextTraining) {

        return ctx.reply('Тренування не знайдено.');
    }


    const locationText = nextTraining.location || 'Місце не вказано';


    const shareText = `Приєднуйся до тренування!\n📅 ${nextTraining.date} о ${nextTraining.time}\n📍 ${locationText}\nДізнайся подробиці у бота!`;

    const botUsername = process.env.BOT_USERNAME || '@PixelCoachBot';
    const shareLink = `https://t.me/${botUsername}?start=training_${nextTraining._id}`;


    await ctx.reply(
        `${shareText}\n\nЗапроси друзів за посиланням нижче:`,
        Markup.inlineKeyboard([
            Markup.button.switchToChat('Поділитись', `${shareText}\n${shareLink}`)
        ])
    );
}

module.exports = handleShare;