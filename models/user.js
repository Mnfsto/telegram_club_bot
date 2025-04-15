const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    telegramId: { type: Number, required: true, unique: true },
    name: String,
    username: String,
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    pixels: { type: Number, default: 0 },
    joinedClub: {type: Boolean, default: false}
});

module.exports = mongoose.model('User', userSchema);