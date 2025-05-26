const { google } = require('googleapis');
const path = require('path');

const CREDENTIALS_PATH = path.join(__dirname, '..', 'config', 'google-credentials.json'); // Путь к вашему JSON файлу
const SHEETS_SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar'];

// --- Аутентификация ---
function getAuthClient(scopes) {
    return new google.auth.GoogleAuth({
        keyFile: CREDENTIALS_PATH,
        scopes: scopes,
    });
}

// --- Google Sheets ---
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID; // ID вашей таблицы из .env
const SHEET_NAME = process.env.GOOGLE_SHEET_NAME || 'ЗаявкиГольф'; // Имя листа

async function appendToSheet(applicationData) {
    if (!SPREADSHEET_ID) {
        console.warn('[GoogleSheets] SPREADSHEET_ID is not set. Skipping sheet append.');
        return;
    }
    console.log('[GoogleSheets] Attempting to append data:', applicationData);

    const auth = getAuthClient(SHEETS_SCOPES);
    const sheets = google.sheets({ version: 'v4', auth });
    const rowValues = [
        new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kiev' }),
        applicationData.applicantType === 'child' ? 'Дитина' : 'Дорослий',
        applicationData.applicantType === 'child' ? applicationData.childFullName : applicationData.applicantFullName,
        applicationData.applicantType === 'child' ? applicationData.childAge : '', // Возраст только для ребенка
        applicationData.contactPhone,
        applicationData.selectedDay,
        applicationData.selectedTimeSlot,
        applicationData.status || 'Нова', // Статус заявки
        applicationData.applicantTelegramId,
        applicationData.applicantUsername || ''
    ];

    try {
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A1`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [rowValues],
            },
        });
        console.log('[GoogleSheets] Data appended successfully:', response.data.updates.updatedRange);
    } catch (err) {
        console.error('[GoogleSheets] Error appending data to sheet:', err.message);
    }
}

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;

function getEventDateTime(selectedDayText, selectedTimeSlotText) {

    const now = new Date();
    let eventStartDate = new Date();
    const daysMap = { 'Понеділок': 1, 'Вівторок': 2, 'Середа': 3, 'Четвер': 4, 'П\'ятниця': 5 };
    const targetDayOfWeek = daysMap[selectedDayText];

    if (!targetDayOfWeek) return null;
    while (eventStartDate.getDay() !== targetDayOfWeek || eventStartDate < now) {
        if (eventStartDate.getDay() === targetDayOfWeek && eventStartDate.toDateString() === now.toDateString()) {
            const [startTimeStr] = selectedTimeSlotText.split('–')[0].split('(')[0].trim().split(':');
            if (parseInt(startTimeStr) > now.getHours()) break;
        }
        eventStartDate.setDate(eventStartDate.getDate() + 1);
}
    while (eventStartDate.getDay() !== targetDayOfWeek ) {
        eventStartDate.setDate(eventStartDate.getDate() + 1);
    }
    const [startTimeStr, endTimeStr] = selectedTimeSlotText.split('–').map(s => s.split('(')[0].trim());
    if (!startTimeStr || !endTimeStr) return null;

    const [startHour, startMinute] = startTimeStr.split(':').map(Number);
    const [endHour, endMinute] = endTimeStr.split(':').map(Number);

    const startDateTime = new Date(eventStartDate);
    startDateTime.setHours(startHour, startMinute, 0, 0);

    const endDateTime = new Date(eventStartDate);
    endDateTime.setHours(endHour, endMinute, 0, 0);
    if (endDateTime <= startDateTime) {
        console.warn("[GoogleCalendar] End time is before or equal to start time, might be an issue.");
    }

    return {
        start: { dateTime: startDateTime.toISOString(), timeZone: 'Europe/Kiev' },
        end: { dateTime: endDateTime.toISOString(), timeZone: 'Europe/Kiev' },

    };
}

async function createCalendarEvent(applicationData) {
    if (!CALENDAR_ID) {
        console.warn('[GoogleCalendar] CALENDAR_ID is not set. Skipping event creation.');
        return;
    }
    console.log('[GoogleCalendar] Attempting to create event for:', applicationData);

    const auth = getAuthClient(CALENDAR_SCOPES);
    const calendar = google.calendar({ version: 'v3', auth });

    const eventTimes = getEventDateTime(applicationData.selectedDay, applicationData.selectedTimeSlot);
    if (!eventTimes) {
        console.error('[GoogleCalendar] Could not determine event date/time.');
        return;
    }

    let summary = '';
    let description = `Заявка від: ${applicationData.applicantUsername || applicationData.applicantName || applicationData.applicantTelegramId}\nТелефон: ${applicationData.contactPhone}`;

    if (applicationData.applicantType === 'child') {
        summary = `Гольф (дитина): ${applicationData.childFullName}`;
        description += `\nДитина: ${applicationData.childFullName}, ${applicationData.childAge} років.`;
    } else {
        summary = `Гольф: ${applicationData.applicantFullName}`;
        description += `\nУчасник: ${applicationData.applicantFullName}.`;
    }

    const event = {
        summary: summary,
        description: description,
        start: eventTimes.start,
        end: eventTimes.end,
        reminders: {
            useDefault: false,
            overrides: [
                { method: 'popup', minutes: 60 },
                { method: 'popup', minutes: 24 * 60 },
            ],
        },

    };

    try {
        const response = await calendar.events.insert({
            calendarId: CALENDAR_ID,
            resource: event,
        });
        console.log('[GoogleCalendar] Event created successfully:', response.data.htmlLink);
    } catch (err) {
        console.error('[GoogleCalendar] Error creating calendar event:', err.message);
    }
}

module.exports = {
    appendToSheet,
    createCalendarEvent,
};