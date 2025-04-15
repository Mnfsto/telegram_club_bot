const User = require("../../../models/user");


async function handleRank(ctx) {
    try {

        const conditions = `
📈 Рейтинг Arcadia Cycling Club
- За каждое посещение тренировки вы получаете 1 пиксель
- Пиксели можно обменять на мерч
- Чем больше тренировок, тем выше ваш рейтинг

Топ пользователей по пикселям
`;


        const users = await User.find({ pixels: { $gt: 0 } })
            .sort({ pixels: -1 })
            .limit(10);

        if (!users.length) {
            return ctx.reply(`${conditions}Пока никто не заработал пиксели. Посещайте тренировки!`, { parse_mode: 'Markdown' });
        }

        // Формируем таблицу рейтинга
        const rankingTable = users.map((user, index) => {
            const position = index + 1;
            return `${position}. ${user.username || user.telegramId} — ${user.pixels} пикселей`;
        }).join('\n');


        const fullMessage = `${conditions}${rankingTable}`;
        console.log('Sending message:', fullMessage);

        return ctx.reply(
            fullMessage
        );
    } catch (err) {
        console.error('Failed to fetch ranking:', err);
        ctx.reply('Произошла ошибка при загрузке рейтинга.');
    }
}

module.exports = handleRank;