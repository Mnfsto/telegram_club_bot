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
        console.error(err)
        console.log('User not created ')
    }
}
async function checkUserName(ctx, next) {
    try {
        const telegramId = ctx.from.id;
        const username = ctx.from.username;
        let user = await User.findOne({telegramId})
        if (!user.username){
            user.username = username;
            await user.save();
        }
        next();
    } catch (err){
        console.error(err);
        console.log('Username not checked')
    }


}
async function checkAdmin(ctx, next) {
    const user = await User.findOne({ telegramId: ctx.from.id });
    if (user && user.role === 'admin') {
        await next();
    } else {
        ctx.reply('У вас нет прав для выполнения этой команды.');
    }

}




async function isAdmin (ctx) {

    if (!ctx.from || !ctx.from.id) {
        console.warn('checkIsAdmin: ctx.from.id is missing');
        return false;
    }
    try {
        const user = await User.findOne({ telegramId: ctx.from.id });
        return !!(user && user.role === 'admin');
    } catch (err) {
        console.error('Error checking admin status:', err);
        return false;
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
    getOrCreateUser, checkAdmin, isAdmin, getParticipants, checkUserName, greetedUsers,
}