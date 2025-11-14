const mongoose = require('mongoose')
const Schema = mongoose.Schema
const userSema = new Schema({
    userName: String,
    email: String,
    password : String
    
})


const User = mongoose.model("User", userSema)


module.exports = User