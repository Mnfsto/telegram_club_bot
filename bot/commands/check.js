const User = require("../../models/user");
const Training = require('../../models/training');
const { awardPixels } = require('../utils/pixelSystem');
const {formatDates} = require('../utils/dateUtils');
const { Markup } = require('telegraf');

async function checkCommand (ctx){
  try {
    const date = new Date();
    const today = formatDates(date);
    console.log(today);

    const trainToday = await Training.find({ date: { $gte: today }});
   if (trainToday.length === 0){
       ctx.reply(`На сьогодні (${today}) тренувань не знайдено.`);
   }
   if (trainToday.length > 1){
       const buttons = trainToday.map(t => [
           Markup.button.callback(`🕒 ${t.time} - ${t.location}`, `check_tr_${t._id}`)])
       return ctx.reply('Виберіть тренування для перевірки:', Markup.inlineKeyboard(buttons))
   }
   await showParticipantList(ctx, trainToday[0]);
  } catch (err) {
      console.error("Failed check", err);
      process.on('unhandledRejection', (reason, promise) => {
        console.log({unhandledRejection: {reason, promise}})})
  }
};

async function showParticipantList (ctx, training, isEdit = false){
    const participants = await User.find({ _id: { $in: training.participants } });
    if (participants.length === 0) {
        const msg = `На тренування о ${training.time} ніхто не записався.`;
        return isEdit? ctx.editMessageText(msg) : ctx.reply(msg);
    }
    const buttons = participants.map( user => {
        const isAttended = training.attended.some( id => id.equals(user._id));
        const status = isAttended ? '✅' : '⬜';
        const name = user.username ? `@${user.username}` : (user.fullName || user.name);
        return [Markup.button.callback(`${status} ${name}`, `tgl_atn_${training._id}_${user._id}`)];
    });

    buttons.push([Markup.button.callback('🏁 Завершити та нарахувати бали', `award_atn_${training._id}`)]);
    const text = `📝 **Перевірка присутніх**\n${training.date} о ${training.time}\n\nНатисніть на ім'я, щоб відмітити:`
    if (isEdit) {
            return ctx.editMessageText(text, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) });
        } else {
            return ctx.reply(text, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) });
        }
};


module.exports = { checkCommand, showParticipantList };