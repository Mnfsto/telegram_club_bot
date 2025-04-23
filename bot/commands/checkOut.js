const User = require("../../models/user");
const Training = require('../../models/training');


async function checkOutCommand  (ctx) {
    try {
        const args = ctx.message.text.split(' ').slice(1);
        if (args.length < 3) {
            return ctx.reply('Використовуйте: /checkout DD.MM.YYYY HH:MM @username');
        }

        const [date, time, username] = args;
        console.log(`Перевірка: ${date} ${time} ${username}`);


        if (!/^\d{2}\.\d{2}\.\d{4}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
            return ctx.reply('Неправильний формат дати або часу. Приклад: /checkout 28.03.2025 08:00 @username');
        }


        const cleanUsername = username.startsWith('@') ? username.slice(1) : username;


        const user = await User.findOne({ username: cleanUsername });
        if (!user) {
            return ctx.reply(`Користувач ${username} не знайдений.`);
        }


        const training = await Training.findOne({ date, time });
        if (!training) {
            return ctx.reply(`Тренування ${date} о ${time} не знайдено.`);
        }

        const userId = user._id;
        const participantIndex = training.participants.findIndex(id => id.equals(userId));
        if (participantIndex === -1) {
            return ctx.reply(`${username} не відмічений на цьому тренуванні!`);
        }


        training.participants.splice(participantIndex, 1);
        await training.save();

        ctx.reply(`❌ ${username} видалений з тренування ${date} о ${time}.`);
    } catch (err) {
        console.error('Failed checkout:', err);
        ctx.reply('Сталася помилка під час видалення з тренування.');
    }
};

module.exports = checkOutCommand;
