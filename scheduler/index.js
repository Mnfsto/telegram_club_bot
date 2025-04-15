const scheduleReminders= require('./trainingReminders')




function startSchedule (bot) {
  scheduleReminders(bot);
    console.log('Cron scheduler started!');
}

module.exports = startSchedule;
