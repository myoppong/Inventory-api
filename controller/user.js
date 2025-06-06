import { userModel } from "../models/user.js";
import { createUserValidator, deleteUserValidator, loginUserValidator, updateUserValidator, getUserValidator } from "../validators/user.js"

import { updateMeValidator } from '../validators/user.js';
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { mailTransporter } from "../utils/mailing.js";
import mongoose from "mongoose";


export const loginUser = async (req, res, next) => {

    //validate user info
    const { error, value } = loginUserValidator.validate(req.body)
    if (error) {
        return res.status(422).json(error);
    }
    //Check database for user existence
    const user = await userModel.findOne({
        $or:[
            { username: value.username },
            { email: value.email }
        ]
    });


    if (!user) {
        return res.status(404).json('user does not exist')

    }


    //compare password with 
    const correctPassword = bcrypt.compareSync(value.password, user.password);

    if (!correctPassword) {
        return res.status(401).json('invalid password')
    }

    //generate access token
    const accessToken = jwt.sign(
        { id: user.id, role: user.role, username:user.username,  },
        process.env.JWT_SECRET_KEY,
        { expiresIn: '24h' }
    )


    //return response
    res.status(200).json({
        accessToken,
        user: {
            role: user.role,
            email: user.email,
            username: user.username
        }

    });

}


export const createUser = async (req, res, next) => {


    //validate request body
    const { error, value } = createUserValidator.validate(req.body);
    if (error) {
        return res.status(422).json({ message: error.details[0].message })
    }

    //check if user exist allready

    const existingUser = await userModel.findOne({

        $or: [
            { username: value.username },
            { email: value.email }
        ]
    })
    if (existingUser) {
        return res.status(400).json({ message: "email or username already exist" })
    }

    // hash password 
    const hashedPassword = await bcrypt.hash(value.password, 10);

    const result = await userModel.create({
        ...value,
        password: hashedPassword
    });
    //return response
    console.log("User registered");
    res.status(201).json({ message: "User created successfully", user: result });

}


export const updateUser = async (req, res, next) => {
    //validate request body
    const { error, value } = updateUserValidator.validate(req.body);
    if (error) {
        return res.status(422).json(error);
    }
 // Validate ObjectId
 if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "Invalid user ID format" });
  }

    //update user in database
    const result = await userModel.findByIdAndUpdate(
        req.params.id,
        value,
        { new: true }
    );
    //return  response 
    res.status(200).json(result);
}

export const deleteUser = async (req, res, next) => {
    //validate request body
    const { error, value } = deleteUserValidator.validate(req.body);

    if (error) {
        return res.status(422).json(error);
    }

    const result = await userModel.findByIdAndDelete(req.params.id);

    res.status(200).json(result);
}

// Get All Users    
export const getUsers = async (req, res) => {
    try {
        const users = await userModel.find();
        return res.status(200).json(users);
    } catch (error) {
        return res.status(500).json({ message: "Error fetching users", error });
    }
};

// Get Single User


export const getUser = async (req, res, next) => {
  // 1. Validate the incoming :id param
  const { error } = getUserValidator.validate(req.params);
  if (error) {
    return res
      .status(400)
      .json({ message: `Invalid user ID: ${error.details[0].message}` });
  }

  try {
    // 2. Find user by ID, exclude sensitive/internal fields
    const user = await userModel.findById(req.params.id)
      .select('-password -__v');

    // 3. Handle not found
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // 4. Build a clean response object
    const responseUser = {
      id:        user.id,
      username:  user.username,
      email:     user.email,
      role:      user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLogin: user.lastLogin,
      // …any other public fields…
    };

    // 5. Send it
    return res.status(200).json({
      message: 'User fetched successfully.',
      user:    responseUser,
    });
  } catch (err) {
    // 6. Forward unexpected errors
    return next(err);
  }
};




export const getAuthenticatedUser = async (req, res, next) => {
  try {
    // Atomically update lastLogin and return the new document
    const user = await userModel.findByIdAndUpdate(
      req.auth.id,
      { $set: { lastLogin: new Date() } },
      { new: true, select: '-password -__v' } // exclude password and __v
    );

    if (!user) {
      return res.status(404).json({ message: 'Authenticated user not found.' });
    }

    // Return a structured envelope
    return res.status(200).json({
      message: 'User fetched successfully.',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      updatedAt: user.updatedAt
        // any other safe fields you want exposed:
        // createdAt: user.createdAt,
      },
    });
  } catch (error) {
    // Pass unexpected errors to your error handler
    return next(error);
  }
};


export const updateMe = async (req, res, next) => {
  // 1. Extract only the allowed fields from req.body
  const allowed = (({ username, email, oldPassword, password, confirmPassword }) => ({
    username,
    email,
    oldPassword,
    password,
    confirmPassword,
  }))(req.body);

  // 2. Validate the incoming body
  const { error, value } = updateMeValidator.validate(allowed, { presence: "optional" });
  if (error) {
    return res.status(422).json({ message: error.details[0].message });
  }

  // 3. Fetch the user from DB to verify oldPassword (if provided)
  let user;
  try {
    user = await userModel.findById(req.auth.id).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
  } catch (err) {
    return next(err);
  }

  // 4. If password is being changed, verify oldPassword and then hash the new one
  if (value.password) {
    const isMatch = await bcrypt.compare(value.oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }
    value.password = await bcrypt.hash(value.password, 10);
  }

  // 5. Remove any fields we don't want to pass to Mongo (oldPassword, confirmPassword)
  delete value.oldPassword;
  delete value.confirmPassword;

  // 6. Update the current user
  try {
    const updated = await userModel.findByIdAndUpdate(
      req.auth.id,
      value,
      {
        new: true,
        select: "-password -__v",
      }
    );

    if (!updated) {
      return res.status(404).json({ message: "User not found." });
    }

    // 7. Return the updated public data
    return res.status(200).json({
      message: "Profile updated.",
      user: {
        id: updated.id,
        username: updated.username,
        email: updated.email,
        role: updated.role,
        updatedAt: updated.updatedAt,
        lastLogin: updated.lastLogin,
        createdAt: updated.createdAt,
      },
    });
  } catch (err) {
    return next(err);
  }
};
