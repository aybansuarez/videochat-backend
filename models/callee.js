const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const calleeSchema = new Schema({
  room: {
    type: Schema.Types.ObjectId,
    ref: 'Room'
  },
  candidate: String,
  sdpMLineIndex: Number,
  sdpMid: String,
  date: {
    type: Date,
    default: Date.now,
    index: { unique: true, expires: '1d' }
  }
})

module.exports = mongoose.model('Callee', calleeSchema);
