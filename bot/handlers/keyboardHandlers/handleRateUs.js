const {Markup, Telegraf} = require("telegraf");
const { getText } =  require('../../../locales');

async function handleRateUs (ctx) {
    const message = getText('rateUsMessage');
    const buttonText = getText('rateUsInstagramButton');
    const instagramUrl = getText('instagramLink');
    try {
        return ctx.reply(message, {

            reply_markup: Markup.inlineKeyboard([
                Markup.button.url(buttonText, instagramUrl)
            ]).reply_markup
            }
        );
    } catch (err) {
        console.error('Failed to send rate message:', err);
        ctx.reply('Сталася помилка.');
    }
}

module.exports = handleRateUs;
