const User = require("../../../models/user");
const {Telegraf} = require("telegraf");
const bot = new Telegraf(process.env.BOT_TOKEN);

async function handleRank(ctx) {
    try {
        // Условия рейтинга
        const conditions = `
📈 Рейтинг Arcadia Cycling Club
- За каждое посещение тренировки вы получаете 1 пиксель
- Пиксели можно обменять на мерч
- Чем больше тренировок, тем выше ваш рейтинг

Топ пользователей по пикселям
`;

        // Получаем всех пользователей, отсортированных по убыванию пикселей
        const users = await User.find({ pixels: { $gt: 0 } }) // Только с пикселями > 0
            .sort({ pixels: -1 }) // Сортировка по убыванию
            .limit(10); // Топ-10 (можно изменить)

        if (!users.length) {
            return ctx.reply(`${conditions}Пока никто не заработал пиксели. Посещайте тренировки!`, { parse_mode: 'Markdown' });
        }

        // Формируем таблицу рейтинга
        const rankingTable = users.map((user, index) => {
            const position = index + 1;
            return `${position}. ${user.username || user.telegramId} — ${user.pixels} пикселей`;
        }).join('\n');

        // Полный текст сообщения
        const fullMessage = `${conditions}${rankingTable}`;
        console.log('Sending message:', fullMessage); // Для отладки

        await bot.telegram.sendMessage(
            ctx.chat.id, // Отправляем в текущий чат
            fullMessage
        );
    } catch (err) {
        console.error('Failed to fetch ranking:', err);
        ctx.reply('Произошла ошибка при загрузке рейтинга.');
    }
}

module.exports = handleRank;