import {productModel} from "../models/products.js";
import { generateSKU } from "../utils/generateSKU.js";
import { generateQRCode, generateBarcode } from "../utils/generateQRBarcode.js";
import {imagekit} from "../utils/imagekit.js";
import { categoryModel } from '../models/category.js';
import { generateProductId } from '../utils/generateProductCode.js';

// Create Product Function
export const createProduct = async (req, res) => {
  try {
    const {
      name,
      price,
      costPrice,
      category,
      description,
      initialQuantity,
      reorderThreshold,
      batchNumber,
      expiryDate
    } = req.body;

    // Validate required fields
    if (!name || !price || !costPrice || !category || !initialQuantity || !reorderThreshold) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields. Please fill out all mandatory inputs.'
      });
    }

    // Validate category existence
    const categoryExists = await categoryModel.findById(category);
    if (!categoryExists) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid category selected. Please choose an existing category.'
      });
    }

    // Generate product codes
    const sku = generateSKU(name);
    const productId = generateProductId(); // 6-digit unique code
    const qrCode = await generateQRCode(sku);
    const barcode = await generateBarcode(sku);

    // Upload product image
    let imageFileId='';
    let imageUrl = '';
    if (req.file) {
      const upload = await imagekit.upload({
        file: req.file.buffer,
        fileName: req.file.originalname,
        folder: '/inventory',
      });
      imageUrl = upload.url;
      imageFileId = upload.fileId; 
    }

    // Create product entry
    const newProduct = await productModel.create({
      productId,
      name,
      sku,
      category,
      description,
      costPrice,
      price,
      initialQuantity,
      reorderThreshold,
      batchNumber,
      expiryDate,
      image: imageUrl,
      imageFileId: imageFileId,
      qrCode,
      barcode,
    });

    return res.status(201).json({
      status: 'success',
      message: 'Product created successfully.',
      data: newProduct,
    });

  } catch (err) {
    if (err?.name === 'MongoServerError' && err?.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: 'Duplicate value detected (likely productId or SKU). Please retry with unique values.'
      });
    }

    return res.status(500).json({
      status: 'error',
      message: 'An unexpected error occurred while creating the product.',
      error: err.message,
    });
  }
};


// Get products with filters and pagination
export const getProducts = async (req, res) => {
  try {
    const {
      search,
      category,
      minPrice,
      maxPrice,
      stockStatus,
      page = 1,
      limit = 10
    } = req.query;

    const filter = {};

    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    if (category) {
      filter.category = category; // must be ObjectId string
    }

    if (minPrice != null && maxPrice != null) {
      filter.price = { $gte: Number(minPrice), $lte: Number(maxPrice) };
    }

    if (stockStatus) {
  filter.stockQuantity =
    stockStatus === 'out-of-stock'
      ? 0
    : stockStatus === 'low-stock'
      ? { $gt: 0, $lte: reorderThreshold }
      : { $gt: reorderThreshold };
}

    const skip = (Number(page) - 1) * Number(limit);
    
    const docs = await productModel
      .find(filter)
      .populate('category', 'name')
      .skip(skip)
      .limit(Number(limit))
      .sort({ updatedAt: -1 })
      .lean();

    const totalCount = await productModel.countDocuments(filter);

   const products = docs.map(p => {
  const status =
    p.stockQuantity === 0 ? 'out-of-stock'
    : p.stockQuantity <= p.reorderThreshold ? 'low-stock'
    : 'in-stock';

  return {
   id:               p._id.toString(),
    productId:      p.productId,
    thumbnail:      p.image,
    name:           p.name,
    sku:            p.sku,
    category:       p.category?.name ?? '',
    categoryId:     p.category?.id ?? '',         // ✅ needed for select input
    stockQty:       p.stockQuantity,
    initialQuantity:p.initialQuantity,
    costPrice:      p.costPrice,
    price:          p.price,
    reorderThreshold: p.reorderThreshold,
    batchNumber:    p.batchNumber,
    expiryDate:     p.expiryDate,
    qrCode:         p.qrCode,
    barcode:        p.barcode,
    status,
    lastUpdated:    p.updatedAt.toLocaleDateString('en-US'),
  };
});


    return res.status(200).json({
      products,
      pagination: {
        total: totalCount,
        page: Number(page),
        pages: Math.ceil(totalCount / limit)
      }
    });

  } catch (err) {
    return res.status(500).json({
      error: 'Failed to retrieve products.',
      details: err.message
    });
  }
};



// Quick view of a product
export const getProductQuickView = async (req, res) => {
  try {
    const { id } = req.params;
    const p = await productModel
      .findById(id)
      .populate('category', 'name')                      // get category name
      .select([
        'productId',   // 6‑digit code
        'name',
        'sku',
        'price',
        'costPrice',
        'initialQuantity',
        'stockQuantity',
        'reorderThreshold',
        'qrCode',
        'barcode',
        'image',
        'updatedAt'
      ])
      .lean();

    if (!p) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    // Derive POS‑friendly fields
    const status =
      p.stockQuantity === 0
        ? 'out-of-stock'
        : p.stockQuantity <= p.reorderThreshold
        ? 'low-stock'
        : 'in-stock';

    const quickView = {
      id:             p.id,
      productId:      p.productId,
      name:           p.name,
      sku:            p.sku,
      category:       p.category?.name || '',
      price:          p.price,
      costPrice:      p.costPrice,
      profit:         (p.price - p.costPrice),
      initialQty:     p.initialQuantity,
      stockQty:       p.stockQuantity,
      reorderThreshold: p.reorderThreshold,
      status,                                           // drives badge color
      qrCode:         p.qrCode,
      barcode:        p.barcode,
      thumbnail:      p.image,                           // use as 40×40px thumbnail
      lastUpdated:    new Date(p.updatedAt).toLocaleDateString('en-US')
    };

    return res.status(200).json(quickView);
  } catch (err) {
    return res.status(500).json({
      error:   'Failed to retrieve product quick view.',
      details: err.message
    });
  }
};


// Update an existing product (all fields except stockQuantity)
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      price,
      costPrice,
      category,
      description,
      reorderThreshold,
      batchNumber,
      expiryDate
    } = req.body;

    const product = await productModel.findById(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    if (category) {
      const categoryExists = await categoryModel.findById(category);
      if (!categoryExists) {
        return res.status(400).json({ error: 'Invalid category selected.' });
      }
    }

    //  If new image uploaded, delete old one from ImageKit
    let imageUrl = product.image;
    let imageFileId = product.imageFileId;

    if (req.file) {
      // Delete previous image if it exists
      if (product.imageFileId) {
        try {
          await imagekit.deleteFile(product.imageFileId);
        } catch (delErr) {
          console.warn('Failed to delete old image from ImageKit:', delErr.message);
        }
      }

      const upload = await imagekit.upload({
        file: req.file.buffer,
        fileName: req.file.originalname,
        folder: '/inventory',
      });

      imageUrl = upload.url;
      imageFileId = upload.fileId;
    }

    // Update fields
    product.name = name || product.name;
    product.price = price || product.price;
    product.costPrice = costPrice || product.costPrice;
    product.category = category || product.category;
    product.description = description || product.description;
    product.reorderThreshold = reorderThreshold || product.reorderThreshold;
    product.batchNumber = batchNumber || product.batchNumber;
    product.expiryDate = expiryDate || product.expiryDate;
    product.image = imageUrl;
    product.imageFileId = imageFileId;

    await product.save();

    return res.status(200).json({
      message: 'Product updated successfully.',
      product
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update product.', details: err.message });
  }
};


// Delete a product (hard delete)
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await productModel.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    return res.status(200).json({ message: 'Product deleted successfully.', productId: id });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete product.', details: err.message });
  }
};
// Detailed view of a product
export const getProductDetails = async (req, res) => {
  try {
    const product = await productModel
      .findById(req.params.id)
      .populate('category', 'name'); // populate category name only

    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    // Determine status
    const status = product.stockQuantity === 0
      ? 'out-of-stock'
      : product.stockQuantity <= product.reorderThreshold
      ? 'low-stock'
      : 'in-stock';

    // Structure response
    const result = {
      id:             product.id,
      productId:      product.productId,
      name:           product.name,
      sku:            product.sku,
      category:       product.category?.name || null,
      description:    product.description,
      price:          product.price,
      costPrice:      product.costPrice,
      profit:         product.profit,
      stockQuantity:  product.stockQuantity,
      initialQuantity: product.initialQuantity,
      reorderThreshold: product.reorderThreshold,
      status,
      image:          product.image,
      barcode:        product.barcode,
      qrCode:         product.qrCode,
      batchNumber:    product.batchNumber,
      expiryDate:     product.expiryDate,
      createdAt:      product.createdAt,
      updatedAt:      product.updatedAt,
    };

    return res.status(200).json({ product: result });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch product details.', details: err.message });
  }
};


// Print-ready product details
export const printProductDetails = async (req, res) => {
  try {
    const product = await productModel.findById(req.params.id)
      .select('name productId qrCode barcode price');

    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    return res.status(200).json({ product });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate print details.', details: err.message });
  }
};
