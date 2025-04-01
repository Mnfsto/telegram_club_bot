const mongoose = require('mongoose')

const applicationSchema = new mongoose.Schema({
    name: String,
    phone: String,
    email: String,
})

module.exports = mongoose.model('application', applicationSchema);