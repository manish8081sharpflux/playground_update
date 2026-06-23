const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Vendor name is required'],
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      validate: {
        validator: function(v) {
          // Accepts: +91-9876543210, 9876543210, +919876543210
          return /^(\+91[\-\s]?)?[6789]\d{9}$/.test(v);
        },
        message: props => `${props.value} is not a valid Indian phone number!`
      }
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true
    },
    active: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Index for name search
vendorSchema.index({ name: 1 });

const Vendor = mongoose.models.Vendor || mongoose.model('Vendor', vendorSchema);

module.exports = Vendor;
