require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 5000;

// ======================
//  Middleware Setup
// ======================
app.use(cors({ origin: "*" }));
app.use(express.json());

// ======================
//  Email Configuration
// ======================
const transporter = nodemailer.createTransport({
  host: "smtp.ionos.com",
  port: 465,
  secure: true,
  auth: {
    user: "Deals@equimaxmanagement.com",
    pass: "Winter@25!",
  },
  tls: { rejectUnauthorized: false },
});

// ======================
//  Database Configuration
// ======================
const pool = mysql.createPool({
  host: "maglev.proxy.rlwy.net",
  user: "root",
  password: "XMPmMPlDUEpfctzkdhHrfhDMTOvDzCoW",
  database: "railway",
  port: 52224,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ======================
//  Email Templates (Your Original Templates)
// ======================
const emailTemplates = {
  adminAlert: (data) => {
    const submissionDate = new Date(data.submissionDate).toLocaleString();
    return {
      from: '"Equimax Alerts" <Deals@equimaxmanagement.com>',
      to: "Deals@equimaxmanagement.com",
      subject: "URGENT: New Lead Submission - Equimax",
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #d9534f;">New Lead Submitted</h2>
          <p><strong>Full Name:</strong> ${data.fullName}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Phone:</strong> ${data.phone}</p>
          <p><strong>Borrower Type:</strong> ${data.borrowerType}</p>
          <p><strong>Loan Type:</strong> ${data.loanType}</p>
          <p><strong>Construction Type:</strong> ${data.constructionType}</p>
          <p><strong>Loan Amount:</strong> ${data.loanAmount}</p>
          <p><strong>Property Type:</strong> ${data.propertyType}</p>
          <p><strong>Property State:</strong> ${data.propertyState}</p>
          <p><strong>Referral Source:</strong> ${data.referralSource}</p>
          <p><strong>Consent:</strong> ${data.consent ? "Yes" : "No"}</p>
          <hr/>
          <p style="font-size: 12px; color: #888;">Submitted on: ${submissionDate}</p>
        </div>
      `,
      priority: 'high'
    };
  },

  userConfirmation: (data) => {
    const firstName = data.fullName.split(" ")[0];
    return {
      from: '"Equimax Management" <Deals@equimaxmanagement.com>',
      to: data.email,
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
    };
  }
};

// ======================
//  Core Functions
// ======================
const executeQuery = async (sql, values) => {
  const connection = await pool.getConnection();
  try {
    const [results] = await connection.query(sql, values);
    return results;
  } finally {
    connection.release();
  }
};

const sendEmail = (mailOptions) => {
  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      error ? reject(error) : resolve(info);
    });
  });
};

// ======================
//  Form Submission Endpoint
// ======================
app.post("/api/submit-form", async (req, res) => {
  try {
    // Validate required fields
    const requiredFields = ["fullName", "email", "phone", "borrowerType", "loanType"];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // Prepare form data
    const formData = {
      ...req.body,
      consent: !!req.body.consent,
      submissionDate: new Date().toISOString(),
    };

    // Database insertion
    const insertQuery = `
      INSERT INTO loan_applications 
      (${Object.keys(formData).join(", ")})
      VALUES (${Object.values(formData).map(() => "?").join(", ")})
    `;

    const dbResult = await executeQuery(insertQuery, Object.values(formData));

    // Send emails
    const [adminResult, userResult] = await Promise.allSettled([
      sendEmail(emailTemplates.adminAlert(formData)),
      sendEmail(emailTemplates.userConfirmation(formData)),
    ]);

    // Handle email errors
    const errors = [];
    if (adminResult.status === "rejected") errors.push("Admin alert failed");
    if (userResult.status === "rejected") errors.push("User confirmation failed");

    if (errors.length > 0) {
      return res.status(207).json({
        success: true,
        message: "Form submitted with partial email delivery",
        insertId: dbResult.insertId,
        errors,
      });
    }

    // Success response
    res.status(201).json({
      success: true,
      message: "Form submitted successfully",
      insertId: dbResult.insertId,
    });

  } catch (error) {
    console.error("System Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// ======================
//  Server Initialization
// ======================
app.listen(PORT, () => {
  console.log(`
  ====================================
  🚀 Server running on port ${PORT}
  📧 Email service: Deals@equimaxmanagement.com
  💾 Database: maglev.proxy.rlwy.net
  ====================================
  `);
});
