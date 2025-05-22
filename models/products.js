import  { Schema, model } from 'mongoose';
import normalize from "normalize-mongoose"

// Product Model
const productSchema = new Schema({
  //–– Basic Info ––
  productId:       { type: String, unique: true, index: true, required: true }, // read‑only 6‑digit code
  name:            { type: String, required: true, trim: true },
  sku:             { type: String, unique: true, index: true, required: true }, // auto‑generated or user‑defined
  category:        { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  description:     { type: String, trim: true },                                 // inFlow Inventory description

  //–– Pricing & Cost ––
  costPrice:       { type: Number, required: true },                             // unit cost
  price:           { type: Number, required: true },                             // selling price
  profit: {
  type: Number,
  default: function () {
    return this.price - this.costPrice;
  }
}
,

  //–– Stock Details ––
  //–– Stock Details ––
 initialQuantity: { type: Number, required: true, default: 0 },
    stockQuantity: {
    type: Number,
    required: true,
    default() {              // function(){} so `this` is bound
      return this.initialQuantity;
    }
  },
  reorderThreshold:{ type: Number, required: true, default: 0 },

  //–– Media ––
  image:           { type: String },                                             // product image URL

  //–– Codes ––
  barcode:         { type: String },                                             // Code128 barcode URL/data
  qrCode:          { type: String },                                             // QR code URL/data

  //–– Lifecycle ––
  batchNumber:     { type: String, default: null },
  expiryDate:      { type: Date,   default: null }
}, {
  timestamps: true
});


productSchema.plugin(normalize);
export const productModel = model('Product', productSchema);



