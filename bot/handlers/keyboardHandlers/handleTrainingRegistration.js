const { GOLF_APPLICATION_SCENE_ID } = require('../../scenes/golfTrainingApplication.scene');

async function handleCertActivation (ctx){
    if (ctx.session?.__scenes?.current) {
        return ctx.reply('Будь ласка, завершіть поточну дію або скасуйте її (/cancel), перш ніж Региструватись.');
    }
    console.log(`User ${ctx.from.id} requested training registration.`);
    await ctx.scene.enter(GOLF_APPLICATION_SCENE_ID);
}

module.exports = handleCertActivation;