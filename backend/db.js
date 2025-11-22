const mongoose = require('mongoose')
require('dotenv').config();


mongoose.connect(process.env.MONGO_URI)
    .then(() => {
    console.log("Connected to  db  ")
    })
    .catch(()=> {
     console.log("unable to Connected to  db  ")
})