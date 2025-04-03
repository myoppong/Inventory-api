import {productModel} from "../models/products.js";
import { generateSKU } from "../utils/generateSKU.js";
import { generateQRCode, generateBarcode } from "../utils/generateQRBarcode.js";

// Create Product Function
export const createProduct = async (req, res, next) => {
    try {
        // Extract form data from request
        const { name, price, category, stockQuantity, batchNumber, expiryDate } = req.body;

        // Validate required fields
        if (!name || !price || !category || !stockQuantity) {
            return res.status(400).json({ message: "All required fields must be filled" });
        }

        // Check if category exists
        // const categoryExists = await Category.findById(category);
        // if (!categoryExists) {
        //     return res.status(400).json({ message: "Invalid category. Please select an existing category." });
        // }

        // Generate SKU, QR Code & Barcode
        const sku = generateSKU(name)
        const qrCode = await generateQRCode(sku);
        const barcode = await generateBarcode(sku);

        // Upload Image to Cloudinary
        let imageUrl = "";
        if (req.file) {
            imageUrl = req.file.path; // Cloudinary image URL
        }

        // Create new product
        const newProduct = await productModel.create({
            name,
            sku,
            price,
            category,
            stockQuantity,
            batchNumber,
            expiryDate,
            image: imageUrl,  // Store uploaded image URL
            qrCode,
            barcode,
        });

        // Return response
        res.status(201).json({ message: "Product created successfully", product: newProduct });

    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};


export const getProducts = async (req, res) => {
    try {
        const { search, category, minPrice, maxPrice, stockStatus, page = 1, limit = 10 } = req.query;

        let filter = { isDeleted: false };

        if (search) {
            filter.name = { $regex: search, $options: "i" };
        }
        if (category) {
            filter.category = category;
        }
        if (minPrice && maxPrice) {
            filter.price = { $gte: minPrice, $lte: maxPrice };
        }
        if (stockStatus) {
            filter.stockQuantity = stockStatus === "out-of-stock" ? 0 : { $gt: 0 };
        }

        const products = await productModel.find(filter)
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .sort({ createdAt: -1 });

        const totalProducts = await productModel.countDocuments(filter);

        res.status(200).json({
            products,
            totalPages: Math.ceil(totalProducts / limit),
            currentPage: Number(page),
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};


export const getProductQuickView = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await productModel.findById(id).select("name price category stockQuantity qrCode barcode image");

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.status(200).json(product);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};


export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedData = req.body;

        const updatedProduct = await productModel.findByIdAndUpdate(id, updatedData, { new: true });

        if (!updatedProduct) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.status(200).json({ message: "Product updated successfully", product: updatedProduct });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};


// Delete product permanently
export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await productModel.findByIdAndDelete(id);

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.status(200).json({ message: "Product deleted successfully", productId: id });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};



export const getProductDetails = async (req, res) => {
    try {
        const product = await productModel.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.status(200).json({
            message: "Product details fetched successfully",
            product: {
                name: product.name,
                sku: product.sku,
                price: product.price,
                category: product.category,
                stockQuantity: product.stockQuantity,
                qrCode: product.qrCode,    // URL of the QR Code
                barcode: product.barcode,  // Base64 string of the Barcode
                image: product.image,      // Product image URL from Cloudinary
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};



// Print Product Route
export const printProductDetails = async (req, res) => {
    try {
        const product = await productModel.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.status(200).json({
            message: "Product details for printing",
            product: {
                name: product.name,
                qrCode: product.qrCode,   // QR Code URL
                barcode: product.barcode, // Barcode base64
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
