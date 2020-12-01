const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const callerSchema = new Schema({
  room: {
    type: Schema.Types.ObjectId,
    ref: 'Room'
  },
  candidate: String,
  sdpMLineIndex: Number,
  sdpMid: String
})

module.exports = mongoose.model('Caller', callerSchema);
