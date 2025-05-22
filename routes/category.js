
// routes/categoryRoutes.js
import Router from 'express';
import {createCategory,getCategories,getCategoryById,updateCategory,deleteCategory} from '../controller/category.js'

const categoryRouter = Router();

// Base path: /api/categories
categoryRouter.post('/create_category', createCategory);
categoryRouter.get('/get_categories', getCategories);
categoryRouter.get('/get_category/:id', getCategoryById);
categoryRouter.put('/update_category/:id', updateCategory);
categoryRouter.delete('/delete_category/:id', deleteCategory);

export default categoryRouter;
