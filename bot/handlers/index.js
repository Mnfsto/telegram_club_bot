const handlerListTrainings = require('./keyboardHandlers/handleListTrainings');
const handleShare = require('./keyboardHandlers/handleShare');
const handleCheckIt = require('./keyboardHandlers/handleCheckIt');
const handleAddWorkout = require('./keyboardHandlers/handleAddWorkout');
const handleDeleteWorkout = require('./keyboardHandlers/handleDeleteWorkout');
const handleRank = require('./keyboardHandlers/handleRank');
const handleJoinClub = require('./keyboardHandlers/handleJoinClub');
const handleRemind = require('./keyboardHandlers/handleRemind');
const handleSendWorkout = require('./keyboardHandlers/handleSendWorkout');
const handleRateUs = require('./keyboardHandlers/handleRateUs');
const handleNextTraining = require('./keyboardHandlers/handleNextTraining');
const handleCertActivation = require('./keyboardHandlers/handleCertActivation');
const { isAdmin } = require('../middlewares/auth.js');
const { getText } =  require('../../locales');

const commonButtonActions = new Map([
    [getText('trainingListBtn'), handlerListTrainings],
    [getText('shareBtn'), handleShare],
    [getText('activateCertBtn'), handleCertActivation],
    [getText('rateUsBtn'), handleRateUs],
]);

const adminButtonActions = new Map([
    [getText('trainingListBtn'), handlerListTrainings],
    [getText('shareBtn'), handleShare],
    [getText('activateCertBtn'), handleCertActivation],
    [getText('rateUsBtn'), handleRateUs],
    [getText('addWorkoutBtn'), handleAddWorkout],
    [getText('deleteWorkoutBtn'), handleDeleteWorkout],
    [getText('sendWorkoutBtn'), handleSendWorkout],
    [getText('checkItBtn'), handleCheckIt],
    [getText('remindEveryoneBtn'), handleRemind],
]);

const userButtonActions = new Map([
    [getText('trainingListBtn'), handlerListTrainings],
    [getText('shareBtn'), handleShare],
    [getText('activateCertBtn'), handleCertActivation],
    [getText('rateUsBtn'), handleRateUs],
    [getText('rankBtn'), handleRank],
    [getText('joinClubBtn'), handleJoinClub],
    [getText('nextTrainingBtn'), handleNextTraining],
]);

module.exports = async (ctx, next) => {
    if (!ctx.message?.text || ctx.message.text.trim() === '') {
        return next();
    }
    if (ctx.session?.__scenes?.current) {
        return next();
    }

    try {
        const messageText = ctx.message.text;
        let handler = null;
        const userIsAdmin = await isAdmin(ctx);

        const actionMap = userIsAdmin ? adminButtonActions : userButtonActions;

        handler = actionMap.get(messageText);

        if (handler) {
            await handler(ctx);
        } else {
            return next();
        }
    } catch (err) {
        console.error('[Keyboard Middleware] Error:', err);
    }
};
