const scheduleReminders= require('./trainingReminders')
const {bot} = require("../bot");


function startSchedule (bot) {
  scheduleReminders(bot);
    console.log('Cron scheduler started!');
}

module.exports = startSchedule;
