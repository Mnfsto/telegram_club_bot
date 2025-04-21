const mongoose = require("mongoose");
const certificateSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true,
        uppercase: true
    },
    nominal: {
        type: Number,
        required: true,
        min: 0,
    },
    currency: {
        type: String,
        required: false,
        default: 'PIXELS',
    },
    status: {
        type: String,
        required: true,
        enum: ['Активен', 'Погашен', 'Просрочен', 'Деактивирован'],
        default: 'Активен',
        index: true,
    },
    expiresAt: {
        type: Date,
        required: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    redeemedAt: {
        type: Date,
        required: false,
    },
    redeemedBy: {
        type: Number,
        required: false
    },
    metadata: {
        issuedTo: String,
        reason: String,
        notes: String,
    }

});

module.exports = mongoose.model('certificates', certificateSchema);