const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const roomSchema = new Schema({
  offer: Object,
  answer: Object
})

module.exports = mongoose.model('Room', roomSchema);
