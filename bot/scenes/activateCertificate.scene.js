const { Scenes, Markup } = require('telegraf');
const Certificate = require('../../models/certificates');
const User = require('../../models/user');
const { getOrCreateUser } = require('../middlewares/auth');

const ACTIVATE_CERT_SCENE_ID = 'activateCertificateScene';
const activateCertScene = new Scenes.BaseScene(ACTIVATE_CERT_SCENE_ID);


activateCertScene.enter(async (ctx) => {
    console.log(`User ${ctx.from.id} entered activate cert scene.`);
    ctx.scene.state.activationData = {};
    await ctx.reply(
        'Пожалуйста, введите уникальный код вашего подарочного сертификата:',
        Markup.inlineKeyboard([
            Markup.button.callback('❌ Отмена', 'cancel_scene')
        ])
    );
});

activateCertScene.action('cancel_scene', async (ctx) => {
    console.log(`User ${ctx.from.id} cancelled scene via button.`);
    await ctx.answerCbQuery('Действие отменено');
    try {

        await ctx.editMessageText('Активация сертификата отменена.');
    } catch (e) {

        await ctx.reply('Активация сертификата отменена.');
    }
    return await ctx.scene.leave();
});

activateCertScene.command('cancel', async (ctx) => {
    console.log(`User ${ctx.from.id} cancelled scene via command.`);
    await ctx.reply('Активация сертификата отменена.');
    return await ctx.scene.leave();
});


activateCertScene.on('text', async (ctx) => {
    const currentState = ctx.scene.state.activationData;
    const userAnswer = ctx.message.text.trim();
    const telegramId = ctx.from.id;


    try {

        if (!currentState.certificate) {
            const userInputCode = userAnswer.toUpperCase();
            console.log(`User ${telegramId} entered code: ${userInputCode}`);
            if (!userInputCode) {
                return ctx.reply('Код не может быть пустым.', Markup.inlineKeyboard([ Markup.button.callback('❌ Отмена', 'cancel_scene') ]));
            }


            const certificate = await Certificate.findOne({ code: userInputCode });
            if (!certificate) {
                return ctx.reply(`Сертификат "${userInputCode}" не найден. Проверьте код:`, Markup.inlineKeyboard([ Markup.button.callback('❌ Отмена', 'cancel_scene') ]));
            }
            if (certificate.status !== 'Активен') {
                await ctx.reply(`Сертификат "${userInputCode}" уже был использован (${certificate.status}) или деактивирован.`);
                return await ctx.scene.leave();
            }
            if (certificate.expiresAt && certificate.expiresAt < new Date()) {
                certificate.status = 'Просрочен'; await certificate.save();
                await ctx.reply(`Срок действия сертификата "${userInputCode}" истек.`);
                return await ctx.scene.leave();
            }

            currentState.certificate = certificate;
            console.log(`Certificate ${certificate.code} validated for user ${telegramId}.`);

            const user = await getOrCreateUser(ctx);


            if (user && user.joinedClub && user.fullName && user.phone) {
                console.log(`User ${telegramId} is already registered. Skipping data collection.`);

                return await finalizeActivation(ctx);
            } else {

                console.log(`User ${telegramId} needs profile data. Requesting Full Name.`);
                currentState.needsData = true;
                await ctx.reply('Сертификат найден! 👍\nТеперь введите ваше Имя и Фамилию:', Markup.inlineKeyboard([ Markup.button.callback('❌ Отмена', 'cancel_scene') ]));
            }
        } else if (currentState.needsData && !currentState.fullName) {
            if (userAnswer.length < 3) {
                return ctx.reply('Имя и Фамилия слишком короткие. Попробуйте еще раз:', Markup.inlineKeyboard([Markup.button.callback('❌ Отмена', 'cancel_scene')]));
            }
            currentState.fullName = userAnswer;
            console.log(`Received fullName: ${userAnswer} for user ${telegramId}`);
            await ctx.reply('Отлично! Теперь введите ваш контактный номер телефона:', Markup.inlineKeyboard([ Markup.button.callback('❌ Отмена', 'cancel_scene') ]));


        } else if (currentState.needsData && !currentState.phone) {
            if (!/^\+?\d{10,15}$/.test(userAnswer.replace(/\s+/g, ''))) {
                return ctx.reply('Неверный формат телефона. Пожалуйста, введите номер:', Markup.inlineKeyboard([Markup.button.callback('❌ Отмена', 'cancel_scene')]));
            }
            currentState.phone = userAnswer;
            console.log(`Received phone: ${userAnswer} for user ${telegramId}. All data collected.`);

            return await finalizeActivation(ctx);
        }

    } catch (error) {
        console.error(`Error in activateCertScene for user ${telegramId}:`, error);
        await ctx.reply('Произошла внутренняя ошибка. Попробуйте позже или свяжитесь с поддержкой.');
        await ctx.scene.leave();
    }
});



async function finalizeActivation(ctx) {
    const telegramId = ctx.from.id;
    const state = ctx.scene.state.activationData;
    const certificate = state.certificate;
    const adminChatId = process.env.ADMIN_CHAT_ID;

    console.log(`Finalizing activation for user ${telegramId}, cert ${certificate.code}`);

    try {
        const user = await getOrCreateUser(ctx);

        user.pixels = (user.pixels || 0) + certificate.nominal;
        if (state.needsData) {
            user.fullName = state.fullName;
            user.phone = state.phone;
        }
        await user.save();
        console.log(`User ${telegramId} data updated. Pixels: ${user.pixels}`);

        certificate.status = 'Погашен';
        certificate.redeemedAt = new Date();
        certificate.redeemedBy = telegramId;
        await certificate.save();
        console.log(`Certificate ${certificate.code} status set to 'Погашен'.`);

        if (adminChatId) {
            try {

                const activationTime = certificate.redeemedAt


                const userInfo = user.username
                    ? `@${user.username}`
                    : (user.name || `ID: ${telegramId}`);


                let adminMessage = `🔔 Сертификат Активирован\n\n` +
                    `Пользователь: ${userInfo}\n` +
                    `Код: ${certificate.code}\n` +
                    `Номинал: ${certificate.nominal} ${certificate.currency}\n` +
                    `Время: ${activationTime}\n`;


                adminMessage += `\nСобраны данные:\n` +
                    `  Имя: ${user.fullName || '....'}\n` +
                    `  Телефон: ${user.phone || '...'}\n`;


                await ctx.telegram.sendMessage(adminChatId, adminMessage);
                console.log(`Admin notification sent successfully to ${adminChatId}.`);

            } catch (adminNotifyError) {
                console.error(`Failed to send notification to admin ${adminChatId}:`, adminNotifyError);
            }
        } else {
            console.warn("ADMIN_CHAT_ID is not set in environment variables. Skipping admin notification.");
        }

        const finalMessage = `✅ Сертификат "${certificate.code}" успешно активирован!\n` +
            `Вам начислено: ${certificate.nominal} ${certificate.currency}.\n\n` +
            `Спасибо за активацию! С вами свяжутся для уточнения деталей или вы можете ознакомиться с актуальным расписанием.\n\n` +
            `📅 **Ближайшие тренировки:**\n` +
            `*Здесь будет информация о расписании* (нужно добавить логику получения расписания)`;

        await ctx.reply(finalMessage,  Markup.keyboard([
            ["🚴 Join Club 🚴", "🚴 Next training"],
            ["🗓️ Training List", "📈 Rank"],
            [ "⭐️ Rate us", "👥 Share"],
        ])
            .resize(),);

    } catch (dbError) {
        console.error(`Error during final activation for user ${telegramId}:`, dbError);
        await ctx.reply('Произошла ошибка при сохранении данных. Свяжитесь с поддержкой.');
    } finally {
        await ctx.scene.leave();
    }
}


activateCertScene.on('message', async (ctx) => {
    await ctx.reply('Пожалуйста, введите код сертификата текстом или нажмите "Отмена".', Markup.inlineKeyboard([ Markup.button.callback('❌ Отмена', 'cancel_scene') ]));
});



module.exports = {
    activateCertScene,
    ACTIVATE_CERT_SCENE_ID
};