const mongoose = require('mongoose');

const placeDetailsSchema = new mongoose.Schema({
  placeName: { type: String, required: true, index: true },
  country: { type: String, required: true },
  description: { type: String },
  currency: { type: String },
  language: { type: String },
  lastUpdated: { type: Date, default: Date.now }
});

// Compound index for unique place+country combination
placeDetailsSchema.index({ placeName: 1, country: 1 }, { unique: true });

module.exports = mongoose.model('PlaceDetails', placeDetailsSchema);
