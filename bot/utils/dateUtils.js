function parseDate(dateStr) {
    const [day, month, year] = dateStr.split('.').map(Number);
    return new Date(year, month - 1, day); // month - 1, так как в JS месяцы с 0
}

module.exports = {
    parseDate
}