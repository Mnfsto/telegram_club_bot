const botToken = process.env.BOT_TOKEN;
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






module.exports = getTelegramUpdates(botToken).then((updates) => {
    if (updates && updates.result) {

        console.log(updates);
        if (updates.result.length > 0){
            const chatId = updates.result[0].message.chat.id;
            console.log("ID чата:", chatId);
        }
    }
});