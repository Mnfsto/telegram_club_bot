
 async function checkInCommand (ctx) {
    try {
        const args = ctx.message.text.split(' ').slice(1); // Убираем "/checkin"
        if (args.length < 3) {
            return ctx.reply('Используйте: /checkin DD.MM.YYYY HH:MM @username');
        }

        const [date, time, username] = args;
        console.log(`Проверка: ${date} ${time} ${username}`);


        if (!/^\d{2}\.\d{2}\.\d{4}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
            return ctx.reply('Неверный формат даты или времени. Пример: /checkin 28.03.2025 08:00 @username');
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
        if (training.participants.some(id => id.equals(userId))) {
            return ctx.reply(`${username} уже отмечен на этой тренировке!`);
        }


        training.participants.push(userId);
        await training.save();

        ctx.reply(`✅ ${username} отмечен на тренировке ${date} в ${time}.`);
    } catch (err) {
        console.error('Failed checkin:', err);
        ctx.reply('Произошла ошибка при отметке посещаемости.');
    }
};

module.exports = {
    checkInCommand,

}