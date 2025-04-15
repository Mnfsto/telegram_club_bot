const User = require("../../models/user");
const {Markup} = require("telegraf");

async function startCommand (ctx){
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

}

module.exports = startCommand;