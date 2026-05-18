const User = require('../../models/user');

// Get rank based on number of Pixels
function getRank(pixels) {
    if (pixels < 10) return "Райдер-Початківець";
    if (pixels < 30) return "Впевнений Райдер";
    if (pixels < 60) return "Піксель-Гонщик";
    if (pixels < 100) return "Майстер Пікселів";
    return "Еліта Аркадії";
}

// Award pixels and check for level up
async function awardPixels(user, amount, telegram, telegramId) {
    const oldRank = getRank(user.pixels || 0);
    user.pixels = (user.pixels || 0) + amount;
    const newRank = getRank(user.pixels);

    await user.save();

    // Notify user about points earned
    if (telegram && telegramId) {
        try {
            await telegram.sendMessage(telegramId, 
                `🎉 Ви отримали +${amount} Пікселів! Усього: ${user.pixels} Пікселів.`
            );
            // Notify if rank changed
            if (oldRank !== newRank) {
                await telegram.sendMessage(telegramId, 
                    `🏆 Вітаємо! Ваш статус підвищено! Новий ранг: *${newRank}*!`,
                    { parse_mode: 'Markdown' }
                );
            }
        } catch (err) {
            console.error(`Failed notify user ${telegramId} about pixels:`, err);
        }
    }
}

module.exports = {
    getRank,
    awardPixels
};
