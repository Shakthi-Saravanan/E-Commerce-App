const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./ecommerce.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the ecommerce database.');
});

// Enable Foreign Keys
db.exec('PRAGMA foreign_keys = ON;', (err) => {
  if (err) console.error("Could not enable foreign keys:", err);
});

// Create tables
db.serialize(() => {
  // User table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )`, (err) => {
    if (err) console.error("Error creating users table:", err.message);
  });

  // Products table
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_name TEXT,  /* <-- 1. THIS IS THE CHANGE (from 'name') */
    price REAL,         /* <-- Note: I changed 'price' back to REAL */
    description TEXT,
    imageUrl TEXT
  )`, (err) => {
    if (err) {
      console.error("Error creating products table:", err.message);
    } else {
      // Insert dummy products
      /* v-- 2. THIS IS THE OTHER CHANGE (from 'name') */
      const stmt = db.prepare("INSERT INTO products (product_name, price, description, imageUrl) VALUES (?, ?, ?, ?)");
      
      const products = [
        ['Laptop', 1200, 'A powerful laptop', 'http://localhost:5000/images/laptop.png'],
        ['Smartphone', 800, 'A smart smartphone', 'http://localhost:5000/images/smartphone.jpg'],
        ['Headphones', 150, 'Noise-cancelling headphones', 'http://localhost:5000/images/headphones.jpg'],
        ['Coffee Maker', 80, 'Brews great coffee', 'http://localhost:5000/images/cofeemaker.jpg'],
        ['Mechanical Keyboard', 130, 'Clicky keys for typing', 'http://localhost:5000/images/keyboard.jpg'],
        ['Wireless Mouse', 75, 'Ergonomic wireless mouse', 'http://localhost:5000/images/mouse.jpg'],
        ['4K Monitor', 450, 'A sharp 27-inch 4K display', 'http://localhost:5000/images/monitor.jpg'],
        ['Webcam', 90, '1080p HD webcam for meetings', 'http://localhost:5000/images/webcam.png']
      ];

      db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
        if (err) {
          console.error("Error checking product count:", err);
        } else if (row.count === 0) {
          console.log("No products found, inserting dummy data...");
          products.forEach(p => stmt.run(p, (err) => {
            if (err) console.error("Error inserting product:", err);
          }));
          console.log("Dummy products inserted.");
        }
        
        stmt.finalize((err) => {
          if (err) console.error("Error finalizing statement:", err);
        });
      });
    }
  });

  // Cart table
  db.run(`CREATE TABLE IF NOT EXISTS cart (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (product_id) REFERENCES products (id)
  )`, (err) => {
    if (err) console.error("Error creating cart table:", err.message);
  });
});

module.exports = db;