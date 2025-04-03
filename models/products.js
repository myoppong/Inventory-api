import mongoose from "mongoose";
import {model, Schema} from "mongoose";
import normalize from "normalize-mongoose"

const productSchema = new Schema (
    {
    name: { type: String, required: true, trim: true },
    sku: { type: String, unique: true }, // Auto-generated
    price: { type: Number, required: true },
    category: { type: String, required: true },
    //type:Schema.Types.ObjectId, ref: "Category",
    stockQuantity: { type: Number, required: true },
    image: { type: String }, // Image URL
    qrCode: { type: String }, // Auto-generated
    barcode: { type: String }, // Auto-generated
    batchNumber: { type: String, default: null },
    expiryDate: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false }, // Soft delete support
},

{ timestamps :true} 

);

productSchema.plugin(normalize);

export const productModel =  model("product",productSchema);

