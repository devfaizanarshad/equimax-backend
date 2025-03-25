require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Direct SMTP Connection for Instant Delivery
const transporter = nodemailer.createTransport({
  host: "smtp.ionos.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  socketTimeout: 10000,
  connectionTimeout: 5000,
});

// MySQL Pool
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
});

// Priority Email Sending Function
const sendPriorityEmail = (mailOptions) => {
  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("Email Error:", err);
        reject(err);
      } else {
        console.log("Email Delivered:", info.messageId);
        resolve(info);
      }
    });
  });
};

// Submission Endpoint
app.post("/api/submit-form", async (req, res) => {
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

  console.log("Passed checeks");
  

  try {
    // Admin Email
    const adminMailOptions = {
      from: '"Equimax Alerts" <Deals@equimaxmanagement.com>',
      to: "Deals@equimaxmanagement.com",
      subject: "URGENT: New Lead Submission - Equimax",
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
      priority: 'high' // Set high priority flag
    };

    console.log("Passed tamaplates");


    const adminPromise = sendPriorityEmail(adminMailOptions);

    console.log("Passed promise");


    const firstName = fullName.split(" ")[0]; // Extracts first name from full name

        // User Email
        const userMailOptions = {
          from: "Deals@equimaxmanagement.com",
          to: email,
          subject: "Thank You for Your Application - Equimax",
          html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
              <h2 style="color: #2e86de; text-align: center;">Thank You for Your Application!</h2>
              <p>Dear ${firstName},</p>
              <p>Thank you for taking the time to complete your application with <a href="https://equimaxmanagement.com" style="color: #2e86de; text-decoration: none;">Equimax</a>. We appreciate your interest and are excited about the opportunity to support you in achieving your financial goals.</p>
              <p>Our team is currently reviewing your information and will be in touch shortly to discuss the next steps.</p>
              <p>If you have any questions or would like to provide additional details, feel free to reply to this email.</p>
              <p>At <a href="https://equimaxmanagement.com" style="color: #2e86de; text-decoration: none;">Equimax</a>, we are dedicated to offering tailored lending solutions with speed, transparency, and expertise.</p>
              <p>We look forward to working with you and will follow up soon with more information.</p>
              <p><strong>Contact Us:</strong></p>
              <p>📍 <strong>Office Location:</strong> 3415 S Sepulveda Blvd, Suite 400, Los Angeles, CA 90034</p>
              <p>📧 <strong>Email:</strong> Deals@equimaxmanagement.com</p>
              <p>📞 <strong>Phone:</strong> 866-784-6780</p>
              <p>Best regards,</p>
              <p><strong>The Equimax Team</strong></p>
            </div>
          `,
          priority: 'high' // Set high priority flag

        };

        console.log("Passed user tamplate");

    
        console.log(userMailOptions);
        
    
        const userPromise = sendPriorityEmail(userMailOptions);
    
        // Ensure Admin Email is Prioritized
        await Promise.all([adminPromise, userPromise]);

    // Save to Database
    const dbResult = await new Promise((resolve, reject) => {
      const sql = `INSERT INTO loan_applications SET ?`;
      db.query(sql, req.body, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });

    res.status(200).json({
      message: "Form submitted successfully",
      insertId: dbResult.insertId
    });

  } catch (error) {
    console.error("Submission Error:", error);
    res.status(500).json({ message: "Error processing your submission", error: error.message });
  }
});

// Test Route
app.get("/api/hello", (req, res) => {
  res.status(200).json({ message: "Hello World!" });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
