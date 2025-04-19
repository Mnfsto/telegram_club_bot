const handlerListTrainings = require('./keyboardHandlers/handleListTrainings');
const handleShare = require('./keyboardHandlers/handleShare');
const handleCheckIt =require('./keyboardHandlers/handleCheckIt');
const handleAddWorkout = require('./keyboardHandlers/handleAddWorkout');
const handleDeleteWorkout = require('./keyboardHandlers/handleDeleteWorkout');
const handleRank = require('./keyboardHandlers/handleRank');
const handleJoinClub = require('./keyboardHandlers/handleJoinClub');
const handleRemind = require('./keyboardHandlers/handleRemind');
const handleSendWorkout = require('./keyboardHandlers/handleSendWorkout');
const handleRateUs = require('./keyboardHandlers/handleRateUs');
const handleNextTraining = require('./keyboardHandlers/handleNextTraining');
const { isAdmin } = require('../middlewares/auth.js');

const commonButtonActions = new Map([
    ["🗓️ Training List", handlerListTrainings],
    ["👥 Share", handleShare],
    ["✔️ Check it", handleCheckIt],
]);

const adminButtonActions = new Map([
    ...commonButtonActions,
    ["🚴 Add a Workout", handleAddWorkout],
    ["❌ Delete Workout", handleDeleteWorkout],
]);

const userButtonActions = new Map([
    ["📈 Rank", handleRank],
    ["🚴 Join Club 🚴", handleJoinClub],
    ["⭐️ Rate us", handleRateUs],
    ["🚴 Next training", handleNextTraining],

]);



 module.exports = async (ctx, next) => {
    if (!ctx.message?.text) return next();
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

