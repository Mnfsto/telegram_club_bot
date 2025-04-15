const Training = require("../../../models/training");
const User = require("../../../models/user");

async function handleRemind (ctx) {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    const formattedDate = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;

    try {
        const nextTraining = await Training.findOne({date: formattedDate});
        if (nextTraining === null) return ctx.reply("Нет участников на следущую тренировку !");
        const participants = nextTraining.participants;


        const users = await User.find({ _id: { $in: participants } });
        console.log("Рассылаю тренировки пользователям", formattedDate);
        const train = `📅 ${nextTraining.date} в ${nextTraining.time}, 📍 ${nextTraining.location}\n`;
        console.log(train);
        let successCount = 0;
        for (const user of users) {
            const message = `Привет, @${user.username || user.telegramId}! Завтра тренировка 💪\n${train}`;
            try {
                await bot.telegram.sendMessage(user.telegramId, message);
                successCount++;
                console.log(`Уведомление отправлено ${user.username || user.telegramId}`);
            } catch (err) {
                console.error(`Ошибка отправки ${user.telegramId}:`, err);
            }
        }

        ctx.reply(`Уведомлено ${successCount} из ${users.length} участников.`);
    } catch (err){
        console.error('failed checkin training');
        console.log(err);
    }

}

module.exports = handleRemind;