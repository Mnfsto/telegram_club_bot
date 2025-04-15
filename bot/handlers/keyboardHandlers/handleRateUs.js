const {Markup, Telegraf} = require("telegraf");
const {bot} = require('../../../bot');

async function handleRateUs (ctx) {

    try {
        return ctx.reply(
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