require('dotenv').config();
const mongoose = require('mongoose')
const { Markup } = require('telegraf');
const http = require('http')
const {bot} = require('./bot')
const PORT = process.env.PORT || 8088;
const cron = require('node-cron')
const {get} = require("mongoose");
console.log(`PORT: ${PORT}`);
//Application server settings
const setupApiServer = require('./api/server.js');



//Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {useNewUrlParser: true, useUnifiedTopology: true})
    .then(() => {console.log('Connected to MongoDB...!')})
    .catch(err => console.error('Could not connect to MongoDB',err));

const Training = require('./models/training.js')//Training model
const User = require('./models/user.js') //User Model



// Проверка тренировок

cron.schedule('2 18 * * *',async (ctx) => {
    const today = new Date();
    today.setDate(today.getDate() +1);
    const formattedDate = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
    console.log('Sending workout for:', formattedDate);

    const threadId = Number(process.env.GROUP_CHAT_THREAD_TRAINING);

    try {
        const nextTraining = await Training.findOne({ date: formattedDate });
        if (!nextTraining) {
            ctx.reply('Нет запланированных тренировок.');
        }

        const { date, time, location } = nextTraining;

        await bot.telegram.sendMessage(
            process.env.GROUP_CHAT_ID,
            `Тренировка ${date} ${time} ${location}`,
            {
                message_thread_id: threadId,
                reply_markup: Markup.inlineKeyboard([
                    Markup.button.callback("+", `go_${nextTraining._id}`),
                    Markup.button.callback("-", `notgo_${nextTraining._id}`)
                ]).reply_markup
            }
        );
    } catch (err){
        console.error('failed checkin training');
        console.log(err);
    }
});


// Автоматические напоминания за 1 день до тренировки
cron.schedule('0 21 * * *', async () => {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    const formattedDate = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
    try {
        const trainings = await Training.find({date: formattedDate});
        if (trainings.length) {
            trainings.forEach(training => {
                bot.telegram.sendMessage(process.env.GROUP_CHAT_ID, `Напоминание о тренировке! 📅 ${training.date} в ${training.time}, 📍 ${training.location}`,  { message_thread_id: process.env.GROUP_CHAT_THREAD_TRAINING });
            });
        }
    } catch (err){
            console.error('failed checkin training');
            console.log(err);
        }
});

cron.schedule('0 6 * * *', async ctx => {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    const formattedDate = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
    const nextTraining = await Training.findOne({date: formattedDate});
    const participants = nextTraining.participants;
    const user = await User.find({ _id: { $in: participants } });
    console.log(user);
    console.log(participants);
    try {

        console.log("Рассылаю тренировки пользователям", formattedDate);
        const train = `📅 ${nextTraining.date} в ${nextTraining.time}, 📍 ${nextTraining.location}\n`;
        console.log(train);
        user.forEach(u => {
            let message = `Привет ${u.name}! Сегодня тренировка 💪 \n`;
            message += train;
            bot.telegram.sendMessage(u.telegramId, message)
        });
    } catch (err){
        console.error('failed checkin training');
        console.log(err);
    }

})

// Start Server

const appServer = setupApiServer(bot);

const botServer = http.createServer(appServer)
botServer.listen(PORT, () => {
    console.log(`Bot server started on ${PORT}!`);
});

bot.launch().then(() => {
    console.log(`Telegram Bot @${bot.botInfo.username} started successfully!`);
}).catch(err => {
    console.error("Failed to launch Telegram Bot:", err);
    process.exit(1);
});

// Close Server
process.on("SIGINT", async () => {
    //await client.close();
    console.log("Приложение завершило работу");
    process.exit();
})