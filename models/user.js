const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    telegramId: { type: Number, required: true, unique: true },
    name: String,
    username: String,
    fullName: {
        type: String,
        required: false,
        trim: true
    },
    birthDate: {
        type: Date,
        required: false
    },
    district: {
        type: String,
        required: false,
        trim: true
    },
    phone: {
        type: String,
        required: false,
        trim: true
    },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    pixels: { type: Number, default: 0 },
    joinedClub: {type: Boolean, default: false}
});

module.exports = mongoose.model('User', userSchema);