const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const usersSchema = new Schema({
  email: { type: String, require: true },
  socketSessionId: { type: String, required: true },
  isInvited: { type: Boolean, required: false },
});

module.exports = mongoose.model('users', usersSchema);
