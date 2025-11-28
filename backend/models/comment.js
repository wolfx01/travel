const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const commentSchema = new Schema({
    placeId: { type: String, required: true }, // Can be the stable ID (number as string) or name
    userName: { type: String, required: true },
    text: { type: String, required: true },
    date: { type: Date, default: Date.now }
});

const Comment = mongoose.model("Comment", commentSchema);

module.exports = Comment;
