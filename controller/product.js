// src/controllers/productController.js
import { productModel }             from "../models/products.js";
import { generateSKU }              from "../utils/generateSKU.js";
import { generateQRCode, generateBarcode } from "../utils/generateQRBarcode.js";
import { imagekit }                 from "../utils/imagekit.js";
import { categoryModel }            from '../models/category.js';
import { generateProductId }        from '../utils/generateProductCode.js';
import { customAlphabet }           from 'nanoid';

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
      expiryDate,
      barcodeValue: incomingBarcodeValue
    } = req.body;

    // 1) Basic field validation
    if (!name || !price || !costPrice || !category || !initialQuantity || !reorderThreshold) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields. Please fill out all mandatory inputs.'
      });
    }

    // 2) Category must exist
    const categoryExists = await categoryModel.findById(category);
    if (!categoryExists) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid category selected. Please choose an existing category.'
      });
    }

    // 3) Generate deterministic codes
    const sku       = generateSKU(name);
    const productId = generateProductId(); // your 6-digit code
    const qrCode    = await generateQRCode(sku);

    // 4) Decide on a raw barcodeValue
    //    • If user scanned/typed one: use that
    //    • Else: generate a fresh 13-digit number
    const rawBarcode = incomingBarcodeValue
      ? incomingBarcodeValue
      : customAlphabet('0123456789', 13)();

    // 5) Turn that rawBarcode into a Base64 PNG
    const barcodeImg = await generateBarcode(rawBarcode);

    // 6) (Optional) Upload product image via ImageKit
    let imageUrl    = '';
    let imageFileId = '';
    if (req.file) {
      const upload = await imagekit.upload({
        file: req.file.buffer,
        fileName: req.file.originalname,
        folder: '/inventory',
      });
      imageUrl    = upload.url;
      imageFileId = upload.fileId;
    }

    // 7) Persist
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

      // ← your new barcode fields:
      barcodeValue: rawBarcode,
      barcode:      barcodeImg,
      qrCode,

      // ← existing media
      image:       imageUrl,
      imageFileId,
    });

    return res.status(201).json({
      status:  'success',
      message: 'Product created successfully.',
      data:     newProduct,
    });

  } catch (err) {
    if (err.name === 'MongoServerError' && err.code === 11000) {
      return res.status(400).json({
        status:  'error',
        message: 'Duplicate value detected (maybe productId, SKU or barcode).'
      });
    }
    return res.status(500).json({
      status:  'error',
      message: 'Unexpected error creating product.',
      error:    err.message,
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

// in your getProducts controller, replace the stockStatus logic with:
   // stockStatus filter
   if (stockStatus === 'out-of-stock') {
     // exactly zero in stock
     filter.stockQuantity = 0;
   }
   else if (stockStatus === 'low-stock') {
     // >0 and <= reorderThreshold
     filter.$expr = {
       $and: [
         { $gt: ['$stockQuantity', 0] },
         { $lte: ['$stockQuantity', '$reorderThreshold'] }
       ]
     };
   }
  else if (stockStatus === 'in-stock') {
     // strictly above reorderThreshold
     filter.$expr = {
       $gt: ['$stockQuantity', '$reorderThreshold']
     };
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



 //GET /products/lookup?code=...

export const lookupProduct = async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ error: "Code parameter is required." });
    }

    // Try by productId, SKU, barcodeValue, QR, or name
    const product = await productModel.findOne({
      $or: [
        { productId:   code },
        { sku:         code },
        { barcodeValue: code },
        { qrCode:      code },
        { name:        code }
      ]
    }).lean();

    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }
    return res.json({ product });

  } catch (err) {
    console.error("Lookup error:", err);
    return res.status(500).json({
      error:   "Lookup failed.",
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
      expiryDate,
      barcodeValue: incomingBarcodeValue
    } = req.body;

    // 1) Find existing product
    const product = await productModel.findById(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    // 2) If category is changing, ensure it's valid
    if (category) {
      const categoryExists = await categoryModel.findById(category);
      if (!categoryExists) {
        return res.status(400).json({ error: 'Invalid category selected.' });
      }
      product.category = category;
    }

    // 3) Handle image upload replacement
    let imageUrl    = product.image;
    let imageFileId = product.imageFileId;
    if (req.file) {
      // delete old
      if (imageFileId) {
        try { await imagekit.deleteFile(imageFileId); }
        catch (e) { console.warn('Could not delete old image:', e.message); }
      }
      // upload new
      const upload = await imagekit.upload({
        file: req.file.buffer,
        fileName: req.file.originalname,
        folder: '/inventory',
      });
      imageUrl    = upload.url;
      imageFileId = upload.fileId;
    }

    // 4) If a new barcodeValue is provided, re-generate the barcode PNG
    if (incomingBarcodeValue) {
      const newBarcodeImg = await generateBarcode(incomingBarcodeValue);
      product.barcodeValue = incomingBarcodeValue;
      product.barcode      = newBarcodeImg;
    }

    // 5) Update simple scalar fields if provided
    if (name)            product.name            = name;
    if (price != null)   product.price           = price;
    if (costPrice != null) product.costPrice     = costPrice;
    if (description)     product.description     = description;
    if (reorderThreshold != null) product.reorderThreshold = reorderThreshold;
    if (batchNumber)     product.batchNumber     = batchNumber;
    if (expiryDate)      product.expiryDate      = expiryDate;

    // 6) Persist updated image fields
    product.image       = imageUrl;
    product.imageFileId = imageFileId;

    await product.save();

    return res.status(200).json({
      message: 'Product updated successfully.',
      product
    });
  }
  catch (err) {
    console.error('Failed to update product:', err);
    return res.status(500).json({
      error:   'Failed to update product.',
      details: err.message
    });
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
// src/controllers/productController.js
export const getProductDetails = async (req, res) => {
  try {
    const product = await productModel
      .findById(req.params.id)
      .populate('category', 'name'); // populate category name only

    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    // Determine in-stock status
    const status =
      product.stockQuantity === 0
        ? 'out-of-stock'
        : product.stockQuantity <= product.reorderThreshold
        ? 'low-stock'
        : 'in-stock';

    // Build the response DTO
    const result = {
      id:               product.id,
      productId:        product.productId,
      name:             product.name,
      sku:              product.sku,
      category:         product.category?.name || null,
      description:      product.description,
      price:            product.price,
      costPrice:        product.costPrice,
      profit:           product.profit,
      stockQuantity:    product.stockQuantity,
      initialQuantity:  product.initialQuantity,
      reorderThreshold: product.reorderThreshold,
      status,
      image:            product.image,
      imageFileId:      product.imageFileId,
      batchNumber:      product.batchNumber,
      expiryDate:       product.expiryDate,
      qrCode:           product.qrCode,
      barcodeValue:     product.barcodeValue,   // ← newly exposed
      barcode:          product.barcode,        // Base64 image
      createdAt:        product.createdAt,
      updatedAt:        product.updatedAt,
    };

    return res.status(200).json({ product: result });
  } catch (err) {
    console.error('Error fetching product details:', err);
    return res.status(500).json({
      error:   'Failed to fetch product details.',
      details: err.message
    });
  }
};



// Print-ready product details
// src/controllers/productController.js
export const printProductDetails = async (req, res) => {
  try {
    const product = await productModel.findById(req.params.id)
      .select('name productId qrCode barcode barcodeValue price');

    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    return res.status(200).json({ product });
  } catch (err) {
    console.error('Error generating print details:', err);
    return res.status(500).json({
      error:   'Failed to generate print details.',
      details: err.message
    });
  }
};



export async function getProductSuggestions(req, res) {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ suggestions: [] });

    const re = new RegExp(q, 'i');
    const suggestions = await productModel
      .find({
        $or: [
          { name:      re },
          { productId: re },
          { sku:       re },
          { barcodeValue: re },    // ← add this line
        ]
      })
      .limit(10)
      .select('_id name productId sku image barcodeValue'); // ← and include it here

    return res.json({ suggestions });
  } catch (err) {
    console.error('Suggestion error:', err);
    return res.status(500).json({ error: 'Could not fetch suggestions.' });
  }
}
