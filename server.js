const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();
app.use(cors());
app.use(express.json());

// 1. MySQL Database Connection Configuration
const db = mysql.createPool({
  host: 'localhost',
  user: 'TeamClover',      // Change if your MySQL user is different (e.g., 'root')
  password: 'YourNewPasswordHere', // REPLACE WITH YOUR ACTUAL MYSQL PASSWORD
  database: 'CloverLMS',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test Connection on startup
db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Successfully connected to the CloverLMS MySQL database!');
    connection.release();
  }
});

// ==========================================
// 2. AUTHENTICATION ENDPOINTS
// ==========================================

// LOGIN Endpoint (Handles Uni Students, Outside Students, and Instructors)
app.post('/api/login', (req, res) => {
  const { username, password, role } = req.body;

  if (role === 'instructor') {
    const sql = 'SELECT * FROM INSTRUCTOR WHERE username = ? AND password = ?';
    db.query(sql, [username, password], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0) return res.status(401).json({ error: 'Invalid instructor credentials' });
      res.json({ user: { ...results[0], role: 'instructor' } });
    });
  } else {
    // Student Login (Uni Student or Outside Student)
    const sql = 'SELECT * FROM STUDENT WHERE username = ? AND password = ?';
    db.query(sql, [username, password], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0) return res.status(401).json({ error: 'Invalid student credentials' });
      
      const student = results[0];
      res.json({ user: { ...student, role: student.role } });
    });
  }
});

// REGISTER Endpoint (Create Personal/Outside Student Account)
app.post('/api/register', (req, res) => {
  const { username, password, name } = req.body;

  if (!username || !password || !name) {
    return res.status(400).json({ error: 'Please provide all required fields.' });
  }

  // Check if username already exists
  const checkSql = 'SELECT * FROM STUDENT WHERE username = ?';
  db.query(checkSql, [username], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length > 0) {
      return res.status(400).json({ error: 'Username already exists. Please pick another.' });
    }

    // Generate unique Student ID
    const student_id = 'u_' + Date.now();
    const insertSql = `
      INSERT INTO STUDENT (student_id, username, password, name, student_type, university_id, role) 
      VALUES (?, ?, ?, ?, 'Outside', NULL, 'out_student')
    `;

    db.query(insertSql, [student_id, username, password, name], (err, result) => {
      if (err) {
        console.error('❌ Insert Error:', err);
        return res.status(500).json({ error: err.message });
      }
      console.log(`✅ New Outside Student registered: ${username} (${student_id})`);
      res.json({ 
        message: 'Account created successfully!', 
        user: { student_id, username, name, student_type: 'Outside', role: 'out_student' } 
      });
    });
  });
});

// ==========================================
// 3. COURSES & LECTURES ENDPOINTS
// ==========================================

// Get All Courses
app.get('/api/courses', (req, res) => {
  const sql = 'SELECT * FROM COURSE';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Get Lectures for a Specific Course
app.get('/api/courses/:courseId/lectures', (req, res) => {
  const { courseId } = req.params;
  const sql = 'SELECT * FROM LECTURE WHERE course_id = ?';
  db.query(sql, [courseId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Get Assignments for a Specific Course
app.get('/api/courses/:courseId/assignments', (req, res) => {
  const { courseId } = req.params;
  const sql = 'SELECT * FROM ASSIGNMENT WHERE course_id = ?';
  db.query(sql, [courseId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Get All Students (Helper route for debugging)
app.get('/api/students', (req, res) => {
  const sql = 'SELECT student_id, username, name, student_type, university_id, role FROM STUDENT';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// ==========================================
// 4. START SERVER
// ==========================================
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 CloverLMS Backend API running on http://localhost:${PORT}`);
});