const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const adminsSchema = new Schema({
  email: { type: String, require: true },
  socketSessionId: { type: String, required: true },
});

module.exports = mongoose.model('admins', adminsSchema);
