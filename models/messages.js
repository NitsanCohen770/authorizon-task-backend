const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const messagesSchema = new Schema({
  body: { type: String, require: true },
  senderId: { type: String, required: true },
  // accessToken: { type: String, required: true },
  timeSent: { type: Date, required: true },
});

module.exports = mongoose.model('messages', messagesSchema);
