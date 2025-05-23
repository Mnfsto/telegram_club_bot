const User = require("../../../models/user");


async function handleJoinClub (ctx) {
    const user = await User.findOne({ telegramId: ctx.from.id });
    const groupLink = process.env.GROUP_LINK;
    if (user && user.joinedClub) {
        return ctx.reply(`Вы уже в клубе! Вот ссылка на группу:\n${groupLink}`);
    }
    const clubPolicy = `
      Умови участі в Pixel Fighter
    
    Ласкаво просимо до Pixel Fighter – дитячого велоклубу, де спорт перетворюється на справжню гру! 🚴‍♀️🎮
    
    Хто може брати участь:
    Усі діти від 6 років, які люблять кататися на велосипеді та хочуть тренуватись у дружній компанії.
    
    Умови:
    - Участь безкоштовна.
    - Купувати форму **не обов’язково**, але за бажанням її можна буде замовити.
    - Головне – бажання вчитись, розвиватись та весело проводити час!
    
     Що ви отримаєте:
    - Веселі тренування з досвідченими тренерами.
    - Нових друзів та командний дух.
    - Участь у велоіграх, квестах та змаганнях.
    - Можливість стати сильнішим і впевненішим спортсменом.
    
     Що ми очікуємо:
    - Бути доброзичливими та поважати інших учасників і тренерів.
    - Дотримуватись правил безпеки.
    - Підтримувати свою команду.
    
     Підтвердження:
    Дитина та батьки погоджуються з цими простими правилами й готові стати частиною команди Pixel Fighter.
`;

    try {
        console.log('Отправляем контракт с кнопками');
        await ctx.reply(clubPolicy, {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: 'Вступить', callback_data: 'join_agree' },
                        { text: 'Отказаться', callback_data: 'join_decline' }
                    ]
                ]
            }
        });
    } catch (err) {
        console.error('Ошибка при отправке сообщения:', err);
        await ctx.reply('Произошла ошибка. Попробуйте снова.');
    }
}

module.exports = handleJoinClub;