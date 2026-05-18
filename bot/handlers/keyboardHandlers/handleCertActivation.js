const { ACTIVATE_CERT_SCENE_ID } = require('../../scenes/activateCertificate.scene');

async function handleCertActivation (ctx){
    if (ctx.session?.__scenes?.current) {
        return ctx.reply('Будь ласка, завершіть поточну дію або скасуйте її (/cancel), перш ніж активувати сертифікат.');
    }
    console.log(`User ${ctx.from.id} requested certificate activation.`);
    await ctx.scene.enter(ACTIVATE_CERT_SCENE_ID);
}

module.exports = handleCertActivation;