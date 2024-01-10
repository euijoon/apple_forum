
const { MongoClient } = require('mongodb')


const url = 'mongodb+srv://eui:mQAudYjjXn2wMqP9@forum.9n9hsli.mongodb.net/?retryWrites=true&w=majority';
let connectDB = new MongoClient(url).connect()

module.exports = connectDB