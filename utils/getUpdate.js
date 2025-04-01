// function getTelegramUpdates(botToken) {
//     const url = `https://api.telegram.org/bot${botToken}/getUpdates?offset=-1`;
//     try{
//         const res = fetch(url).then((res) => res.json());
//         const telegramUpd = Promise.resolve(res)
//         return telegramUpd;
//     } catch (err){
//         console.error('failed getTelegramUpdates');
//     }
// }
// getTelegramUpdates(`8009995385:AAE-joZc_Pbr1rs6IRJIHSo_gcCaJM0KS6I`).then((res) => {console.log(res)});

async function getTelegramUpdates(botToken) {
    const url = `https://api.telegram.org/bot${botToken}/getUpdates`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Ошибка при получении обновлений:", error);
        return null;
    }
}

// Замените 'YOUR_BOT_TOKEN' на токен вашего бота
const botToken = "8009995385:AAE-joZc_Pbr1rs6IRJIHSo_gcCaJM0KS6I";

getTelegramUpdates(botToken).then((updates) => {
    if (updates && updates.result) {
        // Обрабатываем полученные обновления
        console.log(updates);
        if (updates.result.length > 0){
            const chatId = updates.result[0].message.chat.id;
            console.log("ID чата:", chatId);
        }
    }
});