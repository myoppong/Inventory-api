// routes/stock.js
import { Router } from 'express';

import { createInventoryTransaction } from '../controller/stock.js';

const stockRouter = Router();
stockRouter.post('/stock', createInventoryTransaction);        // POST /api/stock
export default stockRouter;
