// routes/stock.js
import { Router } from 'express';

import { createInventoryTransaction, listInventoryTransactions } from '../controller/stock.js';
import { isAuthenticated } from '../middlewares/auth.js';

const stockRouter = Router();
stockRouter.post('/inventory',isAuthenticated, createInventoryTransaction); 
stockRouter.get('/inventory',isAuthenticated, listInventoryTransactions);       // POST /api/stock
export default stockRouter;
