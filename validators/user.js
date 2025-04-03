import Joi from "joi";

export const loginUserValidator = Joi.object({
  username: Joi.string().min(3).max(50),
  email: Joi.string().email(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid("cashier", "admin","super admin").required(),
}).xor('username','email');


export const createUserValidator = Joi.object({
    username: Joi.string().min(3).max(30).required().messages({
      "string.base": `"username" should be a type of 'text'`,
      "string.empty": `"username" cannot be an empty field`,
      "any.required": `"username" is a required field`,
    }),
    email: Joi.string().email().required().messages({
      "string.base": `"email" should be a type of 'text'`,
      "string.email": `"email" must be a valid email`,
      "string.empty": `"email" cannot be an empty field`,
      "any.required": `"email" is a required field`,
    }),
    password: Joi.string().min(6).required().messages({
      "string.base": `"password" should be a type of 'text'`,
      "string.empty": `"password" cannot be an empty field`,
      "string.min": `"password" should have a minimum length of 6`,
      "any.required": `"password" is a required field`,
    }),
    confirmPassword: Joi.string()
      .valid(Joi.ref("password"))
      .required()
      .messages({
        "any.only": `"confirmPassword" must match "password"`,
        "any.required": `"confirmPassword" is a required field`,
      }),
    role: Joi.string()
      .valid("cashier", "admin", "super admin")
      .required()
      .messages({
        "any.only": `"role" must be one of 'cashier', 'admin', or 'super admin'`,
        "any.required": `"role" is a required field`,
      }),
  });




export const updateUserValidator = Joi.object({
  username: Joi.string().min(3).max(30).optional(),
  email: Joi.string().email().optional(),
  role: Joi.string().valid('cashier', 'admin').optional()
});




export const getUserValidator = Joi.object({
  id: Joi.string().length(24).hex().messages({
    'string.base': `"id" should be a type of 'text'`,
    'string.hex': `"id" must be a valid hex string`,
    'any.required': `"id" is a required field`
  })
});



export const deleteUserValidator = Joi.object({
  id: Joi.string().length(24).hex().messages({
    'string.base': `"id" should be a type of 'text'`,
    'string.hex': `"id" must be a valid hex string`,
    'any.required': `"id" is a required field`
  })
});
