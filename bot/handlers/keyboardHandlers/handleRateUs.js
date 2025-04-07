const {Markup, Telegraf} = require("telegraf");
const bot = new Telegraf(process.env.BOT_TOKEN);

async function handleRateUs (ctx) {
    const threadId = Number(process.env.GROUP_CHAT_THREAD_TRAINING);

    try {
        await bot.telegram.sendMessage(
            ctx.chat.id, // Отправляем в группу или личку
            `Поддержите Arcadia Cycling Club!\n` +
            `Оставьте комментарий, поставьте лайк и поделитесь с друзьями на нашей странице:\n` +
            `https://www.instagram.com/arcadia_cycling_club`, {
                reply_markup: Markup.inlineKeyboard([
                    Markup.button.url('Открыть Instagram', 'https://www.instagram.com/arcadia_cycling_club')
                ]).reply_markup
            }
        );
    } catch (err) {
        console.error('Failed to send rate message:', err);
        ctx.reply('Произошла ошибка.');
    }
}

module.exports = handleRateUs;