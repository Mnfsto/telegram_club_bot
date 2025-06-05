function parseDate(dateStr) {
    const [day, month, year] = dateStr.split('.').map(Number);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    return new Date(year, month - 1, day);
}

function formatDates(date) {
    const day = `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
    return day
}

function calculateAvailableDate (selectedDayText, selectedTimeSlotText) {

    const now = new Date();
    let eventStartDate = new Date(now);
    eventStartDate.setHours(0, 0, 0, 0);

    const daysMap = {
        'Понеділок': 1, 'Вівторок': 2, 'Середа': 3, 'Четвер': 4, 'П\'ятниця': 5,
        'Субота': 6, 'Неділя': 0
    };
    const targetDayOfWeek = daysMap[selectedDayText];

    if (typeof targetDayOfWeek === 'undefined') {
        console.error(`[dateUtils] Unknown day of week: ${selectedDayText}`);
        return null;
    }

    let attempts = 0;
    while (attempts < 14) {
        const currentDayOfWeek = eventStartDate.getDay();
        if (currentDayOfWeek === targetDayOfWeek) {
            const [startTimeStr] = selectedTimeSlotText.split('–')[0].split('(')[0].trim().split(':');
            const startHour = parseInt(startTimeStr, 10);
            if (isNaN(startHour)) {
                console.error(`[dateUtils] Could not parse start hour from slot: ${selectedTimeSlotText}`);
                return null;
            }

            if (eventStartDate.getTime() > now.getTime()) {
                break;
            }
            if (eventStartDate.toDateString() === now.toDateString() && startHour > now.getHours()) {
                break;
            }
        }
        eventStartDate.setDate(eventStartDate.getDate() + 1);
        attempts++;
    }

    if (attempts >= 14) {
        console.error(`[dateUtils] Could not find a suitable future date for ${selectedDayText} in 2 weeks.`);
        return null;
    }

    const [startTimeStr, endTimeStrWithLabel] = selectedTimeSlotText.split('–');
    const endTimeStr = endTimeStrWithLabel.split('(')[0].trim();

    if (!startTimeStr || !endTimeStr) {
        console.error(`[dateUtils] Could not parse time slot: ${selectedTimeSlotText}`);
        return null;
    }

    const [startHour, startMinute] = startTimeStr.split(':').map(Number);
    const [endHour, endMinute] = endTimeStr.split(':').map(Number);

    if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute)) {
        console.error(`[dateUtils] Invalid time format in slot: ${selectedTimeSlotText}`);
        return null;
    }

    const finalStartDate = new Date(eventStartDate);
    finalStartDate.setHours(startHour, startMinute, 0, 0);

    const finalEndDate = new Date(eventStartDate);
    finalEndDate.setHours(endHour, endMinute, 0, 0);

    if (finalEndDate <= finalStartDate) {
        finalEndDate.setDate(finalEndDate.getDate() + 1);
    }

    if (finalStartDate < now) { //
        finalStartDate.setDate(finalStartDate.getDate() + 7);
        finalEndDate.setDate(finalEndDate.getDate() + 7);
    }

    return { startDate: finalStartDate, endDate: finalEndDate };
}



module.exports = {
    parseDate,
    formatDates,
    calculateAvailableDate,
}



