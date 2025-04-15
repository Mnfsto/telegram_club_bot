const Training = require('../../models/training');

async function addTrainingCommand(ctx){
    const [_, date, time, ...locationArr] = ctx.message.text.split(' ');
    const location = locationArr.join(' ');
    if (!date || !time || !location) return ctx.reply('Использование: /addtraining ДД.ММ.ГГГГ ЧЧ:ММ Место');
    try {
        const newTraining = new Training({date, time, location, participants: []});
        await newTraining.save();
        ctx.reply(`Тренировка добавлена: ${date} в ${time} Локация ${location}`);
    }  catch (err){
        console.error('failed add training');
        console.log(err);
    }
};

module.exports = addTrainingCommand;