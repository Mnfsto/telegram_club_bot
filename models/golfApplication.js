const mongoose = require('mongoose');

const golfApplicationSchema = new mongoose.Schema({
    applicantTelegramId: { type: Number, required: true },
    applicantUsername: String,
    applicantName: String,
    applicantType: { type: String, enum: ['adult', 'child'], required: true },
    childFullName: String,
    childAge: Number,
    applicantFullName: String,
    contactPhone: { type: String, required: true },
    selectedDay: { type: String, required: true },
    selectedTimeSlot: { type: String, required: true },
    status: {
        type: String,
        enum: ['Нова', 'В обробці', 'Підтверджена', 'Скасована'],
        default: 'Нова'
    },
    notes: String,
}, { timestamps: true });

module.exports = mongoose.model('GolfApplication', golfApplicationSchema);