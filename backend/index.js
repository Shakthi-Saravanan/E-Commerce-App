const express = require('express');
const cors = require('cors');
const db = require('./database.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken, SECRET_KEY } = require('./middleware.js');
const path = require('path');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
// Serve static files (images) from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// --- Auth Routes ---

// Register
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  const hashedPassword = bcrypt.hashSync(password, 8);
  
  db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, hashedPassword], function(err) {
    if (err) {
      return res.status(500).json({ message: "Username already taken" });
    }
    res.status(201).json({ message: "User registered successfully", userId: this.lastID });
  });
});

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err || !user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const passwordIsValid = bcrypt.compareSync(password, user.password);
    if (!passwordIsValid) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: 86400 }); // 24 hours
    res.status(200).json({ auth: true, token: token });
  });
});

// --- Product Routes ---

// Get all products
app.get('/api/products', (req, res) => {
  const sql = "SELECT id, product_name AS name, price, description, imageUrl FROM products"
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(500).json({ message: "Error fetching products" });
      return;
    }
    res.json(rows);
  });
});

// **SAFE, FIXED ROUTE**
app.get('/api/products/search', (req, res) => {
  const queryName = req.query.name;

  // SAFE: Using parameterized queries
  const sql = "SELECT * FROM products WHERE name LIKE ?";
  const params = ['%' + queryName + '%']; // The driver safely handles the input

  console.log("Executing safe SQL:", sql, params);

  db.all(sql, params, (err, rows) => {
    if (err) {
      res.status(500).json({ message: "Error in search", error: err.message });
      return;
    }
    res.json(rows);
  });
});

// --- Cart Routes (Protected) ---

// Get user's cart
app.get('/api/cart', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const sql = `
    SELECT p.id, p.name, p.price, p.imageUrl, c.quantity 
    FROM cart c
    JOIN products p ON c.product_id = p.id
    WHERE c.user_id = ?`;
    
  db.all(sql, [userId], (err, rows) => {
    if (err) {
      res.status(500).json({ message: "Error fetching cart" });
      return;
    }
    res.json(rows);
  });
});

// Add to cart
app.post('/api/cart/add', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { productId, quantity } = req.body;

  if (!productId || !quantity || quantity <= 0) {
    return res.status(400).json({ message: "Invalid product data" });
  }

  // Check if item is already in cart
  db.get("SELECT * FROM cart WHERE user_id = ? AND product_id = ?", [userId, productId], (err, row) => {
    if (row) {
      // Update quantity
      const newQuantity = row.quantity + quantity;
      db.run("UPDATE cart SET quantity = ? WHERE id = ?", [newQuantity, row.id], (err) => {
        if (err) return res.status(500).json({ message: "Error updating cart" });
        res.status(200).json({ message: "Cart updated" });
      });
    } else {
  // Insert new item
  // WHAT IF productId IS '9999'?
  db.run("INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)", [userId, productId, quantity], (err) => {
    if (err) {
      // **THIS IS WHERE THE ERROR WILL BE CAUGHT**
      return res.status(500).json({ message: "Error adding to cart", error: err.message });
    }
    res.status(201).json({ message: "Item added to cart" });
  });
    } 
  });
});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});