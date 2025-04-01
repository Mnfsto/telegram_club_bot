const mongoose = require('mongoose')

const TrainingSchema = new mongoose.Schema({
    date: String,
    time: String,
    location: String,
    description: String,
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    attended: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

});

module.exports = mongoose.model("Training", TrainingSchema);