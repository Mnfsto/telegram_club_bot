function parseDate(dateStr) {
    const [day, month, year] = dateStr.split('.').map(Number);
    return new Date(year, month - 1, day); // month - 1, так как в JS месяцы с 0
}

function formatDates(date) {
    const day = `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
    return day
}
module.exports = {
    parseDate,
    formatDates,
}