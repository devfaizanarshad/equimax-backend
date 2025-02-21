const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const textmagicClient = require('textmagic-client');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// TextMagic Authentication
const client = textmagicClient.ApiClient.instance;
const auth = client.authentications['BasicAuth'];

// Replace with valid TextMagic credentials
auth.username = 'oauthequimaxm';
auth.password = 'XCrvAR3tfPOCxmt0syU83fkMOcTaYy';

const api = new textmagicClient.TextMagicApi();

// MySQL Connection
const db = mysql.createConnection({
  host: "maglev.proxy.rlwy.net",
  user: "root",
  password: "ayppHlyWnpncdeijflmjCDeodbiPgkzU",
  database: "railway",
  port: 36661,
  connectTimeout: 10000,
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err.message);
  } else {
    console.log("Connected to MySQL database");
  }
});

// Ping TextMagic API to check connection
api.ping()
  .then((data) => console.log("TextMagic Ping:", data.ping))
  .catch((err) => console.error("TextMagic Ping Failed:", err));

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

    const firstName = fullName.split(" ")[0];
    const message = `Hi ${firstName}! Thanks for contacting Equimax Lending. We’ve got your info and will follow up soon. Need help? Email us at Equimaxm@gmail.com`;

    api.sendMessage({ text: message, phones: phone })
      .then((data) => {
        console.log("SMS sent successfully! Message ID:", data.id);
        res.status(200).json({
          message: "Form data saved & SMS sent successfully",
          insertId: result.insertId,
        });
      })
      .catch((smsErr) => {
        console.error("SMS sending failed:", smsErr);
        res.status(500).json({
          message: "Form data saved but SMS failed",
          error: smsErr,
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
