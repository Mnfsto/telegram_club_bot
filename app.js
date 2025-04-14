const mongoose = require('mongoose')
const { Markup,Telegraf } = require('telegraf');
const string_decoder = require("node:string_decoder");

const setupApiServer = require('./api/server.js');
const PORT = process.env.PORT || 8088;
const bot = new Telegraf(process.env.BOT_TOKEN);
const cron = require('node-cron')
const {get} = require("mongoose");
console.log(`PORT: ${PORT}`);

//Commands
const {
    startCommand,
} = require('./bot/commands')

//User Authentication
const {getOrCreateUser, checkAdmin, checkUserName, getParticipants, greetedUsers} = require('./bot/middlewares/auth.js');

// Кэш на основе Set
const actionCache = new Set(); // Хранит строки вида "telegramId_trainingId_action"

// Функция для преобразования строки "DD.MM.YYYY" в объект Date
const {parseDate} = require('./bot/utils/dateUtils.js')


//Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {useNewUrlParser: true, useUnifiedTopology: true})
    .then(() => {console.log('Connected to MongoDB...!')})
    .catch(err => console.error('Could not connect to MongoDB',err));

const Training = require('./models/training.js')//Training model
const User = require('./models/user.js') //User Model
const ApplicationMember = require('./models/application.js') //Member model









//Command /start
bot.start(startCommand);

/// User Interface
const textHandlers = require('./bot/handlers')
const http = require("node:http");
bot.on('text', textHandlers);


// Обработчик для кнопки "Согласен"
bot.action('join_agree', async (ctx) => {
    const groupLink = 'https://t.me/+XEuv4MtxymowZTJi';
    try {
        const telegramId = ctx.from.id
        const user = await User.findOne({ telegramId });
        if (!user) {
            return ctx.answerCbQuery('Пользователь не найден.');
        }

        if (user.joinedClub) {
            return ctx.answerCbQuery('Вы уже в клубе!');
        }

        user.joinedClub = true;
        await user.save();

        await bot.telegram.sendMessage(
            ctx.chat.id,
            `✅ @${ctx.from.username || ctx.from.id} вступил в клуб!`
        );
        ctx.answerCbQuery('Добро пожаловать в клуб!');
        user.joinedClub = true;
        await user.save();
        await ctx.editMessageText(
            `Отлично! Вы согласились с клубной политикой. Присоединяйтесь к нашей группе в Telegram:\n${groupLink}`
        );
    } catch (err){
        console.error('Failed Join club:', err);
        ctx.reply('Произошла ошибка.');
    }

});


// Обработчик для кнопки "Отказаться"
bot.action('join_decline', async (ctx) => {
    await ctx.editMessageText(
        'Жаль, что вы отказались. Если передумаете, просто нажмите "🚴 Join Club 🚴" снова!',
        { parse_mode: 'Markdown' }
    );
    await ctx.answerCbQuery(); // Закрываем callback
});




// Обработчик действия "notgo"
bot.action(/notgo_(.+)/,checkUserName, async (ctx) => {
    console.log('notgo pressed, trainingId:', ctx.match[1]);
    const trainingId = ctx.match[1];
    const user = await getOrCreateUser(ctx);
    console.log('notgo pressed, trainingId:', user._id);
    const threadId = Number(process.env.GROUP_CHAT_THREAD_TRAINING);
    const telegramId = ctx.from.id;
    const cacheKey = `${telegramId}_${trainingId}_go`;
    if (actionCache.has(cacheKey)) {
        return console.log(`User ${telegramId} already clicked "go" for training ${trainingId}`);
    }

    try {
        await bot.telegram.sendMessage(
            process.env.GROUP_CHAT_ID,
            `:_( @${ctx.from.username}`,
            { message_thread_id: threadId }
        );
        // Добавляем в кэш
        actionCache.add(cacheKey);
        ctx.answerCbQuery();
    } catch (err) {
        console.error('Error in notgo action:', err);
        ctx.answerCbQuery('Произошла ошибка');
    }
});

// Обработчик действия "go"
bot.action(/go_(.+)/,checkUserName, async (ctx) => {
    console.log('Go pressed, trainingId:', ctx.match[1]);
    const trainingId = ctx.match[1];
    const threadId = Number(process.env.GROUP_CHAT_THREAD_TRAINING);
    const telegramId = ctx.from.id;
    const cacheKey = `${telegramId}_${trainingId}_go`;
    if (actionCache.has(cacheKey)) {
        return console.log(`User ${telegramId} already clicked "go" for training ${trainingId}`);
    }

    try {
        const user = await getOrCreateUser(ctx); // Получаем пользователя здесь
        const nextTraining = await Training.findById(trainingId);

        if (!nextTraining) {
            await bot.telegram.sendMessage(
                process.env.GROUP_CHAT_ID,
                'Тренировка не найдена.',
                { message_thread_id: threadId }
            );
            return ctx.answerCbQuery('Тренировка не найдена');
        }

        if (!nextTraining.participants.includes(user._id)) {
            nextTraining.participants.push(user._id);
            await nextTraining.save();
            user.pixels += 1;
            await user.save();

            await bot.telegram.sendMessage(
                process.env.GROUP_CHAT_ID,
                `✅ @${ctx.from.username} отмечен на тренировке.`,
                { message_thread_id: threadId }
            );

            // Добавляем в кэш
            actionCache.add(cacheKey);
            ctx.answerCbQuery();

        }


    } catch (err) {
        console.error('Error in go action:', err);
        await bot.telegram.sendMessage(
            process.env.GROUP_CHAT_ID,
            'Произошла ошибка при записи.',
            { message_thread_id: threadId }
        );
        ctx.answerCbQuery('Произошла ошибка');
    }
});






// ACTION
//Команда для добавления тренировки на завтра 7,00
bot.action('addTomarrow7', async (ctx) => {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    const date = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
    const location = "I❤️Arcadia - ТЗ";
    const time = '07:00';
    try{
        const newTraining = new Training({date, time, location, participants: []});
        await newTraining.save();
        ctx.reply(`Добавдена новая тренировка: ${date} в ${time} Локация ${location}`);

    } catch (err){
        console.error('failed addTomarrow7');
        console.log(err);
    }
})

bot.action('addTomarrow8', async (ctx) => {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    const date = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
    const location = "I❤️Arcadia - ТЗ";
    const time = '08:00';
    try{
        const newTraining = new Training({date, time, location, participants: []});
        await newTraining.save();
        ctx.reply(`Добавдена новая тренировка: ${date} в ${time} Локация ${location}`);

    } catch (err){
        console.error('failed addTomarrow8');
        console.log(err);
    }
})

bot.action('addTomarrow10', async (ctx) => {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    const date = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
    const location = "I❤️Arcadia - ТЗ";
    const time = '10:00';
    try{
        const newTraining = new Training({date, time, location, participants: []});
        await newTraining.save();
        ctx.reply(`Добавдена новая тренировка: ${date} в ${time} Локация ${location}`);

    } catch (err){
        console.error('failed addTomarrow10');
        console.log(err);
    }
})

bot.action('addHeel10', async (ctx) => {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    const date = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
    const location = "Маршал-Пятак 🐽";
    const time = '10:00';
    try{
        const newTraining = new Training({date, time, location, participants: []});
        await newTraining.save();
        ctx.reply(`Добавдена новая тренировка: ${date} в ${time} Локация ${location}`);

    } catch (err){
        console.error('failed addHeel10');
        console.log(err);
    }
})

bot.action('addHeel8', async (ctx) => {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    const date = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
    const location = "Маршал-Пятак 🐽";
    const time = '08:00';
    try{
        const newTraining = new Training({date, time, location, participants: []});
        await newTraining.save();
        ctx.reply(`Добавдена новая тренировка: ${date} в ${time} Локация ${location}`);

    } catch (err){
        console.error('failed addHeel8');
        console.log(err);
    }
})

bot.action('addCoffe18', async (ctx) => {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    const date = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
    const location = "I❤️Arcadia - ТЗ";
    const time = '18:00';
    try{
        const newTraining = new Training({date, time, location, participants: []});
        await newTraining.save();
        ctx.reply(`Добавдена новая тренировка: ${date} в ${time} Локация ${location}`);

    } catch (err){
        console.error('failed addCoffe18');
        console.log(err);
    }
})

bot.action('customWorkout', async (ctx) => {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    const date = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
    const location = "Локация";
    const time = '08:30';
  const draftMessage = `/addtraining ${date} ${time} ${location}`
    ctx.reply( `Скопируй это:  ${draftMessage}`);

})

// Команда /checkin
bot.command('checkin', checkAdmin, async (ctx) => {
    try {
        const args = ctx.message.text.split(' ').slice(1); // Убираем "/checkin"
        if (args.length < 3) {
            return ctx.reply('Используйте: /checkin DD.MM.YYYY HH:MM @username');
        }

        const [date, time, username] = args;
        console.log(`Проверка: ${date} ${time} ${username}`);

        // Валидация формата даты и времени (простая проверка)
        if (!/^\d{2}\.\d{2}\.\d{4}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
            return ctx.reply('Неверный формат даты или времени. Пример: /checkin 28.03.2025 08:00 @username');
        }

        // Убираем @ из username, если есть
        const cleanUsername = username.startsWith('@') ? username.slice(1) : username;

        // Находим пользователя по username
        const user = await User.findOne({ username: cleanUsername });
        if (!user) {
            return ctx.reply(`Пользователь ${username} не найден.`);
        }

        // Находим тренировку
        const training = await Training.findOne({ date, time });
        if (!training) {
            return ctx.reply(`Тренировка ${date} в ${time} не найдена.`);
        }

        // Проверяем, отмечен ли пользователь
        const userId = user._id;
        if (training.participants.some(id => id.equals(userId))) {
            return ctx.reply(`${username} уже отмечен на этой тренировке!`);
        }

        // Добавляем пользователя в участники
        training.participants.push(userId);
        await training.save();

        ctx.reply(`✅ ${username} отмечен на тренировке ${date} в ${time}.`);
    } catch (err) {
        console.error('Failed checkin:', err);
        ctx.reply('Произошла ошибка при отметке посещаемости.');
    }
});


// Команда /checkout
bot.command('checkout', checkAdmin, async (ctx) => {
    try {
        const args = ctx.message.text.split(' ').slice(1); // Убираем "/checkout"
        if (args.length < 3) {
            return ctx.reply('Используйте: /checkout DD.MM.YYYY HH:MM @username');
        }

        const [date, time, username] = args;
        console.log(`Проверка: ${date} ${time} ${username}`);

        // Валидация формата даты и времени
        if (!/^\d{2}\.\d{2}\.\d{4}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
            return ctx.reply('Неверный формат даты или времени. Пример: /checkout 28.03.2025 08:00 @username');
        }

        // Убираем @ из username, если есть
        const cleanUsername = username.startsWith('@') ? username.slice(1) : username;

        // Находим пользователя по username
        const user = await User.findOne({ username: cleanUsername });
        if (!user) {
            return ctx.reply(`Пользователь ${username} не найден.`);
        }

        // Находим тренировку
        const training = await Training.findOne({ date, time });
        if (!training) {
            return ctx.reply(`Тренировка ${date} в ${time} не найдена.`);
        }

        // Проверяем, есть ли пользователь в участниках
        const userId = user._id;
        const participantIndex = training.participants.findIndex(id => id.equals(userId));
        if (participantIndex === -1) {
            return ctx.reply(`${username} не отмечен на этой тренировке!`);
        }

        // Удаляем пользователя из участников
        training.participants.splice(participantIndex, 1);
        await training.save();

        ctx.reply(`❌ ${username} удалён с тренировки ${date} в ${time}.`);
    } catch (err) {
        console.error('Failed checkout:', err);
        ctx.reply('Произошла ошибка при удалении с тренировки.');
    }
});



// Команда /addtraining для админов (добавление тренировок)
bot.command('addtraining', checkAdmin, async (ctx) => {
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
});

//Dellete all Training

bot.action('delAllWorkout', async (ctx) => {
    const today = new Date();
    today.setDate(today.getDate() + 1); // Завтрашняя дата
    const tomorrowFormatted = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;

    const tomorrowDate = parseDate(tomorrowFormatted);

    try{
        const trainings = await Training.find();
        if (!trainings.length) {
            return ctx.reply('Нет запланированных тренировок.');
        }

        // Фильтруем тренировки с завтра и позже
        const trainingsToDelete = trainings.filter(training => {
            const trainingDate = parseDate(training.date);
            return trainingDate >= tomorrowDate;
        });

        if (!trainingsToDelete.length) {
            return ctx.reply(`Нет тренировок с ${tomorrowFormatted} и позже для удаления.`);
        }

        // Удаляем отфильтрованные тренировки
        await Training.deleteMany({
            date: { $in: trainingsToDelete.map(t => t.date) }
        });

        ctx.reply(`Удалено ${trainingsToDelete.length} тренировок с ${tomorrowFormatted} и позже.`);
    } catch(err){
        console.error('failed delAllWorkout');
        console.log(err);
    }
})

//Command /schedule для показа ближайших тренировок
bot.command('schedule', checkAdmin, async (ctx) => {
    const trainings = await Training.find();
    if (!trainings.length) return ctx.reply('Нет запланированных тренировок.');

    let message = 'Расписание тренировок:\n';
    trainings.forEach(t => {
        message += `📅 ${t.date} в ${t.time}, 📍 ${t.location}\n`;
    });
    ctx.reply(message);
});
bot.command('update', async (ctx) => {
   const upd = getUpdates(1);
   console.log(upd);
})


bot.on('message', async (ctx, next) => {
    const chatId = ctx.chat.id;
    const messageText = ctx.message.text;
    const chatType = ctx.chat.type; // "private", "group", "supergroup"
    const threadId = ctx.message.message_thread_id;
    const telegramId = ctx.from.id;

    console.log(`Получено сообщение из чата ${chatId} - ${threadId}: ${messageText}`);

    if (chatType === 'group' || chatType === 'supergroup') {
        const user = await getOrCreateUser(ctx);

        // // Если пользователь ещё не вступил в клуб и не получил приветствие
        // if (!user.joinedClub && !greetedUsers.has(telegramId)) {
        //     const threadId = Number(process.env.GROUP_CHAT_THREAD_TRAINING);
        //
        //     await bot.telegram.sendMessage(
        //         process.env.GROUP_CHAT_ID,
        //         `Привет, @${ctx.from.username || ctx.from.id}! Хочешь вступить в наш клуб?`,
        //         {
        //             message_thread_id: threadId,
        //             reply_markup: Markup.inlineKeyboard([
        //                 Markup.button.callback('Join Club', `join_${telegramId}`)
        //             ]).reply_markup
        //         }
        //     );
        //     greetedUsers.add(telegramId); // Отмечаем, что пользователь получил приветствие
        // }
    }
    return next();
});




// Обработчик кнопки "Join Club"
bot.action(/join_(.+)/, checkUserName, async (ctx) => {
    const telegramId = Number(ctx.match[1]);
    const threadId = Number(process.env.GROUP_CHAT_THREAD_TRAINING);

    try {
        const user = await User.findOne({ telegramId });
        if (!user) {
            return ctx.answerCbQuery('Пользователь не найден.');
        }

        if (user.joinedClub) {
            return ctx.answerCbQuery('Вы уже в клубе!');
        }

        user.joinedClub = true;
        await user.save();

        await bot.telegram.sendMessage(
            process.env.GROUP_CHAT_ID,
            `✅ @${ctx.from.username || ctx.from.id} вступил в клуб!`,
            { message_thread_id: threadId }
        );
        ctx.answerCbQuery('Добро пожаловать в клуб!');
    } catch (err) {
        console.error('Error in join action:', err);
        ctx.answerCbQuery('Произошла ошибка');
    }
});


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

bot.launch();

// Start Server

const appServer = setupApiServer(bot);

const botServer = http.createServer(appServer)
botServer.listen(PORT, () => {
    console.log(`Bot server started on ${PORT}!`);
});

// Close Server
process.on("SIGINT", async () => {
    //await client.close();
    console.log("Приложение завершило работу");
    process.exit();
})