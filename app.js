require('dotenv').config();
const http = require('http')
const {bot} = require('./bot')
const PORT = process.env.PORT || 8088;
const connectDB = require('./config/database')
console.log(`PORT: ${PORT}`);
//Application server settings
const setupApiServer = require('./api/server.js');
const startScheduler = require('./scheduler')

//Conect DataBase
connectDB();

// Start Server

const appServer = setupApiServer(bot);

const botServer = http.createServer(appServer)
botServer.listen(PORT, () => {
    console.log(`Bot server started on ${PORT}!`);
});

bot.launch().then(() => {
    console.log(`Telegram Bot @${bot.botInfo.username} started successfully!`);
}).catch(err => {
    console.error("Failed to launch Telegram Bot:", err);
    process.exit(1);
});


// Start Cron scheduler
try {
    // startScheduler(bot);
    startScheduler(bot);
    console.log('Cron scheduler started successfully.');
} catch (err) {
    console.error("Failed to start scheduler:", err);

}
// Close Server
process.on("SIGINT", async () => {
    //await client.close();
    console.log("Приложение завершило работу");
    process.exit();
})

process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION! Reason:', reason);
});