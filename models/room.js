const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const roomSchema = new Schema({
  offer: Object,
  answer: Object,
  date: {
    type: Date,
    default: Date.now,
    index: { unique: true, expires: '1d' }
  }
})

module.exports = mongoose.model('Room', roomSchema);
