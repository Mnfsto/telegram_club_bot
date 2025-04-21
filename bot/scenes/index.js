const { Scenes, Markup } = require('telegraf');
const User = require('../../models/user');

const PROFILE_SCENE_ID = 'userProfile';

const profileScene = new Scenes.BaseScene(PROFILE_SCENE_ID);

profileScene.enter(async (ctx) => {
    console.log(`User ${ctx.from.id} entered profile scene`);

    ctx.scene.state.profileData = {};
    await ctx.reply(
        'Укажите поэтапно информацию о вас в строке ввода текста.\n\nПожалуйста, введите ваше Имя и Фамилию:',
        Markup.inlineKeyboard([
            Markup.button.callback('❌ Отмена', 'cancel_scene')
        ])
    );
});

profileScene.action('cancel_scene', async (ctx) => {
    const telegramId = ctx.from.id;
    console.log(`User ${ctx.from.id} cancelled profile scene via button.`);
    await ctx.answerCbQuery('Заполнение отменено');
    await ctx.editMessageText('Заполнение профиля отменено.');
    try {
        const user = await User.findOne({ telegramId: telegramId });
        if (!user) {
            console.error(`User ${telegramId} not found in DB before saving profile!`);
            await ctx.reply('Произошла внутренняя ошибка. Не удалось найти ваш профиль для сохранения.');
            return await ctx.scene.leave();
        }
        user.joinedClub = false;
        await user.save();
    } catch (err) {
        console.error(`User ${telegramId} not found in DB`, err);
    }
    return await ctx.scene.leave();
});

profileScene.command('cancel', async (ctx) => {
    const telegramId = ctx.from.id;
    console.log(`User ${ctx.from.id} cancelled profile scene`);
    await ctx.reply('Сбор данных отменен.');
    try {
        const user = await User.findOne({ telegramId: telegramId });
        if (!user) {
            console.error(`User ${telegramId} not found in DB before saving profile!`);
            await ctx.reply('Произошла внутренняя ошибка. Не удалось найти ваш профиль для сохранения.');
            return await ctx.scene.leave();
        }
        user.joinedClub = false;
        await user.save();
    } catch (err) {
        console.error(`User ${telegramId} not found in DB`, err);
    }
    await ctx.scene.leave();
});

profileScene.on('text', async (ctx) => {
    const currentState = ctx.scene.state.profileData;
    const userAnswer = ctx.message.text.trim();
    const telegramId = ctx.from.id;
    const groupLink = process.env.GROUP_LINK || 'ССЫЛКА_НА_ГРУППУ_НЕ_ЗАДАНА';
    try {
        if (!currentState.fullName) {
            if (userAnswer.length < 3) {
                return ctx.reply('Имя и Фамилия слишком короткие. Попробуйте еще раз:', Markup.inlineKeyboard([Markup.button.callback('❌ Отмена', 'cancel_scene')]));
            }
            currentState.fullName = userAnswer;
            await ctx.reply('Отлично! Теперь введите вашу полную дату рождения (в формате ДД.ММ.ГГГГ):', Markup.inlineKeyboard([Markup.button.callback('❌ Отмена', 'cancel_scene')]));
            // --- КОНЕЦ ИЗМЕНЕНИЯ ---

            // --- ИЗМЕНЕНИЕ ЛОГИКИ ЗДЕСЬ: Обработка Даты Рождения ---
        } else if (!currentState.birthDate) { // Проверяем новое поле birthDate
            // 1. Парсинг даты
            const dateParts = userAnswer.split('.');
            if (dateParts.length !== 3) {
                return ctx.reply('Неверный формат даты. Пожалуйста, используйте формат ДД.ММ.ГГГГ (например, 15.03.1995):', Markup.inlineKeyboard([Markup.button.callback('❌ Отмена', 'cancel_scene')]));
            }

            const day = parseInt(dateParts[0], 10);
            const month = parseInt(dateParts[1], 10);
            const year = parseInt(dateParts[2], 10);

            // 2. Базовая валидация чисел
            if (isNaN(day) || isNaN(month) || isNaN(year)) {
                return ctx.reply('Дата должна содержать только цифры и точки. Формат: ДД.ММ.ГГГГ:', Markup.inlineKeyboard([Markup.button.callback('❌ Отмена', 'cancel_scene')]));
            }

            // 3. Валидация диапазона года
            const currentYear = new Date().getFullYear();
            const minYear = currentYear - 120; // Максимальный возраст 120 лет
            const maxYear = currentYear - 5;   // Минимальный возраст 5 лет (примерно)
            if (year < minYear || year > maxYear) {
                return ctx.reply(`Год рождения (${year}) кажется неправдоподобным. Укажите год между ${minYear} и ${maxYear}. Формат: ДД.ММ.ГГГГ:`, Markup.inlineKeyboard([Markup.button.callback('❌ Отмена', 'cancel_scene')]));
            }

            // 4. Продвинутая валидация даты (проверка корректности дня и месяца)
            // Месяцы в JS Date начинаются с 0 (0=Январь, 11=Декабрь)
            const monthIndex = month - 1;
            const dateObject = new Date(year, monthIndex, day);

            // Проверяем, не "перескочила" ли дата из-за неверного дня/месяца
            // Например, 31.02.2023 станет 03.03.2023
            if (dateObject.getFullYear() !== year || dateObject.getMonth() !== monthIndex || dateObject.getDate() !== day) {
                return ctx.reply('Некорректная дата (возможно, неверный день для указанного месяца). Пожалуйста, проверьте и введите снова (ДД.ММ.ГГГГ):', Markup.inlineKeyboard([Markup.button.callback('❌ Отмена', 'cancel_scene')]));
            }

            // 5. Сохранение валидной даты в state
            currentState.birthDate = dateObject; // Сохраняем объект Date
            console.log(`Received birthDate: ${currentState.birthDate.toISOString()}`); // Логируем в UTC

            await ctx.reply('Принято. В каком районе города вы проживаете?', Markup.inlineKeyboard([Markup.button.callback('❌ Отмена', 'cancel_scene')]));

        } else if (!currentState.district) {
            if (userAnswer.length < 2) {
                return ctx.reply('Название района слишком короткое. Попробуйте еще раз:', Markup.inlineKeyboard([Markup.button.callback('❌ Отмена', 'cancel_scene')]));
            }
            currentState.district = userAnswer;
            await ctx.reply('Почти готово! Введите ваш контактный номер телефона (например, +380123456789):', Markup.inlineKeyboard([Markup.button.callback('❌ Отмена', 'cancel_scene')]));

        } else if (!currentState.phone) {
            if (!/^\+?\d{10,15}$/.test(userAnswer.replace(/\s+/g, ''))) {
                return ctx.reply('Неверный формат телефона. Пожалуйста, введите номер (только цифры, можно с +):', Markup.inlineKeyboard([Markup.button.callback('❌ Отмена', 'cancel_scene')]));
            }
            currentState.phone = userAnswer;

            console.log(`Profile data collected for user ${telegramId}:`, currentState);
            try {
                const user = await User.findOne({ telegramId: telegramId });
                if (!user) {
                    console.error(`User ${telegramId} not found in DB before saving profile!`);
                    await ctx.reply('Произошла внутренняя ошибка. Не удалось найти ваш профиль для сохранения.');
                    return await ctx.scene.leave();
                }


                user.fullName = currentState.fullName;
                user.birthDate = currentState.birthDate;
                user.district = currentState.district;
                user.phone = currentState.phone;
                user.joinedClub = true;

                await user.save();
                console.log(`User ${telegramId} profile saved successfully.`);
                const formattedBirthDate = currentState.birthDate.toLocaleDateString('ru-RU', {
                    day: '2-digit', month: '2-digit', year: 'numeric'
                });
                await ctx.reply(
                    `Спасибо! Ваш профиль заполнен и сохранен:
                     👤 Имя: ${user.fullName}
                     🎂 Дата рождения: ${formattedBirthDate}
                     📍 Район: ${user.district}
                     📞 Телефон: ${user.phone}

                     Добро пожаловать в клуб! 🎉

                     Присоединяйтесь к нашей основной группе: ${groupLink}`
                );

            } catch (dbError) {
                console.error(`Failed to save profile for user ${telegramId}:`, dbError);
                await ctx.reply('Произошла ошибка при сохранении вашего профиля. Пожалуйста, сообщите администратору.');
            }
            console.log(`Profile complete for user ${ctx.from.id}:`, currentState);

            await ctx.scene.leave();
        }

    } catch (error) {
        console.error("Error processing text in scene:", error);
        await ctx.reply('Произошла ошибка. Попробуйте еще раз или нажмите "Отмена".', Markup.inlineKeyboard([Markup.button.callback('❌ Отмена', 'cancel_scene')]));
    }
});


module.exports = {
    profileScene,
    PROFILE_SCENE_ID
};