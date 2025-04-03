import { Router } from "express";
import { getAuthenticatedUser, loginUser, updateUser, createUser, getUsers, getUser, deleteUser } from "../controller/user.js";
import { isAuthenticated, authorizedRoles } from "../middlewares/auth.js";

//create user router
const userRouter = Router();


//define user routes
userRouter.post('/users/login', loginUser);
userRouter.get('/users/me', isAuthenticated, getAuthenticatedUser);



// User Management (Only Super Admin can manage users)

// Create a new user
userRouter.post('/users/create', isAuthenticated, authorizedRoles("super admin"), createUser);

 // Get all users
userRouter.get('/users', isAuthenticated, authorizedRoles("super admin"), getUsers); 

// Get a single user
userRouter.get('/users/:id', isAuthenticated, authorizedRoles("super admin"), getUser); 

// Update user details
userRouter.patch('/users/update/:id', isAuthenticated, authorizedRoles("super admin"), updateUser); 

// Delete a user
userRouter.delete('/users/delete/:id', isAuthenticated, authorizedRoles("super admin"), deleteUser); 

//export user router
export default userRouter;
