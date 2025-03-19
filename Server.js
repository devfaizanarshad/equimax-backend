require("dotenv").config(); // Load environment variables

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Nodemailer Setup for Email using 1&1 IONOS
const transporter = nodemailer.createTransport({
  host: 'smtp.ionos.com',  // 1&1 IONOS SMTP server
  port: 465,               // Use 465 for SSL or 587 for TLS
  secure: true,            // Set to true if using SSL
  auth: {
    user: 'Deals@equimaxmanagement.com',  // Your full email address
    pass: 'Winter@25!',                  // Your email password (or app password if 2FA is enabled)
  },
});

// MySQL Connection (Directly in Code)
const db = mysql.createPool({
  host: "maglev.proxy.rlwy.net",    
  user: "root",                     
  password: "ayppHlyWnpncdeijflmjCDeodbiPgkzU",  
  database: "railway",              
  port: 36661,                      
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test Database Connection
db.getConnection((err, connection) => {
  if (err) {
    console.error("Database connection failed:", err.message);
  } else {
    console.log("Connected to MySQL database");
    connection.release();
  }
});

// POST Endpoint to handle form submission
app.post("/api/submit-form", (req, res) => {
  const {
    borrowerType,
    loanType,
    constructionType,
    loanAmount,
    propertyType,
    propertyState,
    referralSource,
    fullName,
    email,
    phone,
    consent,
  } = req.body;

  const sql = `
    INSERT INTO loan_applications (
      borrower_type, loan_type, construction_type, loan_amount, property_type,
      property_state, referral_source, fullname, email, phone, consent
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    borrowerType,
    loanType,
    constructionType,
    loanAmount,
    propertyType,
    propertyState,
    referralSource,
    fullName,
    email,
    phone,
    consent,
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Error inserting data:", err.message);
      return res.status(500).json({ message: "Failed to save form data" });
    }

    console.log("Form data saved successfully");

    // Prepare the email content
    const firstName = fullName.split(" ")[0]; // Extract first name
    const htmlMessage = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body {
            font-family: Arial, sans-serif;
            color: #333333;
            line-height: 1.6;
          }
          .container {
            max-width: 600px;
            margin: auto;
            padding: 20px;
            border: 1px solid #eeeeee;
            border-radius: 8px;
            background-color: #ffffff;
          }
          .header {
            text-align: center;
            padding-bottom: 20px;
          }
          .header h2 {
            color: #2e86de;
            margin: 0;
          }
          .content {
            font-size: 16px;
          }
          .footer {
            margin-top: 30px;
            font-size: 14px;
            color: #888888;
            text-align: center;
          }
          .highlight {
            color: #2e86de;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Thank You for Your Application!</h2>
          </div>
          <div class="content">
            <p>Dear ${firstName},</p>
    
            <p>
              Thank you for taking the time to complete your application with 
              <span class="highlight">Equimax</span>. We appreciate your interest and 
              are excited about the opportunity to support you in achieving your financial goals.
            </p>
    
            <p>
              Our team is currently reviewing your information and will be in touch shortly to discuss the next steps.
            </p>
    
            <p>
              In the meantime, if you have any questions or would like to provide additional details, feel free to reply to this email.
            </p>
    
            <p>
              At <span class="highlight">Equimax</span>, we are dedicated to offering tailored lending solutions with speed, transparency, and expertise.
            </p>
    
            <p>
              We look forward to working with you and will follow up soon with more information.
            </p>
    
            <p>Best regards,<br /><strong>The Equimax Team</strong></p>
          </div>
    
          <div class="footer">
            © ${new Date().getFullYear()} Equimax Management. All rights reserved.
          </div>
        </div>
      </body>
    </html>
    `;
    

    // Email options
    const mailOptions = {
      from: 'Deals@equimaxmanagement.com', // Sender address (your email)
      to: email,                    // Receiver's email (the one provided by the user)
      subject: "Thank You for Your Interest – Next Steps with Equimax",
      html: htmlMessage,                // The body of the email
    };

    // Send email using Nodemailer
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("Error sending email:", err);
        return res.status(500).json({
          message: "Form data saved but email failed to send",
          error: err.message,
        });
      }

      console.log("Email sent successfully! Info:", info);
      res.status(200).json({
        message: "Form data saved & email sent successfully",
        insertId: result.insertId,
      });
    });
  });
});

// Test GET Endpoint
app.get("/api/hello", (req, res) => {
  res.status(200).json({ message: "Hello World!!!" });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
