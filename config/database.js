
const mongoose = require('mongoose')


async function connectDB (){
    try {
    mongoose.connect(process.env.MONGODB_URI, {useNewUrlParser: true, useUnifiedTopology: true})


        console.log('MongoDB Connected...');
    }catch (err){
        console.error('Could not connect to MongoDB:', err.message);

        process.exit(1);
    }

    mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected!');
    });
    mongoose.connection.on('reconnected', () => {
        console.log('MongoDB reconnected!');
    });
}




module.exports = connectDB;
