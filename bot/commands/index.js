const startCommand = require('./start.js');
const trainingListCommand = require('./trainingList.js');
const addTrainingCommand = require('./addTraining');
const checkInCommand = require('./checkIn');
const checkOutCommand = require('./checkOut');
const trainingInfoCommand = require('./trainingInfo');
const addCertCommand = require('./createCertificates');

module.exports = {
    startCommand,
    trainingListCommand,
    addTrainingCommand,
    checkInCommand,
    checkOutCommand,
    trainingInfoCommand,
    addCertCommand,

}