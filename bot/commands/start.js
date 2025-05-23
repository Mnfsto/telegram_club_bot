const User = require("../../models/user");
const {Markup} = require("telegraf");
const handleCertActivation = require("../handlers/keyboardHandlers/handleCertActivation");
const Certificate = require('../../models/certificates');

async function startCommand (ctx){
    const telegramId = ctx.from.id;
    let certActive = await Certificate.findOne({redeemedBy: telegramId});
    let user = await User.findOne({ telegramId });
    const changeBtn = (certActive !== null && certActive.redeemedBy == telegramId  ? "🚴 Next training": "Activate Certificate");
    const admin = process.env.ADMIN_CHAT_ID;
    if (telegramId == admin) {
        ctx.reply("Hello Admin",
            Markup.keyboard([
                ["🚴 Add a Workout", "❌ Delete Workout"], // Row1 with 2 buttons
                ["🗣️ Send a workout", "✔️ Check it"], // Row2 with 2 buttons
                ["📢 Remind everyone", "🗓️ Training List", "👥 Share"], // Row3 with 3 buttons
                ["Activate Certificate"],

            ] )
                .resize())


    } else{

        ctx.reply('👋 Добро пожаловать в Arcadia Cycling Club!\n' +
            '\n' +
            'Я твой цифровой помощник, бот Pixel Fighter 🤖🚴‍♀️.\n' +
            '\n' +
            'Здесь ты сможешь:\n' +
            '📅 Узнавать актуальное расписание тренировок\n' +
            '✅ Записываться на заезды и зарабатывать "Пиксели"!\n' +
            '🏆 Следить за своим местом в рейтинге "Борьба за Пиксели"\n' +
            '🤝 Стать полноценной частью нашего дружного велосообщества.\n' +
            '\n' +
            'Используй кнопки внизу, чтобы узнать больше и присоединиться к нашим активностям! 👇\n' +
            '\n' +
            'Если ты здесь впервые, нажми \'🚴 Join Club 🚴\', чтобы ознакомиться с условиями и вступить!',
            Markup.keyboard([
                ["🚴 Join Club 🚴", `${changeBtn}`],
                ["🗓️ Training List", "📈 Rank"],
                [ "⭐️ Rate us", "👥 Share"],
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

}

module.exports = startCommand;