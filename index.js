import express from 'express';
import userRouter from './routes/user.js';
import productRouter from './routes/product.js';
import categoryRouter from './routes/category.js';
import stockRouter from './routes/stock.js';
import cors from 'cors';
import  mongoose  from 'mongoose';
import { userModel } from './models/user.js';
import bcrypt from "bcrypt";
import dotenv from "dotenv";



dotenv.config()
await mongoose.connect(process.env.MONGO_URI)
const app = express();
app.use(express.json());

app.use(cors({
  origin: 'https://martstock.netlify.app', 
  credentials: true,               
}));
app.use(userRouter);
app.use(productRouter)
app.use(categoryRouter)
app.use(stockRouter)


// Create Super Admin
const createSuperAdmin = async () => {
  try {
      const existingSuperAdmin = await userModel.findOne({ role: "super admin" });

      if (!existingSuperAdmin) {
          const hashedPassword = await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD, 10);

          const result = await userModel.create({
              username: "superadmin",
              email: process.env.SUPER_ADMIN_EMAIL,
              password: hashedPassword,
              role: "super admin",
          });

          console.log("Super Admin Created: ");
      }
  } catch (error) {
      console.error("Error creating Super Admin:", error);
  }
};

// Call createSuperAdmin to add the super admin
createSuperAdmin();

//listen for incoming request
const port = process.env.port;
app.listen(port, () => {
    console.log(`server listening on port ${port}`);
})