require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');



const Training = require('../models/training.js');
const ApplicationMember = require('../models/application.js');

function setupApiServer(botInstance){

    const app = express();
    app.use( express.urlencoded({extended: false}));
    app.use(express.json());

    app.get('/api/trainings', async (req, res) => {
        try {

            const trainings = await Training.find()/*.sort({ date: 1, hours: 1, minutes: 1 })*/;
            res.json(trainings);
        } catch (err) {
            console.error("API Error getting trainings:", err);
            res.status(500).json({ message: "Failed to get trainings" });
        }
    });

    app.post('/api/applications', async (req, res) => {

        const { name, phone, email } = req.body;
        const message = `Новая заявка! \n Name: ${name} \n Phone: ${phone} \n Email: ${email}`;
        try {
            // Сохраняем в БД
            const newMember = new ApplicationMember({ name, phone, email });
            await newMember.save();
            console.log("New application saved:", newMember);


            if (botInstance && process.env.ADMIN_CHAT_ID) {
                await botInstance.telegram.sendMessage(process.env.ADMIN_CHAT_ID, message);
            } else {
                console.warn("Bot instance or ADMIN_CHAT_ID not available for notification");
            }
            res.status(201).json({ message: 'Заявка отправлена и сохранена' }); // Используем 201 Created
        } catch (err) {
            console.error('API failed to process application:', err);
            res.status(500).json({ message: 'Failed to process application' });
        }
    });

    app.get('/', (req, res) => {
        try {
            const projectRoot = process.cwd();
            res.sendFile(projectRoot + '/index.html');
        } catch (err) {
            console.error("Error sending index.html:", err);
            res.status(404).send("Not Found"); // Или 500
        }


    });

    // Post method for adding a new request (from the site)
    app.post("/", async function (req, res) {
        const { name, phone, email } = req.body;
        const message = `Новая заявка! \n Name: ${name} \n Phone: ${phone} \n Email: ${email}`;
        try{
            await botInstance.telegram.sendMessage(process.env.ADMIN_CHAT_ID, message);
            const newMember = new ApplicationMember({name, phone, email});
            await newMember.save();
            console.log(message)
            res.status(200).send({message: 'Заявка отправлена'})
        } catch (err) {
            console.error('failed to send an application from the site');
            console.log(err);
        }
    });


    app.use('/api/*', (req, res) => {
        res.status(404).json({ message: 'API endpoint not found' });
    });

    return app;

}






module.exports = setupApiServer;