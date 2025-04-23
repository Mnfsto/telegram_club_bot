const User = require("../../models/user");
const Training = require('../../models/training');
 async function checkInCommand (ctx) {
    try {
        const args = ctx.message.text.split(' ').slice(1); // Убираем "/checkin"
        if (args.length < 3) {
            return ctx.reply('Використовуйте: /checkin DD.MM.YYYY HH:MM @username');
        }

        const [date, time, username] = args;
        console.log(`Перевірка: ${date} ${time} ${username}`);


        if (!/^\d{2}\.\d{2}\.\d{4}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
            return ctx.reply('Неправильний формат дати або часу. Приклад: /checkin 28.03.2025 08:00 @username');
        }


        const cleanUsername = username.startsWith('@') ? username.slice(1) : username;


        const user = await User.findOne({ username: cleanUsername });
        if (!user) {
            return ctx.reply(`Користувач ${username} не знайдено.`);
        }


        const training = await Training.findOne({ date, time });
        if (!training) {
            return ctx.reply(`Тренування ${date} в ${time} не знайдено.`);
        }


        const userId = user._id;
        if (training.participants.some(id => id.equals(userId))) {
            return ctx.reply(`${username} вже відзначений на цьому тренуванні!`);
        }


        training.participants.push(userId);
        await training.save();

        ctx.reply(`✅ ${username} відзначений на тренуванні ${date} в ${time}.`);
    } catch (err) {
        console.error('Failed checkin:', err);
        ctx.reply('Сталася помилка під час відмітки відвідуваності.');
    }
};

module.exports = checkInCommand;
