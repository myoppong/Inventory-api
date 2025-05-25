import  { Schema, model } from 'mongoose';
import normalize from "normalize-mongoose"

const stockSchema = new Schema({
  product:     { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  type:        { type: String, enum: ['restock','sale','adjustment'], required: true },
  quantity:    { type: Number, required: true },
  reference:   { type: String },               // e.g., PO#, Sales Order#
  performedBy: { type: Schema.Types.ObjectId, ref: 'user' },
  timestamp:   { type: Date, default: Date.now }
}, {
  timestamps: false
});

stockSchema.plugin(normalize);
export const stockModel = model('InventoryTransaction', stockSchema);
