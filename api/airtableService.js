const Airtable = require('airtable');

// API keys configuration should be taken from .env
const airtable = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY });
const base = airtable.base(process.env.AIRTABLE_BASE_ID || 'appuiJ0zwDJQ9vRQU');

// Save new application (Join Us) to the table
async function createMember(fullName, birthDate, phone, email, bikeType, strava, instagram, telegramId) {
    try {
        const records = await base('Members').create([
            {
                "fields": {
                    "Name": fullName,
                    "Birth Date": birthDate,
                    "Phone": phone,
                    "Email": email,
                    "Bike Type": bikeType,
                    "Strava": strava,
                    "Instagram": instagram,
                    "Telegram ID": String(telegramId),
                    "Source": "Telegram Bot"
                }
            }
        ]);
        console.log(`[Airtable] Member created. Record ID: ${records[0].id}`);
        return records[0].id;
    } catch (err) {
        console.error(`[Airtable] Error creating member in Airtable:`, err);
        return null;
    }
}

// Record for Pixel Fighter kids program application
async function createMemberPixel(name, phone, parentContact, childAge) {
    try {
        const records = await base('PixelFighters').create([
            {
                "fields": {
                    "Name": name,
                    "Phone": phone,
                    "Parent Contact": parentContact,
                    "Age": childAge,
                    "Status": "Pending"
                }
            }
        ]);
        console.log(`[Airtable] Pixel Fighter created. Record ID: ${records[0].id}`);
        return records[0].id;
    } catch (err) {
        console.error(`[Airtable] Error creating Pixel Fighter in Airtable:`, err);
        return null;
    }
}

// Record for training check-in (optional)
async function createTrainingCheckIn(userName, trainingName, date, earnedPixels) {
    try {
        const records = await base('CheckIns').create([
            {
                "fields": {
                    "User": userName,
                    "Event": trainingName,
                    "Date": date,
                    "Earned Pixels": earnedPixels
                }
            }
        ]);
        console.log(`[Airtable] Check-In created. Record ID: ${records[0].id}`);
        return records[0].id;
    } catch (err) {
        console.error(`[Airtable] Error creating Check-In in Airtable:`, err);
        return null;
    }
}

module.exports = {
    createMember,
    createMemberPixel,
    createTrainingCheckIn
};
