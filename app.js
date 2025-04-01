require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose')
const { Markup,Telegraf } = require('telegraf');
const string_decoder = require("node:string_decoder");

const app = express();
const urlencodedParser = express.urlencoded({extended: false});
const PORT = process.env.PORT || 8088;
const bot = new Telegraf(process.env.BOT_TOKEN);
const cron = require('node-cron')
const {get} = require("mongoose");
console.log(`PORT: ${PORT}`);

const {getOrCreateUser, checkAdmin, getParticipants, greetedUsers} = require('./bot/middlewares/auth.js');

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





//API to get the schedule
app.get('/api/trainings', async (req, res) => {
    const trainings = await Training.find();
    res.json(trainings);
})



// API for adding a new request (from the site)
app.post('/api/applications', async (req, res) => {
    const { name, phone, email } = req.body;
    const message = `Новая заявка! \n Name: ${name} \n Phone: ${phone} \n Email: ${email}`;
    try{
    await bot.telegram.sendMessage(process.env.ADMIN_CHAT_ID, message);
    const newMember = new ApplicationMember({name, phone, email});
    await newMember.save();
    console.log(message)
    res.status(200).send({message: 'Заявка отправлена'})
    } catch (err) {
        console.error('failed to send an application from the site');
        console.log(err);
    }
})
// Post method for adding a new request (from the site)
app.post("/", urlencodedParser, async function (req, res) {
    const { name, phone, email } = req.body;
    const message = `Новая заявка! \n Name: ${name} \n Phone: ${phone} \n Email: ${email}`;
    try{
        await bot.telegram.sendMessage(process.env.ADMIN_CHAT_ID, message);
        const newMember = new ApplicationMember({name, phone, email});
        await newMember.save();
        console.log(message)
        res.status(200).send({message: 'Заявка отправлена'})
    } catch (err) {
        console.error('failed to send an application from the site');
        console.log(err);
    }
});


///keybord for admin

const keyboard = Markup.inlineKeyboard([
    Markup.button.url("I❤️Arcadia", "http://aradia-cycling.club"),
    Markup.button.callback("Delete", "delete"),
])

const keyboardAddWorkout = Markup.inlineKeyboard([

    [Markup.button.callback("Add Tomarrow I❤️A 7:00", "addTomarrow7")],
    [Markup.button.callback("Add Tomarrow I❤️A 8:00", "addTomarrow8")],
    [Markup.button.callback("Add Tomarrow I❤️A 10:00", "addTomarrow10")],
    [Markup.button.callback("Add Tomarrow 🐽 8:00", "addHeel8")],
    [Markup.button.callback("Add Tomarrow 🐽 10:00", "addHeel10")],
    [Markup.button.callback("Add Tomarrow Coffe 18:00", "addCoffe18")],
    [Markup.button.callback("Custom Workout", "customWorkout")],

])

const keyboardDeleteWorkout = Markup.inlineKeyboard([

    [Markup.button.callback("Remove Tomarrow I❤️A 7:00", "delTomarrow7")],
    [Markup.button.callback("Remove Tomarrow I❤️A 8:00", "delTomarrow8")],
    [Markup.button.callback("Remove Tomarrow I❤️A 10:00", "delTomarrow10")],
    [Markup.button.callback("Remove Tomarrow 🐽 8:00", "delHeel8")],
    [Markup.button.callback("Remove Tomarrow 🐽 10:00", "delHeel0")],
    [Markup.button.callback("Remove Tomarrow Coffe 18:00", "delCoffe18")],
    [Markup.button.callback("Remove All Workout", "delAllWorkout")],
    ]
)

//Command /start
bot.start(async (ctx) => {
    const telegramId = ctx.from.id;
    let user = await User.findOne({ telegramId });
    const admin = process.env.ADMIN_CHAT_ID;
    if (telegramId == admin) {
        ctx.reply("Hello Admin",
            Markup.keyboard([
                ["🚴 Add a Workout", "❌ Delete Workout"], // Row1 with 2 buttons
                ["🗣️ Send a workout", "✔️ Check it"], // Row2 with 2 buttons
                ["📢 Remind everyone", "🗓️ Training List", "👥 Share"], // Row3 with 3 buttons


            ] )
                .resize())
        //bot.action("addTraining", async ctx => await ctx.editMessageCaption("/addtraining ДД.ММ.ГГГГ ЧЧ:ММ Место") )

   } else{

        ctx.reply('Привет! Я бот Pixel Fighter. Используй клавиатуру для просмотра',
            Markup.keyboard([
                ["🗓️ Training List", "📈 Rank"], // Row1 with 2 buttons
                ["🚴 Join Club 🚴", "🚴 Next training"], // Row2 with 2 buttons
                [ "⭐️ Rate us", "👥 Share"], // Row3 with 2 buttons
            ])
                .resize(),

        )
    }



    if (!user) {
        user = new User({
            telegramId,
            name: ctx.from.first_name,
            username: ctx.from.username,
            role: process.env.ADMIN_CHAT_IDS.split(',').includes(telegramId.toString()) ? 'admin' : 'user',  // Simple admin check
        });
        console.log(ctx.from);
        await user.save();

    }

});

/// User Interface

// Обработчик для кнопки "🚴 Join Club 🚴"
bot.hears('🚴 Join Club 🚴', async (ctx) => {
    const user = await User.findOne({ telegramId: ctx.from.id });
    if (user && user.joinedClub) {
        return ctx.reply(`Вы уже в клубе! Вот ссылка на группу:\n${groupLink}`);
    }
    const clubPolicy = `
Arcadia Cycling Club  
Arcadia Cycling Club - одна из популярных команд Одессы. Мы открыты для всех и против коммерции, поэтому нет членских взносов.  
Для вступления в клуб достаточно приобрести клубную форму. Это даст вам доступ к маршрутам и новым знакомствам с единомышленниками.  

Клубная форма обязательна и служит рекламой для спонсоров, формируя бюджет клуба.  
Вступая в клуб, вы соглашаетесь раз в год помогать клубу как волонтёр.  
Мы поддерживаем велоспорт и рассчитываем на помощь членов в клубных делах.  
Члены клуба служат ему так же, как клуб служит им.
`;

    try {
        console.log('Отправляем контракт с кнопками'); // Отладка
        await ctx.reply(clubPolicy, {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: 'Вступить', callback_data: 'join_agree' },
                        { text: 'Отказаться', callback_data: 'join_decline' }
                    ]
                ]
            }
        });
    } catch (err) {
        console.error('Ошибка при отправке сообщения:', err);
        await ctx.reply('Произошла ошибка. Попробуйте снова.');
    }
});

// Обработчик для кнопки "Согласен"
bot.action('join_agree', async (ctx) => {
    const groupLink = 'https://t.me/+XEuv4MtxymowZTJi';
    await ctx.editMessageText(
        `Отлично! Вы согласились с клубной политикой. Присоединяйтесь к нашей группе в Telegram:\n${groupLink}`
    );
    await ctx.answerCbQuery(); // Закрываем callback
});


// Обработчик для кнопки "Отказаться"
bot.action('join_decline', async (ctx) => {
    await ctx.editMessageText(
        'Жаль, что вы отказались. Если передумаете, просто нажмите "🚴 Join Club 🚴" снова!',
        { parse_mode: 'Markdown' }
    );
    await ctx.answerCbQuery(); // Закрываем callback
});

// Обработка команды "⭐️ Rate us"
bot.hears('⭐️ Rate us', async (ctx) => {
    const threadId = Number(process.env.GROUP_CHAT_THREAD_TRAINING);

    try {
        await bot.telegram.sendMessage(
            process.env.ADMIN_CHAT_ID || ctx.chat.id, // Отправляем в группу или личку
            `Поддержите Arcadia Cycling Club!\n` +
            `Оставьте комментарий, поставьте лайк и поделитесь с друзьями на нашей странице:\n` +
            `https://www.instagram.com/arcadia_cycling_club`, {
                reply_markup: Markup.inlineKeyboard([
                    Markup.button.url('Открыть Instagram', 'https://www.instagram.com/arcadia_cycling_club')
                ]).reply_markup
            }
    );
    } catch (err) {
        console.error('Failed to send rate message:', err);
        ctx.reply('Произошла ошибка.');
    }
});

// Команда "📈 Rank"
bot.hears('📈 Rank', async (ctx) => {
    try {
        // Условия рейтинга
        const conditions = `
📈 Рейтинг Arcadia Cycling Club
- За каждое посещение тренировки вы получаете 1 пиксель
- Пиксели можно обменять на мерч
- Чем больше тренировок, тем выше ваш рейтинг

Топ пользователей по пикселям
`;

        // Получаем всех пользователей, отсортированных по убыванию пикселей
        const users = await User.find({ pixels: { $gt: 0 } }) // Только с пикселями > 0
            .sort({ pixels: -1 }) // Сортировка по убыванию
            .limit(10); // Топ-10 (можно изменить)

        if (!users.length) {
            return ctx.reply(`${conditions}Пока никто не заработал пиксели. Посещайте тренировки!`, { parse_mode: 'Markdown' });
        }

        // Формируем таблицу рейтинга
        const rankingTable = users.map((user, index) => {
            const position = index + 1;
            return `${position}. ${user.username || user.telegramId} — ${user.pixels} пикселей`;
        }).join('\n');

        // Полный текст сообщения
        const fullMessage = `${conditions}${rankingTable}`;
        console.log('Sending message:', fullMessage); // Для отладки

        await bot.telegram.sendMessage(
            ctx.chat.id, // Отправляем в текущий чат
            fullMessage
        );
    } catch (err) {
        console.error('Failed to fetch ranking:', err);
        ctx.reply('Произошла ошибка при загрузке рейтинга.');
    }
});




///Admin Interface

bot.hears("❌ Delete Workout", checkAdmin, async ctx => {
    ctx.reply(
        "Чтобы удалить тренировку /removetraining ДД.ММ.ГГГГ ЧЧ:ММ Место",
        keyboardDeleteWorkout,
    );
    const today = new Date();
    const formattedDate =`${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
    try {
        const trainings = await Training.find({ date: { $gte: formattedDate } }).sort({ date: 1 });
        const nextTrainings = trainings.filter(training => {
            const trainingDate = parseDate(training.date);
            return trainingDate >= today;
        });
        if (!trainings.length) return ctx.reply('Нет запланированных тренировок.');

        let message = 'Расписание тренировок:\n';
        nextTrainings.forEach(t => {
            message += `📅 ${t.date} в ${t.time}, 📍 ${t.location}\n`;
        });
        ctx.reply(message);
    } catch (err){
        console.error('failed checkin training');
        console.log(err);
    }
});

const addTrainingCommand = require('./bot/commands/addTraining.js')
bot.hears("🚴 Add a Workout", checkAdmin,addTrainingCommand);

//ToDo: To list Just the upcoming training sessions

bot.hears("✔️ Check it", checkAdmin, async ctx => {
    const today = new Date();
    const formattedDate =`${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
    try {

        const trainings = await Training.find({ date: { $gte: formattedDate } }).sort({ date: 1 });
        const nextTrainings = trainings.filter(training => {
            const trainingDate = parseDate(training.date);
            return trainingDate >= today;
        });
        if (!nextTrainings) return ctx.reply('Нет запланированных тренировок.');
        let message = 'Лист участников:\n';
        for (const training of nextTrainings) {
            const listParticipants = training.participants;
            const participants = await User.find({ _id: { $in: listParticipants } });

            // Формируем список участников для текущей тренировки
            const participantList = participants.length
                ? participants.map((user, index) => `${index + 1}. @${user.username}`).join('\n')
                : 'Нет участников';

            message += `📅 *${training.date} в ${training.time}* (${training.location || 'Место не указано'}):\n${participantList}\n\n`;
        }
        // Отправляем сообщение со списком
        ctx.reply(message);
    } catch (err) {
        console.error('failed checkin training');
        console.log(err);
    }

})
//ToDo: Doesn't work, most likely the problem is in the list of participants
bot.hears("📢 Remind everyone",checkAdmin, async ctx => {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    const formattedDate = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
    const nextTraining = await Training.findOne({date: formattedDate});
    const participants = nextTraining.participants;
    console.log(participants);
    try {
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

})


bot.hears("🚴 Next training", async ctx => {
    const today = new Date();
    today.setDate(today.getDate());
    const formattedDate = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
    try {
        const trainings = await Training.find({ date: { $gte: formattedDate } }).sort({ date: 1 });
        const nextTrainings = trainings.filter(training => {
            const trainingDate = parseDate(training.date);
            return trainingDate >= today;
        });
        if (!trainings.length) return ctx.reply('Нет запланированных тренировок.');

        let message = 'Расписание тренировок:\n';
        nextTrainings.forEach(t => {
            message += `📅 ${t.date} в ${t.time}, 📍 ${t.location}\n`;
        });
        ctx.reply(message);
    } catch (err){
        console.error('failed checkin training');
        console.log(err);
    }
});


bot.hears('🗣️ Send a workout', checkAdmin, async (ctx) => {
    const today = new Date();
    today.setDate(today.getDate() +1);
    const formattedDate = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
    console.log('Sending workout for:', formattedDate);
    const user = await getOrCreateUser(ctx);
    console.log(user.username);
    const threadId = Number(process.env.GROUP_CHAT_THREAD_TRAINING);

    try {
        const nextTraining = await Training.findOne({ date: formattedDate });
        if (!nextTraining) {
            return ctx.reply('Нет запланированных тренировок.');
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
        ctx.reply('Сообщение о тренировке отправлено в группу.');
    } catch (err) {
        console.error('Failed to send workout:', err);
        ctx.reply('Произошла ошибка.');
    }
});

// Обработчик действия "notgo"
bot.action(/notgo_(.+)/, async (ctx) => {
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
bot.action(/go_(.+)/, async (ctx) => {
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

const trainingList = require('./bot/commands/trainingList.js')
bot.hears("🗓️ Training List", trainingList)

// Обработка нажатия кнопки "👥 Share"
bot.hears("👥 Share", async (ctx) => {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    const formattedDate = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;

    const nextTraining = await Training.findOne({ date: formattedDate });
    if (!nextTraining) {
        return ctx.reply('Тренировка не найдена.');
    }

    // Текст для шаринга
    const shareText = `Присоединяйся к тренировке!\n📅 ${nextTraining.date} в ${nextTraining.time}\n📍 ${nextTraining.location}\nУзнай подробности у бота!`;

    // Генерируем ссылку на бота с параметром
    const botUsername = '@PixelCoachBot'; // Замените на имя вашего бота (например, @MyTrainingBot)
    const shareLink = `https://t.me/${botUsername}?start=training_${nextTraining._id}`;

    // Отправляем сообщение с кнопкой "Поделиться"
    await ctx.reply(
        `${shareText}\n\nПригласи друзей по ссылке ниже:`,
        Markup.inlineKeyboard([
            Markup.button.switchToChat('Поделиться', `${shareText}\n${shareLink}`)
        ])
    );
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

bot.command('check', checkAdmin,async (ctx) => {
    const today = new Date();
    const telegramId = ctx.from.id;
    today.setDate(today.getDate() + 1);
    console.log('running every minute 1');
    console.log(today.toISOString());
    const formattedDate = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
    console.log(formattedDate);
    let user = await User.findOne({ telegramId });
    try{
        const training = await Training.find({date: formattedDate});
        const nextTraining = await Training.findOne({date: formattedDate});
        if (!nextTraining) return ctx.reply('Нет запланированных тренировок.');
        if (training.length) {
            const {_, date, time} = nextTraining;
            bot.telegram.sendMessage(process.env.GROUP_CHAT_ID, `Тренировка ${date} ${time}`, Markup.inlineKeyboard([
                Markup.button.callback("+", "go"),
                Markup.button.callback("-", "dontgo")
            ]), { message_thread_id: process.env.GROUP_CHAT_THREAD_TRAINING });
            bot.action("go", getOrCreateUser, async (ctx) => {
                if (!nextTraining.participants.includes(user._id)) {
                    bot.telegram.sendMessage(process.env.GROUP_CHAT_ID, 'Отлично поехали', { message_thread_id: process.env.GROUP_CHAT_THREAD_TRAINING })
                    nextTraining.participants.push(user._id);
                    await nextTraining.save();
                    bot.telegram.sendMessage(process.env.GROUP_CHAT_ID, `✅ @${ctx.from.username} отмечен на тренировке.`, { message_thread_id: process.env.GROUP_CHAT_THREAD_TRAINING });

                }
            })

            bot.action("dontgo", getOrCreateUser, async (ctx) => {
                bot.telegram.sendMessage(process.env.GROUP_CHAT_ID, `:_( @${ctx.from.username} `, { message_thread_id: process.env.GROUP_CHAT_THREAD_TRAINING });
            })

        };
    } catch (err){
        console.error('failed checkin training');
        console.log(err);
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
bot.on('message', async (ctx) => {
    const chatId = ctx.chat.id;
    const messageText = ctx.message.text;
    const chatType = ctx.chat.type; // "private", "group", "supergroup"
    const threadId = ctx.message.message_thread_id;
    const telegramId = ctx.from.id;

    console.log(`Получено сообщение из чата ${chatId} - ${threadId}: ${messageText}`);

    if (chatType === 'group' || chatType === 'supergroup') {
        const user = await getOrCreateUser(ctx);

        // Если пользователь ещё не вступил в клуб и не получил приветствие
        if (!user.joinedClub && !greetedUsers.has(telegramId)) {
            const threadId = Number(process.env.GROUP_CHAT_THREAD_TRAINING);

            await bot.telegram.sendMessage(
                process.env.GROUP_CHAT_ID,
                `Привет, @${ctx.from.username || ctx.from.id}! Хочешь вступить в наш клуб?`,
                {
                    message_thread_id: threadId,
                    reply_markup: Markup.inlineKeyboard([
                        Markup.button.callback('Join Club', `join_${telegramId}`)
                    ]).reply_markup
                }
            );
            greetedUsers.add(telegramId); // Отмечаем, что пользователь получил приветствие
        }
    }
});

// Обработчик кнопки "Join Club"
bot.action(/join_(.+)/, async (ctx) => {
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


// Обработчик кнопки "Join Club"
bot.action(/join_(.+)/, async (ctx) => {
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
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.listen(PORT, () => {
    console.log(`Bot server started on ${PORT}!`);
});
// Close Server
process.on("SIGINT", async () => {
    //await client.close();
    console.log("Приложение завершило работу");
    process.exit();
})