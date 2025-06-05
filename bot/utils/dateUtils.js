function parseDate(dateStr) {
    const [day, month, year] = dateStr.split('.').map(Number);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    return new Date(Date.UTC(year, month - 1, day));
}

function formatDates(date) {
    const day = `${date.getUTCDate().toString().padStart(2, '0')}.${(date.getUTCMonth() + 1).toString().padStart(2, '0')}.${date.getUTCFullYear()}`;
    return day
}

function calculateAvailableDate (selectedDayText, selectedTimeSlotText) {

    const KIEV_OFFSET_HOURS = 3;

    const now = new Date();
    let eventStartDate = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0, 0, 0, 0
    ));

    const daysMap = {
        'Понеділок': 1, 'Вівторок': 2, 'Середа': 3, 'Четвер': 4, 'П\'ятниця': 5,
        'Субота': 6, 'Неділя': 0
    };
    const targetUTCDayOfWeek = daysMap[selectedDayText];

    if (typeof targetUTCDayOfWeek === 'undefined') {
        return null;
    }

    let attempts = 0;
    while (attempts < 14) {
        const currentUTCDayOfWeek = eventStartDate.getUTCDay();

        if (currentUTCDayOfWeek === targetUTCDayOfWeek) {
            const [startTimeStr] = selectedTimeSlotText.split('–')[0].split('(')[0].trim().split(':');
            const startHourKiev = parseInt(startTimeStr, 10);

            if (isNaN(startHourKiev)) {
                return null;
            }

            const startHourUTC = startHourKiev - KIEV_OFFSET_HOURS;

            if (eventStartDate.getTime() > now.getTime()) {
                break;
            }
            if (eventStartDate.getUTCFullYear() === now.getUTCFullYear() &&
                eventStartDate.getUTCMonth() === now.getUTCMonth() &&
                eventStartDate.getUTCDate() === now.getUTCDate() &&
                startHourUTC > now.getUTCHours()) {
                break;
            }
            if (eventStartDate.getUTCFullYear() === now.getUTCFullYear() &&
                eventStartDate.getUTCMonth() === now.getUTCMonth() &&
                eventStartDate.getUTCDate() === now.getUTCDate() &&
                startHourUTC === now.getUTCHours() && startMinuteKiev > now.getUTCMinutes()) {
                break;
            }
        }
        eventStartDate.setUTCDate(eventStartDate.getUTCDate() + 1);
        attempts++;
    }

    if (attempts >= 14) {
        return null;
    }

    const [startTimeStr, endTimeStrWithLabel] = selectedTimeSlotText.split('–');
    const endTimeStr = endTimeStrWithLabel.split('(')[0].trim();

    if (!startTimeStr || !endTimeStr) {
        return null;
    }

    const [startHourKiev, startMinuteKiev] = startTimeStr.split(':').map(Number);
    const [endHourKiev, endMinuteKiev] = endTimeStr.split(':').map(Number);

    if (isNaN(startHourKiev) || isNaN(startMinuteKiev) || isNaN(endHourKiev) || isNaN(endMinuteKiev)) {
        return null;
    }

    const startHourUTC = startHourKiev - KIEV_OFFSET_HOURS;
    const endHourUTC = endHourKiev - KIEV_OFFSET_HOURS;

    const finalStartDate = new Date(eventStartDate);
    finalStartDate.setUTCHours(startHourUTC, startMinuteKiev, 0, 0);

    const finalEndDate = new Date(eventStartDate);
    finalEndDate.setUTCHours(endHourUTC, endMinuteKiev, 0, 0);

    if (finalEndDate.getTime() <= finalStartDate.getTime()) {
        finalEndDate.setUTCDate(finalEndDate.getUTCDate() + 1);
    }

    if (finalStartDate.getTime() < now.getTime()) {
        finalStartDate.setUTCDate(finalStartDate.getUTCDate() + 7);
        finalEndDate.setUTCDate(finalEndDate.getUTCDate() + 7);
    }

    return { startDate: finalStartDate, endDate: finalEndDate };
}

module.exports = {
    parseDate,
    formatDates,
    calculateAvailableDate,
}