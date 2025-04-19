const User = require("../../models/user");



async function checkOutCommand  (ctx) {
    try {
        const args = ctx.message.text.split(' ').slice(1); // Убираем "/checkout"
        if (args.length < 3) {
            return ctx.reply('Используйте: /checkout DD.MM.YYYY HH:MM @username');
        }

        const [date, time, username] = args;
        console.log(`Проверка: ${date} ${time} ${username}`);


        if (!/^\d{2}\.\d{2}\.\d{4}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
            return ctx.reply('Неверный формат даты или времени. Пример: /checkout 28.03.2025 08:00 @username');
        }


        const cleanUsername = username.startsWith('@') ? username.slice(1) : username;


        const user = await User.findOne({ username: cleanUsername });
        if (!user) {
            return ctx.reply(`Пользователь ${username} не найден.`);
        }


        const training = await Training.findOne({ date, time });
        if (!training) {
            return ctx.reply(`Тренировка ${date} в ${time} не найдена.`);
        }

        const userId = user._id;
        const participantIndex = training.participants.findIndex(id => id.equals(userId));
        if (participantIndex === -1) {
            return ctx.reply(`${username} не отмечен на этой тренировке!`);
        }


        training.participants.splice(participantIndex, 1);
        await training.save();

        ctx.reply(`❌ ${username} удалён с тренировки ${date} в ${time}.`);
    } catch (err) {
        console.error('Failed checkout:', err);
        ctx.reply('Произошла ошибка при удалении с тренировки.');
    }
};

module.exports = {
    checkOutCommand,

}