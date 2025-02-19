const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json()); // To parse JSON request bodies

// MySQL Connection
const db = mysql.createConnection({
    host: "maglev.proxy.rlwy.net",
    user: "root",
    password: "ayppHlyWnpncdeijflmjCDeodbiPgkzU",
    database: "railway",
    port: 36661,
    connectTimeout: 10000 // Optional: Increase timeout
  });
  
db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err.message);
  } else {
    console.log("Connected to MySQL database");
  }
});

app.get("/api/hello",(req, res)=>{
    res.status(200).json({ message: "Hello World!!!" });
})

// POST Endpoint to handle form submission
app.post("/api/submit-form", (req, res) => {

    console.log(req.body);
    

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
    res.status(200).json({ message: "Form data saved successfully", insertId: result.insertId });
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
