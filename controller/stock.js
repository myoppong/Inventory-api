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
      type === 'adjustment'   ? quantity : 0;

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
      performedBy: req.user?.id   // if you keep auth info in req.user
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