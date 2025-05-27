// controller/stock.js
import { stockModel } from '../models/stock.js';
import { productModel } from '../models/products.js';

export const createInventoryTransaction = async (req, res) => {
  try {
    const { productId, type, quantity, reference } = req.body;

    // Basic validation
    if (!productId || !type || !quantity) {
      return res.status(400).json({ error: 'productId, type, and quantity are required.' });
    }
    if (quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be a positive number.' });
    }

    // Determine the increment value
    const increment =
      type === 'restock'      ? +quantity :
      type === 'sale'         ? -quantity :
      type === 'adjustment'   ? -quantity : 0;

if (type === 'sale') {
  const product = await productModel.findById(productId);
  if (!product) return res.status(404).json({ error: 'Product not found.' });
  if (product.stockQuantity < quantity) {
    return res.status(400).json({ error: 'Insufficient stock to complete sale.' });
  }
}


    // Atomically update product stock
    const product = await productModel.findByIdAndUpdate(
      productId,
      { $inc: { stockQuantity: increment } },
      { new: true }
    );
    if (!product) return res.status(404).json({ error: 'Product not found.' });

    // Record the transaction
    await stockModel.create({
      product: productId,
      type,
      quantity: Math.abs(quantity),  // store positive number for clarity
      reference,
      performedBy: req.auth.id   // if you keep auth info in req.user
    });

    return res.status(201).json({
      message: 'Inventory transaction recorded.',
      product: {
        id: product.id,
        stockQuantity: product.stockQuantity
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to record inventory transaction.', details: err.message });
  }
};


export const listInventoryTransactions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      productId,
      type,
      dateFrom,
      dateTo
    } = req.query;

    const filter = {};

    if (productId) {
      filter.product = productId;
    }
    if (type) {
      filter.type = type;
    }
    if (dateFrom || dateTo) {
      filter.timestamp = {};
      if (dateFrom) filter.timestamp.$gte = new Date(dateFrom);
      if (dateTo)   filter.timestamp.$lte = new Date(dateTo);
    }

    const skip = (Number(page) - 1) * Number(limit);

    // fetch matching docs
    const [docs, total] = await Promise.all([
      stockModel
        .find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('product', 'name productId')          // only bring back name & sku
        .populate('performedBy', 'username email'),
      stockModel.countDocuments(filter)
    ]);

    const transactions = docs.map(doc => ({
      id:           doc.id,
      product:      doc.product,
      type:         doc.type,
      quantity:     doc.quantity,
      reference:    doc.reference,
      performedBy:  doc.performedBy,
      timestamp:    doc.timestamp
    }));

    return res.json({
      transactions,
      pagination: {
        total,
        page:   Number(page),
        pages:  Math.ceil(total / limit),
        limit:  Number(limit)
      }
    });
  } catch (err) {
    console.error('Inventory list error:', err);
    return res.status(500).json({
      error:   'Failed to retrieve inventory transactions.',
      details: err.message
    });
  }
};