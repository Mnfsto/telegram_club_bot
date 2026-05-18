const User = require("../../../models/user");
const {getText} = require("../../../locales");


async function handleRank(ctx) {
    try {
        const conditions = getText('rankHeaderText');


        const users = await User.find({ pixels: { $gt: 0 } })
            .sort({ pixels: -1 })
            .limit(10);

        if (!users.length) {
            return ctx.reply(`${conditions}Поки що ніхто не заробив пікселі. Відвідуйте тренування!`, { parse_mode: 'Markdown' });
        }

        const rankingTable = users.map((user, index) => {
            const position = index + 1;
            return `${position}. ${user.username || user.telegramId} — ${user.pixels} пікселів`;
        }).join('\n');


        const fullMessage = `${conditions}${rankingTable}`;
        console.log('Sending message:', fullMessage);

        return ctx.reply(
            fullMessage
        );
    } catch (err) {
        console.error('Failed to fetch ranking:', err);
        ctx.reply('Сталася помилка під час завантаження рейтингу.');
    }
}

module.exports = handleRank;