const { getText} = require('../../locales');
async function trainingInfo (ctx){
    try {

        ctx.reply(getText('trainingProcessInfo', {trainingListBtn: getText('trainingListBtn')}));

    }catch (err){
        console.log('Training Info',err);
    }
};

module.exports = trainingInfo;