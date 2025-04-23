const { Scenes, Markup } = require('telegraf');
const { isAdmin } = require('../middlewares/auth');
const Certificate = require('../../models/certificates');
const User = require('../../models/user');
const { getOrCreateUser } = require('../middlewares/auth');
const { getText } =  require('../../locales');
const { ADMIN_METADATA_SCENE_ID } = require('./adminMetadata.scene');
const ACTIVATE_CERT_SCENE_ID = 'activateCertificateScene';

const activateCertScene = new Scenes.BaseScene(ACTIVATE_CERT_SCENE_ID);

activateCertScene.enter(async (ctx) => {
    console.log(`User ${ctx.from.id} entered activate cert scene.`);
    ctx.scene.state.activationData = {};
    await ctx.reply(
        getText('certActivationEnterPrompt'),
        Markup.inlineKeyboard([
            Markup.button.callback(getText('cancelButton'), 'cancel_scene')
        ])
    );
});

activateCertScene.action('cancel_scene', async (ctx) => {
    console.log(`User ${ctx.from.id} cancelled scene via button.`);
    await ctx.answerCbQuery(getText('certActivationCancelledCbQuery'));
    try {
        await ctx.editMessageText(getText('certActivationCancelledMessage'));
    } catch (e) {
        await ctx.reply(getText('certActivationCancelledMessage'));
    }
    return await ctx.scene.leave();
});

activateCertScene.command('cancel', async (ctx) => {
    console.log(`User ${ctx.from.id} cancelled scene via command.`);
    await ctx.reply(getText('certActivationCancelledMessage'));
    return await ctx.scene.leave();
});

activateCertScene.on('text', async (ctx) => {
    const currentState = ctx.scene.state.activationData;
    const userAnswer = ctx.message.text.trim();
    const telegramId = ctx.from.id;
    const cancelBtnMarkup = Markup.inlineKeyboard([Markup.button.callback(getText('cancelButton'), 'cancel_scene')]);

    try {
        if (!currentState.certificate) {
            const userInputCode = userAnswer.toUpperCase();
            console.log(`Користувач ${telegramId} ввів код: ${userInputCode}`);
            if (!userInputCode) {
                return ctx.reply(getText('certActivationCodeEmptyError'), cancelBtnMarkup);
            }

            const certificate = await Certificate.findOne({ code: userInputCode });
            if (!certificate) {
                return ctx.reply(getText('certNotFound', { code: userInputCode }), cancelBtnMarkup);
            }
            if (certificate.status !== 'Активен') {
                await ctx.reply(getText('certAlreadyUsed', { code: userInputCode, status: certificate.status }));
                return await ctx.scene.leave();
            }
            if (certificate.expiresAt && certificate.expiresAt < new Date()) {
                certificate.status = 'Просрочен'; await certificate.save();
                await ctx.reply(getText('certExpired', { code: userInputCode }));
                return await ctx.scene.leave();
            }

            currentState.certificate = certificate;
            console.log(`Сертифікат ${certificate.code} валідний для користувача ${telegramId}.`);

            const user = await getOrCreateUser(ctx);
            const userIsAdmin = await isAdmin(ctx);

            if (userIsAdmin) {

                console.log(`Користувач ${telegramId} є адміном. Перехід в сцену метаданих.`);
                await ctx.scene.leave();
                await ctx.scene.enter(ADMIN_METADATA_SCENE_ID, { certificate: certificate });
                return;

            }

            if (user && user.joinedClub && user.fullName && user.phone) {
                console.log(`Користувач ${telegramId} вже зареєстрований. Пропускаємо збір даних.`);
                return await finalizeActivation(ctx);
            } else {
                console.log(`Користувачу ${telegramId} потрібні дані профілю. Запитуємо Ім'я та Прізвище.`);
                currentState.needsData = true;
                await ctx.reply(getText('certActivationPromptName'), cancelBtnMarkup);
            }
        } else if (currentState.needsData && !currentState.fullName) {
            if (userAnswer.length < 3) {
                return ctx.reply(getText('certActivationNameTooShort'), cancelBtnMarkup);
            }
            currentState.fullName = userAnswer;
            console.log(`Отримано fullName: ${userAnswer} для користувача ${telegramId}`);
            await ctx.reply(getText('certActivationPromptPhone'), cancelBtnMarkup);

        } else if (currentState.needsData && !currentState.phone) {
            if (!/^\+?\d{10,15}$/.test(userAnswer.replace(/\s+/g, ''))) {
                return ctx.reply(getText('certActivationPhoneFormatError'), cancelBtnMarkup);
            }
            currentState.phone = userAnswer;
            console.log(`Отримано phone: ${userAnswer} для користувача ${telegramId}. Усі дані зібрано.`);
            return await finalizeActivation(ctx);
        }

    } catch (error) {
        console.error(`Помилка в activateCertScene для користувача ${telegramId}:`, error);
        await ctx.reply(getText('certActivationGenericError'));
        await ctx.scene.leave();
    }
});

async function finalizeActivation(ctx) {
    const telegramId = ctx.from.id;
    const state = ctx.scene.state.activationData;
    const certificate = state.certificate;
    const adminChatId = process.env.ADMIN_CHAT_ID;
    let userDataCollected = false;

    console.log(`Фіналізація активації для користувача ${telegramId}, сертифікат ${certificate.code}`);

    try {
        const user = await getOrCreateUser(ctx);

        user.pixels = (user.pixels || 0) + certificate.nominal;
        if (state.needsData) {
            user.fullName = state.fullName;
            user.phone = state.phone;
            userDataCollected = true;
        }
        await user.save();
        console.log(`Дані користувача ${telegramId} оновлено. Пікселі: ${user.pixels}`);

        certificate.status = 'Погашен';
        certificate.redeemedAt = new Date();
        certificate.redeemedBy = telegramId;
        await certificate.save();
        console.log(`Статус сертифіката ${certificate.code} змінено на 'Погашен'.`);

        if (adminChatId) {
            try {
                const activationTime = certificate.redeemedAt;
                const userInfo = user.username ? `@${user.username}` : (user.name || `ID: ${telegramId}`);

                let adminMessage = `${getText('certActivationAdminNotifyHeader')}\n\n` +
                    `${getText('certActivationAdminNotifyUser')} ${userInfo}\n` +
                    `${getText('certActivationAdminNotifyCode')} ${certificate.code}\n` +
                    `${getText('certActivationAdminNotifyNominal')} ${certificate.nominal} ${certificate.currency}\n` +
                    `${getText('certActivationAdminNotifyTime')} ${activationTime}\n`;

                if (userDataCollected) {
                    adminMessage += `${getText('certActivationAdminNotifyDataCollected')}\n` +
                        `${getText('certActivationAdminNotifyName')} ${user.fullName || getText('certActivationAdminNotifyNotProvided')}\n` +
                        `${getText('certActivationAdminNotifyPhone')} ${user.phone || getText('certActivationAdminNotifyNotProvided')}\n`;
                }

                await ctx.telegram.sendMessage(adminChatId, adminMessage);
                console.log(`Повідомлення адміну ${adminChatId} надіслано успішно.`);

            } catch (adminNotifyError) {
                console.error(`Не вдалося надіслати повідомлення адміну ${adminChatId}:`, adminNotifyError);
            }
        } else {
            console.warn("ADMIN_CHAT_ID не встановлено. Пропускаємо повідомлення адміну.");
        }

        let scheduleInfo = getText('scheduleInfoPlaceholder');

        const finalMessage = getText('certActivationSuccessUser', {
            code: certificate.code,
            nominal: certificate.nominal,
            currency: certificate.currency,
            scheduleInfo: scheduleInfo
        });

        await ctx.reply(finalMessage);

    } catch (dbError) {
        console.error(`Помилка під час фінальної активації для користувача ${telegramId}:`, dbError);
        await ctx.reply(getText('certActivationDbError'));
    } finally {
        await ctx.scene.leave();
    }
}

activateCertScene.on('message', async (ctx) => {
    await ctx.reply(
        getText('certActivationOnlyTextAllowed'),
        Markup.inlineKeyboard([Markup.button.callback(getText('cancelButton'), 'cancel_scene')])
    );
});

module.exports = {
    activateCertScene,
    ACTIVATE_CERT_SCENE_ID
};