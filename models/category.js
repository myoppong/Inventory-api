// Category Model
import  { Schema, model } from 'mongoose';
import normalize from "normalize-mongoose"

const categorySchema = new Schema({
  name:        { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '' }
}, {
  timestamps: true
});
categorySchema.plugin(normalize);
export const categoryModel = model('Category', categorySchema);