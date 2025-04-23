const { Scenes, Markup } = require('telegraf');
const Certificate = require('../../models/certificates');
const User = require('../../models/user');
const { getText } = require('../../locales');

const ADMIN_METADATA_SCENE_ID = 'adminActivateCertMetadataScene';

const adminMetadataScene = new Scenes.BaseScene(ADMIN_METADATA_SCENE_ID);


adminMetadataScene.enter(async (ctx) => {
    const telegramId = ctx.from.id;

    const certificate = ctx.scene.state.certificate;

    if (!certificate || !certificate.code) {
        console.error(`Адмін ${telegramId} увійшов до adminMetadataScene без даних сертифіката!`);
        await ctx.reply(getText('errorGeneric')); // Загальна помилка
        return ctx.scene.leave();
    }

    ctx.scene.state = { certificate };

    console.log(`Адмін ${telegramId} увійшов до adminMetadataScene для сертифіката ${certificate.code}. Запит метаданих.`);


    await ctx.reply(
        getText('certActivationAdminPromptIssuedTo'),
        Markup.inlineKeyboard([Markup.button.callback(getText('cancelButton'), 'cancel_scene_admin')])
    );
});


adminMetadataScene.action('cancel_scene_admin', async (ctx) => {
    console.log(`Адмін ${ctx.from.id} скасував сцену метаданих (кнопка).`);
    await ctx.answerCbQuery(getText('certActivationCancelledCbQuery'));
    try {
        await ctx.editMessageText(getText('certActivationCancelledMessage'));
    } catch (e) {
        await ctx.reply(getText('certActivationCancelledMessage'));
    }
    return await ctx.scene.leave();
});

adminMetadataScene.command('cancel', async (ctx) => {
    console.log(`Адмін ${ctx.from.id} скасував сцену метаданих (команда).`);
    await ctx.reply(getText('certActivationCancelledMessage'));
    return await ctx.scene.leave();
});


adminMetadataScene.on('text', async (ctx) => {
    const currentState = ctx.scene.state;
    const userAnswer = ctx.message.text.trim();
    const telegramId = ctx.from.id;
    const certificate = currentState.certificate;


    if (!certificate) {
        console.error(`Адмін ${telegramId} в обробнику тексту adminMetadataScene без сертифіката!`);
        await ctx.reply(getText('errorGeneric'));
        return ctx.scene.leave();
    }

    const cancelBtnMarkup = Markup.inlineKeyboard([Markup.button.callback(getText('cancelButton'), 'cancel_scene_admin')]);
    const skipNotesBtnMarkup = Markup.inlineKeyboard([
        Markup.button.callback(getText('certActivationAdminSkipNotesButton'), 'skip_notes_admin'),
        Markup.button.callback(getText('cancelButton'), 'cancel_scene_admin')
    ]);

    try {

        if (!currentState.issuedTo) {
            if (!userAnswer) { return ctx.reply(getText('inputCannotBeEmpty'), cancelBtnMarkup); }
            currentState.issuedTo = userAnswer;
            console.log(`Адмін ${telegramId} ввів issuedTo: ${userAnswer}`);
            await ctx.reply(getText('certActivationAdminPromptReason'), cancelBtnMarkup);


        } else if (!currentState.reason) {
            if (!userAnswer) { return ctx.reply(getText('inputCannotBeEmpty'), cancelBtnMarkup); }
            currentState.reason = userAnswer;
            console.log(`Адмін ${telegramId} ввів reason: ${userAnswer}`);
            await ctx.reply(getText('certActivationAdminPromptNotes'), skipNotesBtnMarkup);


        } else if (currentState.notes === undefined) { // Перевіряємо, чи поле ще не встановлено
            currentState.notes = userAnswer; // Зберігаємо навіть порожній рядок
            console.log(`Адмін ${telegramId} ввів notes: ${userAnswer || '(пропущено через текст)'}`);
            return await finalizeActiveCertAdmin(ctx); // Фіналізуємо
        }

    } catch (error) {
        console.error(`Помилка в adminMetadataScene для адміна ${telegramId}:`, error);
        await ctx.reply(getText('certActivationGenericError'));
        await ctx.scene.leave();
    }
});


adminMetadataScene.action('skip_notes_admin', async (ctx) => {
    const telegramId = ctx.from.id;
    const currentState = ctx.scene.state;

    if (currentState?.certificate && currentState.issuedTo && currentState.reason && currentState.notes === undefined) {
        await ctx.answerCbQuery();
        try{ await ctx.editMessageText(getText('notesSkipped')); } catch(e){} // Редагуємо або ігноруємо помилку
        currentState.notes = ''; // Встановлюємо порожні примітки
        console.log(`Адмін ${telegramId} пропустив примітки в adminMetadataScene.`);
        return await finalizeActiveCertAdmin(ctx); // Фіналізуємо
    } else {
        await ctx.answerCbQuery(getText('unexpectedActionError'), { show_alert: true });
        console.warn(`Неочікувана дія skip_notes_admin від користувача ${telegramId}, стан:`, currentState);
    }
});


async function finalizeActiveCertAdmin(ctx) {
    const telegramId = ctx.from.id;
    const state = ctx.scene.state;
    const certificate = state.certificate;
    const adminChatIdsString = process.env.ADMIN_CHAT_IDS || process.env.ADMIN_CHAT_ID;
    const adminChatIds = adminChatIdsString ? adminChatIdsString.split(',').map(id => id.trim()).filter(id => id) : [];

    console.log(`Фіналізація АДМІНСЬКОЇ активації (adminMetadataScene) для адміна ${telegramId}, сертифікат ${certificate.code}`);

    try {

        const updateResult = await Certificate.findOneAndUpdate(
            { _id: certificate._id, status: 'Активен' }, // Додаткова умова на статус для безпеки
            {
                $set: {
                    status: 'Погашен',
                    redeemedAt: new Date(),
                    redeemedBy: telegramId,
                    'metadata.issuedTo': state.issuedTo,
                    'metadata.reason': state.reason,
                    'metadata.notes': state.notes,
                    'metadata.activatedByAdmin': true
                }
            },
            { new: true }
        );

        if (!updateResult) {
            console.error(`Не вдалося оновити сертифікат ${certificate.code} (можливо, вже погашений іншим процесом).`);
            await ctx.reply(getText('certUpdateFailedError'));
            return await ctx.scene.leave();
        }

        console.log(`Статус сертифіката ${certificate.code} змінено на 'Погашен' (адміном ${telegramId}). Метадані збережено.`);


        await ctx.reply(getText('certActivationAdminSuccess', { code: certificate.code }));


        const otherAdminIds = adminChatIds.filter(id => id !== telegramId.toString());
        if (otherAdminIds.length > 0) {
            try {
                const activationTime = updateResult.redeemedAt
                const activatorAdmin = await User.findOne({ telegramId: telegramId });
                const activatorInfo = activatorAdmin?.username ? `@${activatorAdmin.username}` : `ID: ${telegramId}`;

                let notifyMessage = `${getText('certActivationAdminNotifyHeader')} (Адміном)\n\n` +
                    `${getText('certActivationAdminNotifyActivatedBy')} ${activatorInfo}\n` +
                    `${getText('certActivationAdminNotifyCode')} ${updateResult.code}\n` +
                    `${getText('certActivationAdminNotifyNominal')} ${updateResult.nominal} ${updateResult.currency}\n` +
                    `${getText('certActivationAdminNotifyTime')} ${activationTime}\n\n` +
                    `**Метадані:**\n` +
                    `  Кому: ${updateResult.metadata.issuedTo || getText('certActivationAdminNotifyNotProvided')}\n` +
                    `  ${getText('certActivationAdminNotifyReason')} ${updateResult.metadata.reason || getText('certActivationAdminNotifyNotProvided')}\n` +
                    `  ${getText('certActivationAdminNotifyNotes')} ${updateResult.metadata.notes || getText('certActivationAdminNotifyNotProvided')}\n`;

                for (const adminId of otherAdminIds) {
                    try {
                        await ctx.telegram.sendMessage(adminId, notifyMessage, { parse_mode: 'Markdown' });
                        console.log(`Сповіщення про адмін. активацію надіслано адміну ${adminId}`);
                    } catch (notifyErr) { console.error(`Не вдалося надіслати сповіщення адміну ${adminId}:`, notifyErr); }
                }
            } catch (adminNotifyError) { console.error(`Помилка при сповіщенні інших адмінів:`, adminNotifyError); }
        }

    } catch (dbError) {
        console.error(`Помилка під час фінальної АДМІНСЬКОЇ активації (adminMetadataScene, адмін ${telegramId}):`, dbError);
        await ctx.reply(getText('certActivationDbError'));
    } finally {
        await ctx.scene.leave();
    }
}


adminMetadataScene.on('message', async (ctx) => {
    await ctx.reply(
        getText('adminMetadataOnlyTextAllowed'),
        Markup.inlineKeyboard([Markup.button.callback(getText('cancelButton'), 'cancel_scene_admin')])
    );
});

module.exports = {
    adminMetadataScene,
    ADMIN_METADATA_SCENE_ID
};
