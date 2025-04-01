const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    telegramId: Number,
    name: String,
    username: String,
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    pixels: { type: Number, default: 0 } // Количество пикселей
});

module.exports = mongoose.model('User', userSchema);