const User = require("../../../models/user");
const { getText } =  require('../../../locales');

async function handleJoinClub (ctx) {
    const user = await User.findOne({ telegramId: ctx.from.id });
    const groupLink = process.env.GROUP_LINK;
    if (user && user.joinedClub) {
        return ctx.reply(`Ви вже у клубі! Ось посилання на групу:\n${groupLink}`);
    }
    const titlePolicy = getText('pixelFighterAgreementTitle')
    const clubPolicy = getText('pixelFighterAgreementBody')

    try {
        console.log('Відправляємо контракт з кнопками');
        await ctx.reply(clubPolicy, {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: 'Вступити', callback_data: 'join_agree' },
                        { text: 'Відмовитись', callback_data: 'join_decline' }
                    ]
                ]
            }
        });
    } catch (err) {
        console.error('Помилка під час надсилання повідомлення:', err);
        await ctx.reply('Сталася помилка. Спробуйте знову.');
    }
}

module.exports = handleJoinClub;