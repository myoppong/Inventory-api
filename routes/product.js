import { Router } from "express";
import {
  createProduct,
  getProducts,
  getProductQuickView,
  updateProduct,
  deleteProduct,
  getProductDetails,
  printProductDetails,} from "../controller/product.js";
import { isAuthenticated, authorizedRoles } from "../middlewares/auth.js";
import { productPicturesUpload, } from "../utils/imagekit.js";

const productRouter = Router();

//  Create a new product (Only Admins)

productRouter.post("/products/create", isAuthenticated, authorizedRoles("admin"), productPicturesUpload.single("image"), createProduct);

//  Get all products (Authenticated users)
productRouter.get("/products", isAuthenticated, getProducts);

//  Quick view of a product (Authenticated users)
productRouter.get("/products/:id/quick-view", isAuthenticated, getProductQuickView);

//  Get product details (Authenticated users)
productRouter.get("/products/:id/product-details", isAuthenticated, getProductDetails);
//  Update a product (Only Admins)
productRouter.patch("/products/:id/update", isAuthenticated, authorizedRoles("admin"),productPicturesUpload.single("image"), updateProduct);

//  Delete a product (Only Admins)
productRouter.delete("/products/:id/delete", isAuthenticated, authorizedRoles("admin"), deleteProduct);

//  Print Product QR Code & Barcode (Authenticated users)
productRouter.get("/products/:id/print", isAuthenticated, printProductDetails);

export default productRouter;
