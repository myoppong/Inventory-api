// controllers/categoryController.js
import { categoryModel} from '../models/category.js';

// Create a new category
export async function createCategory(req, res) {
  try {
    const { name, description } = req.body;
    const saved = await categoryModel.create({ name, description });
    res.status(201).json(saved);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Category name must be unique.' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}

// Get all categories
export async function getCategories(req, res) {
  try {
    const categories = await categoryModel.find().sort('name');
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}

// Get a single category by ID
export async function getCategoryById(req, res) {
  try {
    const { id } = req.params;
    const category = await categoryModel.findById(id);
    if (!category) return res.status(404).json({ message: 'Category not found.' });
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}

// Update a category
export async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const updated = await categoryModel.findByIdAndUpdate(
      id,
      { name, description },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'Category not found.' });
    res.json(updated);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Category name must be unique.' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}

// Delete a category
export async function deleteCategory(req, res) {
  try {
    const { id } = req.params;
    const deleted = await categoryModel.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Category not found.' });
    res.json({ message: 'Category deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}

