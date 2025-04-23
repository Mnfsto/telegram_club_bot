const { Scenes, Markup } = require('telegraf');
const User = require('../../models/user'); // Adjust path if necessary
const { getText } =  require('../../locales');

const PROFILE_SCENE_ID = 'userProfile'; // Assuming you still export this ID if needed elsewhere

const profileScene = new Scenes.BaseScene(PROFILE_SCENE_ID);

profileScene.enter(async (ctx) => {
    console.log(`User ${ctx.from.id} entered profile scene`);
    ctx.scene.state.profileData = {};

    await ctx.reply(
        getText('profileSceneEnterPrompt'),
        Markup.inlineKeyboard([

            Markup.button.callback(getText('cancelButton'), 'cancel_scene')
        ])
    );
});

profileScene.action('cancel_scene', async (ctx) => {
    const telegramId = ctx.from.id;
    console.log(`User ${ctx.from.id} cancelled profile scene via button.`);
    await ctx.answerCbQuery(getText('profileCancelledCbQuery')); // Use text key
    await ctx.editMessageText(getText('profileCancelledMessage')); // Use text key

    try {
        const user = await User.findOne({ telegramId: telegramId });
        if (user && user.joinedClub) { // Only set joinedClub to false if they were previously joined
            user.joinedClub = false;
            await user.save();
            console.log(`User ${telegramId} joinedClub status reverted.`);
        } else if (!user) {
            console.error(`User ${telegramId} not found when cancelling profile scene.`);
        }
    } catch (err) {
        console.error(`DB error when cancelling profile scene for user ${telegramId}:`, err);
    }
    return await ctx.scene.leave();
});

profileScene.command('cancel', async (ctx) => {
    const telegramId = ctx.from.id;
    console.log(`User ${ctx.from.id} cancelled profile scene via command.`);
    await ctx.reply(getText('profileDataCollectionCancelled')); // Use text key

    try {
        const user = await User.findOne({ telegramId: telegramId });
        if (user && user.joinedClub) { // Only set joinedClub to false if they were previously joined
            user.joinedClub = false;
            await user.save();
            console.log(`User ${telegramId} joinedClub status reverted via command.`);
        } else if (!user) {
            console.error(`User ${telegramId} not found when cancelling profile scene via command.`);
        }
    } catch (err) {
        console.error(`DB error when cancelling profile scene via command for user ${telegramId}:`, err);
    }
    return await ctx.scene.leave();
});

profileScene.on('text', async (ctx) => {
    const currentState = ctx.scene.state.profileData;
    const userAnswer = ctx.message.text.trim();
    const telegramId = ctx.from.id;
    const groupLink = process.env.GROUP_LINK || getText('linkNotDefined'); // Use key for fallback link? Or keep hardcoded default?

    const cancelBtnMarkup = Markup.inlineKeyboard([Markup.button.callback(getText('cancelButton'), 'cancel_scene')]);

    try {
        // Step 1: Full Name
        if (!currentState.fullName) {
            if (userAnswer.length < 3) {
                return ctx.reply(getText('profileFullNameTooShortError'), cancelBtnMarkup);
            }
            currentState.fullName = userAnswer;
            await ctx.reply(getText('profileAskBirthDatePrompt'), cancelBtnMarkup);

            // Step 2: Birth Date
        } else if (!currentState.birthDate) {
            const dateParts = userAnswer.split('.');
            if (dateParts.length !== 3) {
                return ctx.reply(getText('profileBirthDateFormatError'), cancelBtnMarkup);
            }

            const day = parseInt(dateParts[0], 10);
            const month = parseInt(dateParts[1], 10);
            const year = parseInt(dateParts[2], 10);

            if (isNaN(day) || isNaN(month) || isNaN(year)) {
                return ctx.reply(getText('profileBirthDateNaNError'), cancelBtnMarkup);
            }

            const currentYear = new Date().getFullYear();
            const minYear = currentYear - 120;
            const maxYear = currentYear - 5;
            if (year < minYear || year > maxYear) {
                // Pass placeholders to getText
                return ctx.reply(getText('profileBirthDateYearRangeError', { year, minYear, maxYear }), cancelBtnMarkup);
            }

            const monthIndex = month - 1;
            const dateObject = new Date(Date.UTC(year, monthIndex, day)); // Use UTC to avoid timezone issues during storage

            // Re-validate using UTC methods
            if (dateObject.getUTCFullYear() !== year || dateObject.getUTCMonth() !== monthIndex || dateObject.getUTCDate() !== day) {
                return ctx.reply(getText('profileBirthDateInvalidDateError'), cancelBtnMarkup);
            }

            currentState.birthDate = dateObject;
            console.log(`Received birthDate (UTC): ${currentState.birthDate.toISOString()}`);

            await ctx.reply(getText('profileAskDistrictPrompt'), cancelBtnMarkup);

            // Step 3: District
        } else if (!currentState.district) {
            if (userAnswer.length < 2) {
                return ctx.reply(getText('profileDistrictTooShortError'), cancelBtnMarkup);
            }
            currentState.district = userAnswer;
            await ctx.reply(getText('profileAskPhonePrompt'), cancelBtnMarkup);

            // Step 4: Phone & Finalization
        } else if (!currentState.phone) {
            if (!/^\+?\d{10,15}$/.test(userAnswer.replace(/\s+/g, ''))) {
                return ctx.reply(getText('profilePhoneFormatError'), cancelBtnMarkup);
            }
            currentState.phone = userAnswer;

            console.log(`Profile data collected for user ${telegramId}:`, currentState);
            try {
                const user = await User.findOne({ telegramId: telegramId });
                if (!user) {
                    console.error(`User ${telegramId} not found in DB before saving profile!`);
                    await ctx.reply(getText('profileUserNotFoundSaveError'));
                    return await ctx.scene.leave();
                }

                // Update user document
                user.fullName = currentState.fullName;
                user.birthDate = currentState.birthDate;
                user.district = currentState.district;
                user.phone = currentState.phone;
                user.joinedClub = true; // Mark as joined

                await user.save();
                console.log(`User ${telegramId} profile saved successfully.`);

                // Format date for display (consider user's locale if available)
                const formattedBirthDate = currentState.birthDate.toLocaleDateString('uk-UA', {
                    timeZone: 'UTC', // Specify timezone for consistent output if using UTC
                    day: '2-digit', month: '2-digit', year: 'numeric'
                });

                // Send completion message using getText and placeholders
                await ctx.reply(
                    getText('profileCompleteMessage', {
                        fullName: user.fullName,
                        birthDate: formattedBirthDate,
                        district: user.district,
                        phone: user.phone,
                        groupLink: groupLink // Pass the link
                    })
                );

            } catch (dbError) {
                console.error(`Failed to save profile for user ${telegramId}:`, dbError);
                await ctx.reply(getText('profileDBSaveError'));
            }
            console.log(`Profile complete for user ${ctx.from.id}:`, currentState);

            await ctx.scene.leave(); // Exit scene after completion or DB error
        }

    } catch (error) {
        console.error(`Error processing text in profile scene for user ${telegramId}:`, error);
        // Use placeholder for button text in generic error message
        await ctx.reply(
            getText('profileGenericSceneError', { cancelButtonText: getText('cancelButton') }),
            cancelBtnMarkup // Still show the cancel button
        );
    }
});

// Handler for non-text messages
profileScene.on('message', async (ctx) => {
    await ctx.reply(
        getText('profileOnlyTextAllowed'), // Add this key to texts.json: "Будь ласка, використовуйте лише текстові повідомлення для відповідей або натисніть 'Скасувати'."
        Markup.inlineKeyboard([Markup.button.callback(getText('cancelButton'), 'cancel_scene')])
    );
});

module.exports = {
    profileScene,
    PROFILE_SCENE_ID
};