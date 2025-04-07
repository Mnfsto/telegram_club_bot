const Training = require("../../../models/training");
const {parseDate} = require("../../utils/dateUtils");
const User = require("../../../models/user");

async function handleCheckIt (ctx) {
    const today = new Date();
    const formattedDate =`${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
    try {

        const trainings = await Training.find({ date: { $gte: formattedDate } }).sort({ date: 1 });
        const nextTrainings = trainings.filter(training => {
            const trainingDate = parseDate(training.date);
            return trainingDate >= today;
        });
        if (!trainings) return ctx.reply('Нет запланированных тренировок.');
        let message = '';
        let groupSize = 0;
        for (const training of nextTrainings) {
            const listParticipants = training.participants;
            const participants = await User.find({ _id: { $in: listParticipants } });

            // Формируем список участников для текущей тренировки
            const participantList = participants.length
                ? participants.map((user, index) => `${index + 1}. @${user.username}`).join('\n')
                : 'Нет участников';
            groupSize +=1;
            message += `📅 *${training.date} в ${training.time}* (${training.location || 'Место не указано'}):\n${participantList}\n\n`;
        }
        if(!groupSize) return message = 'Нет участников';
        // Отправляем сообщение со списком
        ctx.reply(message);
    } catch (err) {
        console.error('failed checkin training');
        console.log(err);
    }

}

module.exports = handleCheckIt;