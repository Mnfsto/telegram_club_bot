const Certificate = require('../../models/certificates');



/**
 * @param {string[]}
 * @param {object} commonData
 * @param {number} commonData.nominal
 * @param {string} [commonData.currency]
 * @param {Date} [commonData.expiresAt]
 */
async function createBatchCertificates(codes, commonData) {
    if (!codes || codes.length === 0) {
        console.log("Список кодов пуст. Сертификаты не созданы.");
        return [];
    }

    const certificatesToInsert = codes.map(code => ({
        code: code.toUpperCase().trim(),
        nominal: commonData.nominal,
        currency: commonData.currency,
        expiresAt: commonData.expiresAt,
        status: 'Активен',

    }));

    try {

        const insertedCertificates = await Certificate.insertMany(certificatesToInsert, { ordered: false });

        console.log(`Успешно создано и сохранено ${insertedCertificates.length} сертификатов.`);
        // console.log(insertedCertificates);
        return insertedCertificates;

    } catch (error) {
        console.error('Ошибка при создании партии сертификатов:', error.message);
        if (error.name === 'BulkWriteError') {
            console.error('Детали ошибки вставки:');

            error.writeErrors?.forEach(err => {
                console.error(`  - Ошибка для документа ${err.index}: ${err.errmsg}`);
            });
            console.error(`  - Количество успешно вставленных (при ordered:false это может быть неточно): ${error.result?.nInserted || 0}`);
        }
        return [];
    }
}


async function addCertCommand(ctx){
    const [_, ...codes] = ctx.message.text.split(' ');
    const commonInfo = {
        nominal: 25,
        currency: 'PIXELS',
        expiresAt: new Date('2025-12-31')
    };
    if (!codes) return ctx.reply('Использование: /creat_cert cdb-23434 cbd-434234 ...');
    try {
        console.log(codes)
        createBatchCertificates(codes, commonInfo);
    }  catch (err){
        console.error('failed add training');
        console.log(err);
    }
};

module.exports = addCertCommand;