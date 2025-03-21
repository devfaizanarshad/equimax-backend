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
  host: "smtp.ionos.com",
  port: 465, // SSL port
  secure: true,
  auth: {
    user: "Deals@equimaxmanagement.com",
    pass: "Winter@25!", // Use app password if 2FA is enabled
  },
});

// MySQL Connection Pool
const db = mysql.createPool({
  host: "maglev.proxy.rlwy.net",
  user: "root",
  password: "XMPmMPlDUEpfctzkdhHrfhDMTOvDzCoW",
  database: "railway",
  port: 52224,
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

// API Endpoint for Form Submission
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

  if (!fullName || !email || !phone) {
    return res.status(400).json({ message: "Missing required fields" });
  }

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
      return res.status(500).json({ message: "Database error" });
    }

    console.log("Form data saved successfully");

    const firstName = fullName.split(" ")[0]; // Extract first name

    // Thank-You Email to User
    const userMailOptions = {
      from: "Deals@equimaxmanagement.com",
      to: email,
      subject: "Thank You for Your Application - Equimax",
      html: `
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
    ;
      `,
    };

    // Lead Submission Email to Admin
    const adminMailOptions = {
      from: "Deals@equimaxmanagement.com",
      to: "Deals@equimaxmanagement.com",
      subject: "New Lead Submission - Equimax",
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #d9534f;">New Lead Submitted</h2>
          <p><strong>Full Name:</strong> ${fullName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p><strong>Borrower Type:</strong> ${borrowerType}</p>
          <p><strong>Loan Type:</strong> ${loanType}</p>
          <p><strong>Construction Type:</strong> ${constructionType}</p>
          <p><strong>Loan Amount:</strong> ${loanAmount}</p>
          <p><strong>Property Type:</strong> ${propertyType}</p>
          <p><strong>Property State:</strong> ${propertyState}</p>
          <p><strong>Referral Source:</strong> ${referralSource}</p>
          <p><strong>Consent:</strong> ${consent ? "Yes" : "No"}</p>
          <hr/>
          <p style="font-size: 12px; color: #888;">Submitted on: ${new Date().toLocaleString()}</p>
        </div>
      `,
    };

    // Send Thank-You Email to User
    transporter.sendMail(userMailOptions, (userErr, userInfo) => {
      if (userErr) {
        console.error("Error sending user email:", userErr);
      } else {
        console.log("User email sent:", userInfo.response);
      }
    });

    // Send Lead Submission Email to Admin
    transporter.sendMail(adminMailOptions, (adminErr, adminInfo) => {
      if (adminErr) {
        console.error("Error sending admin email:", adminErr);
      } else {
        console.log("Admin email sent:", adminInfo.response);
      }
    });

    res.status(200).json({
      message: "Form submitted successfully",
      insertId: result.insertId,
    });
  });
});

// Test Route
app.get("/api/hello", (req, res) => {
  res.status(200).json({ message: "Hello World!!!" });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
