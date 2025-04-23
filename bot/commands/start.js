const User = require("../../models/user");
const {Markup} = require("telegraf");
const handleCertActivation = require("../handlers/keyboardHandlers/handleCertActivation");
const Certificate = require('../../models/certificates');
const { getText} = require('../../locales');


async function startCommand (ctx){
    const joinClubBtn = getText('joinClubBtn');
    const telegramId = ctx.from.id;
    let user = await User.findOne({ telegramId });
    let dynamicButtonText = '';
    try {
        const certActive = await Certificate.findOne({ redeemedBy: telegramId, status: 'Погашен' }); // Ищем погашенный пользователем
        const dynamicButtonKey = (certActive !== null) ? 'nextTrainingBtn' : 'activateCertBtn';
        dynamicButtonText = getText(dynamicButtonKey);
    } catch (error) {
        console.error("Error checking certificate status for button:", error);
        dynamicButtonText = getText('activateCertBtn'); // По умолчанию кнопка активации при ошибке
    }
    const admin = process.env.ADMIN_CHAT_ID;
    if (telegramId == admin) {
        ctx.reply("Hello Admin",
            Markup.keyboard([
                [getText('addWorkoutBtn'), getText('deleteWorkoutBtn')],
                [getText('sendWorkoutBtn'), getText('checkItBtn')],
                [getText('remindEveryoneBtn'), getText('trainingListBtn'), getText('shareBtn')],
                [getText('activateCertBtn')],

            ] )
                .resize())


    } else{

        ctx.reply(getText('welcomeMessage'),
            Markup.keyboard([
                [getText('joinClubBtn'), dynamicButtonText],
                [getText('trainingListBtn'), getText('rankBtn')],
                [getText('rateUsBtn'), getText('shareBtn')],
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