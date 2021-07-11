const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const filters = new Schema({
  filters: [
    {
      keywords: { type: String, require: true },
    },
  ],
});

module.exports = mongoose.model('filters', filters);
