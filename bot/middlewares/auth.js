const mongoose = require('mongoose');
const User = require('../../models/user.js')

const greetedUsers = new Set();

async function getOrCreateUser (ctx) {
    const telegramId = ctx.from.id;
    try{
        let user = await User.findOne({telegramId});
        if (!user) {
            user = new User({
                telegramId,
                name: ctx.from.first_name,
                username: ctx.from.username,
                role: process.env.ADMIN_CHAT_IDS.split(',').includes(telegramId.toString()) ? 'admin' : 'user',  // Simple admin check
            });
            await user.save();
        }
        return user;
    }catch(err){
        console.log(err)
    }
}

async function checkAdmin(ctx, next) {
    const user = await User.findOne({ telegramId: ctx.from.id });
    if (user && user.role === 'admin') {
        await next(); // Выполнить следующий обработчик (команду)
    } else {
        ctx.reply('У вас нет прав для выполнения этой команды.');
    }

}

async function getParticipants (ctx, training){
    const telegramId = ctx.from.id;
    try {
        let user = await User.findOne({telegramId});
        let currentTraining = await Training.findOne({telegramId});
    } catch(err) {

    }
}

module.exports = {
    getOrCreateUser, checkAdmin, getParticipants, greetedUsers
}