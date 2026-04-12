const { Scenes, Markup } = require('telegraf');
const User = require('../../models/user');
const airtableService = require('../../api/airtableService');

// Wizard Scene for club application based on website questions
const joinClubWizard = new Scenes.WizardScene(
    'JOIN_CLUB_WIZARD',
    
    // Step 1: Welcome and Full Name request
    async (ctx) => {
        await ctx.reply('🚴‍♂️ Ласкаво просимо! Давайте заповнимо анкету для вступу до клубу (як на нашому сайті).\n\nБудь ласка, введіть ваше повне Ім\'я та Прізвище:');
        ctx.wizard.state.applicationData = {};
        return ctx.wizard.next();
    },
    
    // Step 2: Receive Full Name, request Birth Date
    async (ctx) => {
        if (!ctx.message || !ctx.message.text) return ctx.reply('Будь ласка, введіть текст.');
        ctx.wizard.state.applicationData.fullName = ctx.message.text;
        
        await ctx.reply('Чудово! Тепер введіть вашу повну дату народження (у форматі ДД.ММ.РРРР):');
        return ctx.wizard.next();
    },

    // Step 3: Receive Birth Date, request Phone
    async (ctx) => {
        if (!ctx.message || !ctx.message.text) return ctx.reply('Будь ласка, введіть текст.');
        ctx.wizard.state.applicationData.birthDate = ctx.message.text;
        
        await ctx.reply('Дякую! Тепер вкажіть ваш номер телефону (наприклад, +380...):');
        return ctx.wizard.next();
    },

    // Step 4: Receive Phone, request Email
    async (ctx) => {
        if (!ctx.message || !ctx.message.text) return ctx.reply('Будь ласка, введіть текст.');
        ctx.wizard.state.applicationData.phone = ctx.message.text;
        
        await ctx.reply('Вкажіть вашу електронну пошту (email):');
        return ctx.wizard.next();
    },
    
    // Step 4: Receive Email, request Bike Type
    async (ctx) => {
        if (!ctx.message || !ctx.message.text) return ctx.reply('Будь ласка, введіть текст.');
        ctx.wizard.state.applicationData.email = ctx.message.text;
        
        await ctx.reply('На якому велосипеді ви переважно катаєтесь?\n\n(Оберіть з варіантів або введіть свій)', 
            Markup.keyboard([['Шосе', 'Гревел'], ['MTB', 'Інший']]).oneTime().resize()
        );
        return ctx.wizard.next();
    },
    
    // Step 5: Receive Bike Type, request Strava
    async (ctx) => {
        if (!ctx.message || !ctx.message.text) return ctx.reply('Будь ласка, оберіть або введіть текст.');
        ctx.wizard.state.applicationData.bikeType = ctx.message.text;
        
        await ctx.reply('Вкажіть ваш Strava (посилання або напишіть "немає"):', Markup.removeKeyboard());
        return ctx.wizard.next();
    },

    // Step 6: Receive Strava, request Instagram (optional)
    async (ctx) => {
        if (!ctx.message || !ctx.message.text) return ctx.reply('Будь ласка, введіть текст.');
        ctx.wizard.state.applicationData.strava = ctx.message.text;
        
        await ctx.reply('Вкажіть ваш Instagram (або напишіть "немає"):');
        return ctx.wizard.next();
    },
    
    // Step 7: Finalization and data saving
    async (ctx) => {
        if (!ctx.message || !ctx.message.text) return ctx.reply('Будь ласка, введіть текст.');
        ctx.wizard.state.applicationData.instagram = (ctx.message.text.toLowerCase() === 'немає' || ctx.message.text.toLowerCase() === 'нет') ? null : ctx.message.text;
        
        const data = ctx.wizard.state.applicationData;
        const telegramId = ctx.from.id;
        
        // 1. Save to MongoDB
        try {
            await User.findOneAndUpdate(
                { telegramId: telegramId },
                { 
                    fullName: data.fullName,
                    birthDate: data.birthDate,
                    phone: data.phone,
                    email: data.email,
                    bikeType: data.bikeType,
                    strava: data.strava,
                    instagram: data.instagram,
                    joinedClub: true
                },
                { upsert: true, new: true }
            );
        } catch (err) {
            console.error('Error saving user to DB:', err);
        }

        // 2. Send to Airtable
        await airtableService.createMember(
            data.fullName,
            data.birthDate,
            data.phone, 
            data.email, 
            data.bikeType, 
            data.strava, 
            data.instagram || "", 
            telegramId
        );
        
        await ctx.reply('🎉 Ваша заявка успішно надіслана! Ласкаво просимо до Arcadia Cycling Club.\n\nМенеджер зв\'яжеться з вами найближчим часом. Також не забувайте підписуватись на наші соціальні мережі!');
        return ctx.scene.leave();
    }
);

module.exports = { 
    joinClubWizard,
    JOIN_CLUB_SCENE_ID: 'JOIN_CLUB_WIZARD'
};
