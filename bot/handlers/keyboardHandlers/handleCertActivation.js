const { ACTIVATE_CERT_SCENE_ID } = require('../../scenes/activateCertificate.scene');
async function handleCertActivation (ctx){
    if (ctx.session?.__scenes?.current) {
        return ctx.reply('Пожалуйста, завершите текущее действие или отмените его (/cancel), прежде чем активировать сертификат.');
    }
    console.log(`User ${ctx.from.id} requested certificate activation.`);
    await ctx.scene.enter(ACTIVATE_CERT_SCENE_ID);
}

module.exports = handleCertActivation;