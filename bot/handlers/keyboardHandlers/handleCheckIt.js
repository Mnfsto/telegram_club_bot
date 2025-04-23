const Training = require("../../../models/training");
const {parseDate, formatDates} = require("../../utils/dateUtils");
const User = require("../../../models/user");

async function handleCheckIt (ctx) {
    const today = new Date();
    const formattedDate = formatDates ? formatDates(today) : `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;

    try {
        const trainingsToday = await Training.find({ date: formattedDate }).sort({ time: 1 });

        console.log(trainingsToday);

        if (!trainingsToday || trainingsToday.length === 0) {
            return ctx.reply('Немає запланованих тренувань на сьогодні.');
        }

        let message = '';
        let groupSize = 0;
        for (const training of trainingsToday) {
            const listParticipants = training.participants;
            const participants = await User.find({ _id: { $in: listParticipants } });
            const participantList = participants.length
                ? participants.map((user, index) => `${index + 1}. @${user.username}`).join('\n')
                : 'Немає учасників';
            groupSize += 1;
            message += `📅 *${training.date} о ${training.time}* (${training.location || 'Місце не вказано'}):\n${participantList}\n\n`;
        }
        groupSize === 0 ? message = 'Немає учасників' : message;

        ctx.reply(message, { parse_mode: 'Markdown' });

    } catch (err) {
        console.error('failed checkin training');
        console.log(err);
        ctx.reply('Сталася помилка під час перевірки учасників тренувань.');
    }
}

module.exports = handleCheckIt;