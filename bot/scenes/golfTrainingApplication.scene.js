const { Scenes, Markup } = require('telegraf');
const User = require('../../models/user');
const GolfApplication = require('../../models/golfApplication');
const { getOrCreateUser } = require('../middlewares/auth');
const { getText } =  require('../../locales');
const { appendToSheet, createCalendarEvent } = require('../../api/googleApiService');
const { calculateAvailableDate } = require('../utils/dateUtils');

const GOLF_APPLICATION_SCENE_ID = 'golfApplicationScene';

const golfApplicationScene = new Scenes.BaseScene(GOLF_APPLICATION_SCENE_ID);

const trainingInfo = {
    clubName: "ODESA GOLF CLUB",
    title: "🏌️‍♂️ТРЕНУВАННЯ ДЛЯ ДІТЕЙ ТА ДОРОСЛИХ",
    scheduleDays: "Пн–Пт",
    scheduleTimes: "09:00–10:30 та 15:00–18:00",
    ageRange: "9–16 років",
    location: "Ланжерон",
    note: "За попередньою заявкою"
};

const getTrainingInfoTextForChild = () => {
    return `${trainingInfo.clubName}\n${trainingInfo.title}\n` +
        `📆 ${trainingInfo.scheduleDays} | ${trainingInfo.scheduleTimes}\n` +
        `👧🧒 Вік: ${trainingInfo.ageRange}\n` +
        `📍 Локація: ${trainingInfo.location}\n` +
        `🔔 ${trainingInfo.note}`;
};

const getGeneralTrainingInfoText = () => {
    return `${trainingInfo.clubName}\n🏌️‍♂️ ТРЕНУВАННЯ З ГОЛЬФУ\n` +
        `📆 Дні: ${trainingInfo.scheduleDays}\n` +
        `⏰ Час: ${trainingInfo.scheduleTimes}\n` +
        `📍 Локація: ${trainingInfo.location}\n` +
        `🔔 ${trainingInfo.note}`;
};

const daysOfWeek = [
    { text: 'Понеділок', callback_data: 'golf_day_mon' },
    { text: 'Вівторок', callback_data: 'golf_day_tue' },
    { text: 'Середа', callback_data: 'golf_day_wed' },
    { text: 'Четвер', callback_data: 'golf_day_thu' },
    { text: 'П\'ятниця', callback_data: 'golf_day_fri' },
];

const timeSlots = [
    { text: '09:00–10:30 (Ранок)', callback_data: 'golf_time_morning' },
    { text: '15:00–18:00 (Вечір)', callback_data: 'golf_time_evening' },
];

golfApplicationScene.enter(async (ctx) => {
    console.log(`User ${ctx.from.id} entered golf application scene.`);
    ctx.scene.state.applicationData = {};
    await ctx.reply(
        getText('golfAppChooseApplicantType'),
        Markup.inlineKeyboard([
            [Markup.button.callback(getText('golfAppApplicantTypeAdult'), 'applicant_adult')],
            [Markup.button.callback(getText('golfAppApplicantTypeChild'), 'applicant_child')],
            [Markup.button.callback(getText('cancelButton'), 'cancel_scene_golf_app')]
        ])
    );
});

golfApplicationScene.action('cancel_scene_golf_app', async (ctx) => {
    console.log(`User ${ctx.from.id} cancelled golf application scene via button.`);
    await ctx.answerCbQuery(getText('golfAppCancelledCbQuery'));
    try {
        await ctx.editMessageText(getText('golfAppCancelledMessage'));
    } catch (e) {
        await ctx.reply(getText('golfAppCancelledMessage'));
    }
    return await ctx.scene.leave();
});

golfApplicationScene.command('cancel', async (ctx) => {
    console.log(`User ${ctx.from.id} cancelled golf application scene via command.`);
    await ctx.reply(getText('golfAppCancelledMessage'));
    return await ctx.scene.leave();
});

golfApplicationScene.action('applicant_adult', async (ctx) => {
    const state = ctx.scene.state.applicationData;
    state.applicantType = 'adult';
    console.log(`[GolfApp] User ${ctx.from.id} selected applicant type: adult`);
    await ctx.answerCbQuery(getText('golfAppApplicantTypeSelectedAdultCb'));
    try {
        await ctx.editMessageReplyMarkup(undefined);
    } catch(e) { console.warn("Could not edit message for applicant_adult")}
    await ctx.reply(getGeneralTrainingInfoText());
    await ctx.reply(
        getText('golfAppEnterAdultName'),
        Markup.inlineKeyboard([Markup.button.callback(getText('cancelButton'), 'cancel_scene_golf_app')])
    );
});

golfApplicationScene.action('applicant_child', async (ctx) => {
    const state = ctx.scene.state.applicationData;
    state.applicantType = 'child';
    console.log(`[GolfApp] User ${ctx.from.id} selected applicant type: child`);
    await ctx.answerCbQuery(getText('golfAppApplicantTypeSelectedChildCb'));
    try {
        await ctx.editMessageReplyMarkup(undefined);
    } catch(e) { console.warn("Could not edit message for applicant_child")}
    await ctx.reply(getTrainingInfoTextForChild());
    await ctx.reply(
        getText('golfAppEnterPromptChildName'),
        Markup.inlineKeyboard([Markup.button.callback(getText('cancelButton'), 'cancel_scene_golf_app')])
    );
});

golfApplicationScene.on('text', async (ctx) => {
    const state = ctx.scene.state.applicationData;
    const userAnswer = ctx.message.text.trim();
    const telegramId = ctx.from.id;
    const cancelBtnMarkup = Markup.inlineKeyboard([Markup.button.callback(getText('cancelButton'), 'cancel_scene_golf_app')]);

    if (!state.applicantType) {
        return ctx.reply(getText('golfAppPleaseSelectApplicantType'), cancelBtnMarkup);
    }

    try {
        if (state.applicantType === 'child') {
            if (!state.childFullName) {
                if (userAnswer.length < 5 || !userAnswer.includes(' ')) {
                    return ctx.reply(getText('golfAppChildNameFormatError'), cancelBtnMarkup);
                }
                state.childFullName = userAnswer;
                console.log(`[GolfApp] User ${telegramId} - Child's Name: ${state.childFullName}`);
                await ctx.reply(getText('golfAppPromptChildAge', { ageRange: trainingInfo.ageRange }), cancelBtnMarkup);
            }
            else if (!state.childAge) {
                const age = parseInt(userAnswer, 10);
                if (isNaN(age) || age < 9 || age > 16) {
                    return ctx.reply(getText('golfAppChildAgeInvalidError', { ageRange: trainingInfo.ageRange }), cancelBtnMarkup);
                }
                state.childAge = age;
                console.log(`[GolfApp] User ${telegramId} - Child's Age: ${state.childAge}`);
                await ctx.reply(getText('golfAppPromptParentPhone'), cancelBtnMarkup);
            }
            else if (!state.contactPhone) {
                if (!/^\+?\d{10,15}$/.test(userAnswer.replace(/\s+/g, ''))) {
                    return ctx.reply(getText('golfAppParentPhoneFormatError'), cancelBtnMarkup);
                }
                state.contactPhone = userAnswer.replace(/\s+/g, '');
                console.log(`[GolfApp] User ${telegramId} - Parent's Phone: ${state.contactPhone}`);
                await requestDaySelection(ctx);
            }
        }
        else if (state.applicantType === 'adult') {
            if (!state.applicantFullName) {
                if (userAnswer.length < 5 || !userAnswer.includes(' ')) {
                    return ctx.reply(getText('golfAppAdultNameFormatError'), cancelBtnMarkup);
                }
                state.applicantFullName = userAnswer;
                console.log(`[GolfApp] User ${telegramId} - Adult's Name: ${state.applicantFullName}`);
                await ctx.reply(getText('golfAppPromptAdultPhone'), cancelBtnMarkup);
            }
            else if (!state.contactPhone) {
                if (!/^\+?\d{10,15}$/.test(userAnswer.replace(/\s+/g, ''))) {
                    return ctx.reply(getText('golfAppAdultPhoneFormatError'), cancelBtnMarkup);
                }
                state.contactPhone = userAnswer.replace(/\s+/g, '');
                console.log(`[GolfApp] User ${telegramId} - Adult's Phone: ${state.contactPhone}`);
                await requestDaySelection(ctx);
            }
        }

        if (state.contactPhone && !state.selectedDay) {
            await ctx.reply(getText('golfAppPleaseSelectDayFromButtons'), cancelBtnMarkup);
        }
        else if (state.selectedDay && !state.selectedTimeSlot) {
            await ctx.reply(getText('golfAppPleaseSelectTimeFromButtons'), cancelBtnMarkup);
        }

    } catch (error) {
        console.error(`Error in golfApplicationScene (text input) for user ${telegramId}:`, error);
        await ctx.reply(getText('golfAppGenericError'));
        await ctx.scene.leave();
    }
});

async function requestDaySelection(ctx) {
    const dayButtons = daysOfWeek.map(day => [Markup.button.callback(day.text, day.callback_data)]);
    dayButtons.push([Markup.button.callback(getText('cancelButton'), 'cancel_scene_golf_app')]);
    await ctx.reply(
        getText('golfAppPromptDayOfWeek'),
        Markup.inlineKeyboard(dayButtons)
    );
}

daysOfWeek.forEach(day => {
    golfApplicationScene.action(day.callback_data, async (ctx) => {
        const state = ctx.scene.state.applicationData;
        if (!state.applicantType || !state.contactPhone) {
            await ctx.answerCbQuery(getText('golfAppCompletePreviousStepsCb'));
            return;
        }
        if (state.selectedDay) {
            return ctx.answerCbQuery(getText('golfAppDayAlreadySelected'));
        }
        state.selectedDay = day.text;
        state.selectedDayCallback = day.callback_data;
        console.log(`[GolfApp] User ${ctx.from.id} - Selected Day: ${state.selectedDay}`);
        const tempTimeSlotForDateCalc = timeSlots[0].text
        const nextDateTimes = calculateAvailableDate(state.selectedDay, tempTimeSlotForDateCalc);
        let dateMessagePart = '';
        if (nextDateTimes) {
            state.preliminaryDate = nextDateTimes.startDate;
            const dateOptions = { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Kiev' };
            dateMessagePart = getText('golfAppDayApproximateDate', {
                date: nextDateTimes.startDate.toLocaleDateString('uk-UA', dateOptions)
            });
        }
        await ctx.answerCbQuery(`Обрано: ${day.text}${dateMessagePart}`);
        try {
            await ctx.editMessageReplyMarkup(undefined);
        } catch (e) { console.warn("Could not edit previous message reply markup for day selection.")}

        const timeSlotButtons = timeSlots.map(slot => [Markup.button.callback(slot.text, slot.callback_data)]);
        timeSlotButtons.push([Markup.button.callback(getText('backToDaySelectionButton'), 'golf_back_to_day_selection')]);
        timeSlotButtons.push([Markup.button.callback(getText('cancelButton'), 'cancel_scene_golf_app')]);

        await ctx.reply(
            getText('golfAppPromptTimeSlot', { day: state.selectedDay, dateInfo: dateMessagePart.trim() }),
            Markup.inlineKeyboard(timeSlotButtons)
        );
    });
});

timeSlots.forEach(slot => {
    golfApplicationScene.action(slot.callback_data, async (ctx) => {
        const state = ctx.scene.state.applicationData;
        if (!state.selectedDay) {
            await ctx.answerCbQuery(getText('golfAppSelectDayFirstCb'));
            return;
        }
        if (state.selectedTimeSlot) {
            return ctx.answerCbQuery(getText('golfAppTimeAlreadySelected'));
        }
        state.selectedTimeSlot = slot.text;
        state.selectedTimeSlotCallback = slot.callback_data;
        console.log(`[GolfApp] User ${ctx.from.id} - Selected Time: ${state.selectedTimeSlot}`);
        const finalDateTimes = calculateAvailableDate(state.selectedDay, state.selectedTimeSlot);
        let finalDateTimeMessagePart = '';
        if (finalDateTimes) {
            state.finalCalculatedDate = finalDateTimes.startDate;
            const dateTimeOptions = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Kiev' };
            finalDateTimeMessagePart = finalDateTimes.startDate.toLocaleString('uk-UA', dateTimeOptions);
        } else {
            finalDateTimeMessagePart = getText('golfAppDateTimeCalcError');
        }

        await ctx.answerCbQuery(`Обрано: ${slot.text}. Орієнтовна дата: ${finalDateTimeMessagePart}`);
        try {
            await ctx.editMessageReplyMarkup(undefined);
        } catch (e) { console.warn("Could not edit previous message reply markup for time selection.")}

        let simpleConfMsg = getText('golfAppConfirmationHeader');
        const params = {
            childFullName: state.childFullName,
            childAge: state.childAge,
            applicantFullName: state.applicantFullName,
            contactPhone: state.contactPhone,
            selectedDay: state.selectedDay,
            selectedTimeSlot: state.selectedTimeSlot,
            calculatedDateTime: finalDateTimeMessagePart,
        };

        if (state.applicantType === 'child') {
            simpleConfMsg += `\n${getText('golfAppConfChildName', params )}`;
            simpleConfMsg += `\n${getText('golfAppConfChildAge', params )}`;
        } else {
            simpleConfMsg += `\n${getText('golfAppConfAdultName', params )}`;
        }
        simpleConfMsg += `\n${getText('golfAppConfPhone', params )}`;
        simpleConfMsg += `\n${getText('golfAppConfDayTime', params )}`;
        simpleConfMsg += `\n${getText('golfAppConfCalculatedDate', params )}`;
        simpleConfMsg += `\n\n${getText('golfAppConfCorrect')}`;


        await ctx.reply(
            simpleConfMsg,
            Markup.inlineKeyboard([
                [Markup.button.callback(getText('confirmButton'), 'confirm_golf_application')],
                [Markup.button.callback(getText('backToTimeSelectionButton'), 'golf_back_to_time_selection')],
                [Markup.button.callback(getText('cancelButton'), 'cancel_scene_golf_app')]
            ])
        );
    });
});

golfApplicationScene.action('golf_back_to_day_selection', async (ctx) => {
    const state = ctx.scene.state.applicationData;
    delete state.selectedDay;
    delete state.selectedDayCallback;
    delete state.selectedTimeSlot;
    delete state.selectedTimeSlotCallback;

    await ctx.answerCbQuery();
    try {
        await ctx.editMessageReplyMarkup(undefined);
    } catch (e) {console.warn("Could not edit previous message reply markup for golf_back_to_day_selection.")}
    await requestDaySelection(ctx);
});

golfApplicationScene.action('golf_back_to_time_selection', async (ctx) => {
    const state = ctx.scene.state.applicationData;
    delete state.selectedTimeSlot;
    delete state.selectedTimeSlotCallback;

    await ctx.answerCbQuery();
    try {
        await ctx.editMessageReplyMarkup(undefined);
    } catch (e) {console.warn("Could not edit previous message reply markup for golf_back_to_time_selection.")}

    const timeSlotButtons = timeSlots.map(slot => [Markup.button.callback(slot.text, slot.callback_data)]);
    timeSlotButtons.push([Markup.button.callback(getText('backToDaySelectionButton'), 'golf_back_to_day_selection')]);
    timeSlotButtons.push([Markup.button.callback(getText('cancelButton'), 'cancel_scene_golf_app')]);
    await ctx.reply(
        getText('golfAppPromptTimeSlot', { day: state.selectedDay }),
        Markup.inlineKeyboard(timeSlotButtons)
    );
});

golfApplicationScene.action('confirm_golf_application', async (ctx) => {
    await ctx.answerCbQuery(getText('golfAppProcessing'));
    try {
        await ctx.editMessageReplyMarkup(undefined);
    } catch (e) {console.warn("Could not edit previous message reply markup for confirmation.")}
    await finalizeGolfApplication(ctx);
});

async function finalizeGolfApplication(ctx) {
    const telegramId = ctx.from.id;
    const state = ctx.scene.state.applicationData;
    const adminChatId = process.env.GOLF_ADMIN_CHAT_ID || process.env.ADMIN_CHAT_ID;

    console.log(`[GolfApp] Finalizing application for user ${telegramId}, type: ${state.applicantType}`);
    console.log("[GolfApp] Current state data for finalization:", JSON.stringify(state, null, 2));

    try {
        const applicantUser = await getOrCreateUser(ctx);

        const applicationDetailsToSave = {
            applicantTelegramId: telegramId,
            applicantUsername: applicantUser.username,
            applicantName: applicantUser.name,
            contactPhone: state.contactPhone,
            selectedDay: state.selectedDay,
            selectedTimeSlot: state.selectedTimeSlot,
            status: 'Нова',
            applicantType: state.applicantType,
        };

        if (state.applicantType === 'child') {
            applicationDetailsToSave.childFullName = state.childFullName;
            applicationDetailsToSave.childAge = state.childAge;
        } else {
            applicationDetailsToSave.applicantFullName = state.applicantFullName;
        }

        if (state.finalCalculatedDate instanceof Date && !isNaN(state.finalCalculatedDate)) {
            applicationDetailsToSave.calculatedTrainingDate = state.finalCalculatedDate;
        }

        const newApplication = new GolfApplication(applicationDetailsToSave);
        await newApplication.save();
        console.log(`[GolfApp] New golf application saved: ${newApplication._id}`);

        const fullApplicationDataForServices = {
            ...applicationDetailsToSave,
            idForDisplay: newApplication._id.toString().slice(-6),
            applicantTGName: applicantUser.name,
            applicantTGUsername: applicantUser.username,
            applicationDateFormatted: newApplication.createdAt.toLocaleString('uk-UA', { timeZone: 'Europe/Kiev' }),
            calculatedDateTimeFormatted: state.finalCalculatedDate instanceof Date && !isNaN(state.finalCalculatedDate)
                ? state.finalCalculatedDate.toLocaleString('uk-UA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : getText('golfAppDateTimeCalcErrorForUser')
        };

        appendToSheet(fullApplicationDataForServices).catch(err => console.error("Error in appendToSheet promise:", err));

        if (state.finalCalculatedDate instanceof Date && !isNaN(state.finalCalculatedDate)) {
            let eventEndDate = new Date(state.finalCalculatedDate);
            const [, endTimeStrWithLabel] = state.selectedTimeSlot.split('–');
            const endTimeStr = endTimeStrWithLabel.split('(')[0].trim();
            const [endHour, endMinute] = endTimeStr.split(':').map(Number);

            if (!isNaN(endHour) && !isNaN(endMinute)) {
                eventEndDate.setHours(endHour, endMinute, 0, 0);

                createCalendarEvent({
                    applicantType: state.applicantType,
                    childFullName: state.childFullName,
                    applicantFullName: state.applicantFullName,
                    contactPhone: state.contactPhone,
                    applicantUsername: applicantUser.username,
                    applicantName: applicantUser.name,
                    applicantTelegramId: telegramId,
                    eventStartDateTime: state.finalCalculatedDate,
                    eventEndDateTime: eventEndDate,
                    selectedDayText: state.selectedDay,
                    selectedTimeSlotText: state.selectedTimeSlot,
                }).catch(err => console.error("Error in createCalendarEvent promise:", err));
            } else {
                console.warn("[GolfApp] Could not parse end time for calendar event from slot:", state.selectedTimeSlot);
            }
        } else {
            console.warn("[GolfApp] finalCalculatedDate is not valid for calendar event creation.");
        }

        if (adminChatId) {
            try {
                let adminMessageText;
                const adminParams = {
                    id: fullApplicationDataForServices.idForDisplay,
                    selectedDay: state.selectedDay,
                    selectedTimeSlot: state.selectedTimeSlot,
                    applicationDate: fullApplicationDataForServices.applicationDateFormatted,
                    calculatedDateTime: fullApplicationDataForServices.calculatedDateTimeFormatted
                };

                if (state.applicantType === 'child') {
                    adminParams.applicant = applicantUser.username ? `@${applicantUser.username}` : (applicantUser.name || `ID:${telegramId}`);
                    adminParams.childFullName = state.childFullName;
                    adminParams.childAge = state.childAge;
                    adminParams.parentPhone = state.contactPhone;
                    adminMessageText = getText('golfAppAdminNotifyChild', adminParams);
                } else {
                    adminParams.applicantFullName = state.applicantFullName;
                    adminParams.contactPhone = state.contactPhone;
                    adminParams.filledBy = applicantUser.username ? `@${applicantUser.username}` : (applicantUser.name || `ID:${telegramId}`);
                    adminMessageText = getText('golfAppAdminNotifyAdult', adminParams);
                }
                await ctx.telegram.sendMessage(adminChatId, adminMessageText);
                console.log(`[GolfApp] Admin notification sent to ${adminChatId}`);
            } catch (adminNotifyError) {
                console.error(`[GolfApp] Failed to send admin notification to ${adminChatId}:`, adminNotifyError);
            }
        } else {
            console.warn("[GolfApp] GOLF_ADMIN_CHAT_ID or ADMIN_CHAT_ID not set. Skipping admin notification.");
        }

        const userSuccessMessageParams = {
            personName: state.applicantType === 'child' ? state.childFullName : state.applicantFullName,
            day: state.selectedDay,
            time: state.selectedTimeSlot,
            calculatedDateTime: fullApplicationDataForServices.calculatedDateTimeFormatted
        };
        await ctx.reply(getText('golfAppSuccessUserWithDate', userSuccessMessageParams));

    } catch (dbError) {
        console.error(`[GolfApp] Database error during finalization for user ${telegramId}:`, dbError);
        await ctx.reply(getText('golfAppDbError'));
    } finally {
        await ctx.scene.leave();
    }
}

golfApplicationScene.on('message', async (ctx) => {
    const state = ctx.scene.state.applicationData;
    let expectingText = false;
    if (!state.applicantType) expectingText = false;
    else if (state.applicantType === 'child') {
        if (!state.childFullName || !state.childAge || !state.contactPhone) expectingText = true;
    } else if (state.applicantType === 'adult') {
        if (!state.applicantFullName || !state.contactPhone) expectingText = true;
    }

    if (expectingText) {
        await ctx.reply(
            getText('golfAppOnlyTextAllowed'),
            Markup.inlineKeyboard([Markup.button.callback(getText('cancelButton'), 'cancel_scene_golf_app')])
        );
    } else {
        await ctx.reply(getText('golfAppUseButtonsOrCancel'));
    }
});

module.exports = {
    golfApplicationScene,
    GOLF_APPLICATION_SCENE_ID
};