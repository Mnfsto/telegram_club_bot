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
        console.error(`Admin ${telegramId} entered adminMetadataScene without certificate data!`);
        await ctx.reply(getText('errorGeneric')); // Generic error
        return ctx.scene.leave();
    }

    ctx.scene.state = { certificate };

    console.log(`Admin ${telegramId} entered adminMetadataScene for certificate ${certificate.code}. Requesting metadata.`);


    await ctx.reply(
        getText('certActivationAdminPromptIssuedTo'),
        Markup.inlineKeyboard([Markup.button.callback(getText('cancelButton'), 'cancel_scene_admin')])
    );
});


adminMetadataScene.action('cancel_scene_admin', async (ctx) => {
    console.log(`Admin ${ctx.from.id} cancelled metadata scene (button).`);
    await ctx.answerCbQuery(getText('certActivationCancelledCbQuery'));
    try {
        await ctx.editMessageText(getText('certActivationCancelledMessage'));
    } catch (e) {
        await ctx.reply(getText('certActivationCancelledMessage'));
    }
    return await ctx.scene.leave();
});

adminMetadataScene.command('cancel', async (ctx) => {
    console.log(`Admin ${ctx.from.id} cancelled metadata scene (command).`);
    await ctx.reply(getText('certActivationCancelledMessage'));
    return await ctx.scene.leave();
});


adminMetadataScene.on('text', async (ctx) => {
    const currentState = ctx.scene.state;
    const userAnswer = ctx.message.text.trim();
    const telegramId = ctx.from.id;
    const certificate = currentState.certificate;


    if (!certificate) {
        console.error(`Admin ${telegramId} in text handler of adminMetadataScene without certificate!`);
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
            console.log(`Admin ${telegramId} entered issuedTo: ${userAnswer}`);
            await ctx.reply(getText('certActivationAdminPromptReason'), cancelBtnMarkup);


        } else if (!currentState.reason) {
            if (!userAnswer) { return ctx.reply(getText('inputCannotBeEmpty'), cancelBtnMarkup); }
            currentState.reason = userAnswer;
            console.log(`Admin ${telegramId} entered reason: ${userAnswer}`);
            await ctx.reply(getText('certActivationAdminPromptNotes'), skipNotesBtnMarkup);


        } else if (currentState.notes === undefined) { // Check if field is not set yet
            currentState.notes = userAnswer; // Save even empty string
            console.log(`Admin ${telegramId} entered notes: ${userAnswer || '(skipped via text)'}`);
            return await finalizeActiveCertAdmin(ctx); // Finalize
        }

    } catch (error) {
        console.error(`Error in adminMetadataScene for admin ${telegramId}:`, error);
        await ctx.reply(getText('certActivationGenericError'));
        await ctx.scene.leave();
    }
});


adminMetadataScene.action('skip_notes_admin', async (ctx) => {
    const telegramId = ctx.from.id;
    const currentState = ctx.scene.state;

    if (currentState?.certificate && currentState.issuedTo && currentState.reason && currentState.notes === undefined) {
        await ctx.answerCbQuery();
        try{ await ctx.editMessageText(getText('notesSkipped')); } catch(e){} // Edit or ignore error
        currentState.notes = ''; // Set empty notes
        console.log(`Admin ${telegramId} skipped notes in adminMetadataScene.`);
        return await finalizeActiveCertAdmin(ctx); // Finalize
    } else {
        await ctx.answerCbQuery(getText('unexpectedActionError'), { show_alert: true });
        console.warn(`Unexpected action skip_notes_admin from user ${telegramId}, state:`, currentState);
    }
});


async function finalizeActiveCertAdmin(ctx) {
    const telegramId = ctx.from.id;
    const state = ctx.scene.state;
    const certificate = state.certificate;
    const adminChatIdsString = process.env.ADMIN_CHAT_IDS || process.env.ADMIN_CHAT_ID;
    const adminChatIds = adminChatIdsString ? adminChatIdsString.split(',').map(id => id.trim()).filter(id => id) : [];

    console.log(`Finalizing ADMIN activation (adminMetadataScene) for admin ${telegramId}, certificate ${certificate.code}`);

    try {

        const updateResult = await Certificate.findOneAndUpdate(
            { _id: certificate._id, status: 'Активний' }, // Additional status condition for safety
            {
                $set: {
                    status: 'Погашений',
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
            console.error(`Failed to update certificate ${certificate.code} (maybe already redeemed by another process).`);
            await ctx.reply(getText('certUpdateFailedError'));
            return await ctx.scene.leave();
        }

        console.log(`Certificate ${certificate.code} status changed to 'Погашений' (by admin ${telegramId}). Metadata saved.`);


        await ctx.reply(getText('certActivationAdminSuccess', { code: certificate.code }));


        const otherAdminIds = adminChatIds.filter(id => id !== telegramId.toString());
        if (otherAdminIds.length > 0) {
            try {
                const activationTime = updateResult.redeemedAt
                const activatorAdmin = await User.findOne({ telegramId: telegramId });
                const activatorInfo = activatorAdmin?.username ? `@${activatorAdmin.username}` : `ID: ${telegramId}`;

                let notifyMessage = `${getText('certActivationAdminNotifyHeader')} (By Admin)\n\n` +
                    `${getText('certActivationAdminNotifyActivatedBy')} ${activatorInfo}\n` +
                    `${getText('certActivationAdminNotifyCode')} ${updateResult.code}\n` +
                    `${getText('certActivationAdminNotifyNominal')} ${updateResult.nominal} ${updateResult.currency}\n` +
                    `${getText('certActivationAdminNotifyTime')} ${activationTime}\n\n` +
                    `**Metadata:**\n` +
                    `  To: ${updateResult.metadata.issuedTo || getText('certActivationAdminNotifyNotProvided')}\n` +
                    `  ${getText('certActivationAdminNotifyReason')} ${updateResult.metadata.reason || getText('certActivationAdminNotifyNotProvided')}\n` +
                    `  ${getText('certActivationAdminNotifyNotes')} ${updateResult.metadata.notes || getText('certActivationAdminNotifyNotProvided')}\n`;

                for (const adminId of otherAdminIds) {
                    try {
                        await ctx.telegram.sendMessage(adminId, notifyMessage, { parse_mode: 'Markdown' });
                        console.log(`Notification about admin activation sent to admin ${adminId}`);
                    } catch (notifyErr) { console.error(`Failed to send notification to admin ${adminId}:`, notifyErr); }
                }
            } catch (adminNotifyError) { console.error(`Error notifying other admins:`, adminNotifyError); }
        }

    } catch (dbError) {
        console.error(`Error during final ADMIN activation (adminMetadataScene, admin ${telegramId}):`, dbError);
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
