const { Scenes, Markup } = require('telegraf');
const { isAdmin } = require('../middlewares/auth');
const Certificate = require('../../models/certificates');
const User = require('../../models/user');
const { getOrCreateUser } = require('../middlewares/auth');
const { getText } =  require('../../locales');
const { ADMIN_METADATA_SCENE_ID } = require('./adminMetadata.scene');
const { awardPixels } = require('../utils/pixelSystem');
const ACTIVATE_CERT_SCENE_ID = 'activateCertificateScene';
// TODO: Translate the scene
// Scene Certificat
const activateCertScene = new Scenes.BaseScene(ACTIVATE_CERT_SCENE_ID);

activateCertScene.enter(async (ctx) => {
    console.log(`User ${ctx.from.id} entered activate cert scene.`);
    ctx.scene.state.activationData = {};
    
    // Handle pre-filled code (e.g. from QR sticker)
    if (ctx.scene.state.prefillCode) {
        ctx.message = { text: ctx.scene.state.prefillCode };
        // Simulate text input for automatic processing
        return activateCertScene.handleT(ctx); // Ask user to confirm or process below
        // Actually, Telegraf scenes need manual trigger or we just set text and let the next middleware run?
        // Let's just ask them to confirm the code:
        return ctx.reply(`You followed a QR code.\nEnter your code (${ctx.scene.state.prefillCode}) to confirm trial workout activation:`,
            Markup.inlineKeyboard([Markup.button.callback(getText('cancelButton'), 'cancel_scene')])
        );
    }
    
    await ctx.reply(
        "Enter the sticker code to activate trial workout:",
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
            console.log(`User ${telegramId} entered code: ${userInputCode}`);
            if (!userInputCode) {
                return ctx.reply(getText('certActivationCodeEmptyError'), cancelBtnMarkup);
            }

            const certificate = await Certificate.findOne({ code: userInputCode });
            if (!certificate) {
                return ctx.reply(getText('certNotFound', { code: userInputCode }), cancelBtnMarkup);
            }
            if (certificate.status !== 'Активний') {
                await ctx.reply(getText('certAlreadyUsed', { code: userInputCode, status: certificate.status }));
                return await ctx.scene.leave();
            }
            if (certificate.expiresAt && certificate.expiresAt < new Date()) {
                certificate.status = 'Прострочений'; await certificate.save();
                await ctx.reply(getText('certExpired', { code: userInputCode }));
                return await ctx.scene.leave();
            }

            currentState.certificate = certificate;
            console.log(`Certificate ${certificate.code} valid for user ${telegramId}.`);

            const user = await getOrCreateUser(ctx);
            const userIsAdmin = await isAdmin(ctx);

            if (userIsAdmin) {

                console.log(`User ${telegramId} is an admin. Transitioning to metadata scene.`);
                await ctx.scene.leave();
                await ctx.scene.enter(ADMIN_METADATA_SCENE_ID, { certificate: certificate });
                return;

            }

            if (user && user.joinedClub && user.fullName && user.phone) {
                console.log(`User ${telegramId} is already registered. Skipping data collection.`);
                return await finalizeActivation(ctx);
            } else {
                console.log(`User ${telegramId} needs profile data. Requesting Name and Surname.`);
                currentState.needsData = true;
                await ctx.reply(getText('certActivationPromptName'), cancelBtnMarkup);
            }
        } else if (currentState.needsData && !currentState.fullName) {
            if (userAnswer.length < 3) {
                return ctx.reply(getText('certActivationNameTooShort'), cancelBtnMarkup);
            }
            currentState.fullName = userAnswer;
            console.log(`Received fullName: ${userAnswer} for user ${telegramId}`);
            await ctx.reply(getText('certActivationPromptPhone'), cancelBtnMarkup);

        } else if (currentState.needsData && !currentState.phone) {
            if (!/^\+?\d{10,15}$/.test(userAnswer.replace(/\s+/g, ''))) {
                return ctx.reply(getText('certActivationPhoneFormatError'), cancelBtnMarkup);
            }
            currentState.phone = userAnswer;
            console.log(`Received phone: ${userAnswer} for user ${telegramId}. Data collection complete.`);
            return await finalizeActivation(ctx);
        }

    } catch (error) {
        console.error(`Error in activateCertScene for user ${telegramId}:`, error);
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

    console.log(`Finalizing activation for user ${telegramId}, certificate ${certificate.code}`);

    try {
        const user = await getOrCreateUser(ctx);

        // Award 5 pixels for finding the sticker (trial activation)
        await awardPixels(user, 5, ctx.telegram, telegramId);

        if (state.needsData) {
            user.fullName = state.fullName;
            user.phone = state.phone;
            userDataCollected = true;
        }
        await user.save();
        console.log(`User ${telegramId} data updated. Pixels: ${user.pixels}`);

        certificate.status = 'Погашений';
        certificate.redeemedAt = new Date();
        certificate.redeemedBy = telegramId;
        await certificate.save();
        console.log(`Certificate ${certificate.code} status changed to 'Погашений'.`);

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
                console.log(`Message to admin ${adminChatId} sent successfully.`);

            } catch (adminNotifyError) {
                console.error(`Failed to send message to admin ${adminChatId}:`, adminNotifyError);
            }
        } else {
            console.warn("ADMIN_CHAT_ID not set. Skipping admin notification.");
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
        console.error(`Error during final activation for user ${telegramId}:`, dbError);
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