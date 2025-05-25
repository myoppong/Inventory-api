// routes/stock.js
import { Router } from 'express';

import { createInventoryTransaction, listInventoryTransactions } from '../controller/stock.js';

const stockRouter = Router();
stockRouter.post('/inventory', createInventoryTransaction); 
stockRouter.post('/inventory', listInventoryTransactions);       // POST /api/stock
export default stockRouter;
