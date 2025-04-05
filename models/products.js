import mongoose from "mongoose";
import {model, Schema} from "mongoose";
import normalize from "normalize-mongoose"

const productSchema = new Schema (
    {
    name: { type: String, required: true, trim: true },
    sku: { type: String, unique: true }, // Auto-generated
    price: { type: Number, required: true },
    category: { type:Schema.Types.ObjectId, ref: "Category", required: true },
    stockQuantity: { type: Number, required: true },
    image: { type: String }, // Image URL
    qrCode: { type: String }, // Auto-generated
    barcode: { type: String }, // Auto-generated
    batchNumber: { type: String, default: null },
    expiryDate: { type: Date, default: null } 
},

{ timestamps :true} 

);

productSchema.plugin(normalize);

export const productModel =  model("product",productSchema);

