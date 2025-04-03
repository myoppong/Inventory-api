import { createTransport } from "nodemailer";

export const mailTransporter = createTransport({

    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: 'michaeloppong03@gmail.com',
        pass: 'obna vsvd stnu svem'
    }
});




export const registerUserMailTemplate = ` <div> 
<h1> Dear {{value.username}}</h1>
<p>A new has been created for you!</p>
<h2>Thank you!</h2> 

</div>`