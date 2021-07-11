const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const messagesSchema = new Schema({
  messages: [
    {
      body: { type: String, require: true },
      senderId: { type: String, required: true },
      timeSent: { type: Date, required: true },
    },
  ],
});

module.exports = mongoose.model('messages', messagesSchema);
