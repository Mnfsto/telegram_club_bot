const startCommand = require('./start.js');
const trainingListCommand = require('./trainingList.js');
const addTrainingCommand = require('./addTraining');
const checkInCommand = require('./checkIn');
const checkOutCommand = require('./checkOut');
const trainingInfoCommand = require('./trainingInfo');


module.exports = {
    startCommand,
    trainingListCommand,
    addTrainingCommand,
    checkInCommand,
    checkOutCommand,
    trainingInfoCommand,
}