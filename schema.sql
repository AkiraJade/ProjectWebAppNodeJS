-- Create database if it does not exist
CREATE DATABASE IF NOT EXISTS little_mono;
USE little_mono;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'customer',
    token TEXT DEFAULT NULL,
    deleted_at DATETIME NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 2. Customer Table
CREATE TABLE IF NOT EXISTS customer (
    customer_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    fname VARCHAR(255) NULL,
    lname VARCHAR(255) NULL,
    addressline VARCHAR(255) NULL,
    zipcode VARCHAR(50) NULL,
    phone VARCHAR(50) NULL,
    image_path VARCHAR(255) NULL,
    dob DATE NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Addresses Table
CREATE TABLE IF NOT EXISTS addresses (
    address_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    street_address VARCHAR(255) NOT NULL,
    city VARCHAR(255) NOT NULL,
    province VARCHAR(255) NOT NULL,
    zip_code VARCHAR(50) NOT NULL,
    country VARCHAR(255) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Item Table
CREATE TABLE IF NOT EXISTS item (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    description TEXT NOT NULL,
    cost_price DECIMAL(10, 2) NOT NULL,
    sell_price DECIMAL(10, 2) NOT NULL,
    img_path VARCHAR(255) NULL
);

-- 4. Stock Table
CREATE TABLE IF NOT EXISTS stock (
    stock_id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT UNIQUE NOT NULL,
    quantity INT DEFAULT 0,
    FOREIGN KEY (item_id) REFERENCES item(item_id) ON DELETE CASCADE
);

-- Create item_images table for holding multiple figurine image uploads
CREATE TABLE IF NOT EXISTS item_images (
    image_id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    img_path VARCHAR(255) NOT NULL,
    FOREIGN KEY (item_id) REFERENCES item(item_id) ON DELETE CASCADE
);

-- 5. Orderinfo Table
CREATE TABLE IF NOT EXISTS orderinfo (
    orderinfo_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    date_placed DATETIME NOT NULL,
    date_shipped DATETIME NULL,
    shipping DECIMAL(10, 2) DEFAULT 0.00,
    FOREIGN KEY (customer_id) REFERENCES customer(customer_id) ON DELETE CASCADE
);

-- 6. Orderline Table
CREATE TABLE IF NOT EXISTS orderline (
    orderline_id INT AUTO_INCREMENT PRIMARY KEY,
    orderinfo_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity INT NOT NULL,
    FOREIGN KEY (orderinfo_id) REFERENCES orderinfo(orderinfo_id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES item(item_id) ON DELETE CASCADE
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    orderinfo_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (orderinfo_id) REFERENCES orderinfo(orderinfo_id) ON DELETE CASCADE
);

-- Insert Default Hirono Figurine Items & Stock (For immediate testing)
INSERT INTO item (item_id, description, cost_price, sell_price, img_path) VALUES
(1, 'Hirono Hero Prince (PrinceCenter)', 350.00, 599.00, 'assets/toy_1.png'),
(2, 'Hirono Chibi Character (model1)', 300.00, 499.00, 'assets/toy_2.png'),
(3, 'Hirono Chibi Figure (model2)', 300.00, 499.00, 'assets/toy_3.png'),
(4, 'Hirono Cute Hooded (model3)', 300.00, 499.00, NULL),
(5, 'Hirono Dinosaur Hoodie (model4)', 300.00, 499.00, NULL),
(6, 'Hirono Feathered Sheep (model5)', 300.00, 499.00, NULL),
(7, 'Hirono Lantern Headed (model6)', 300.00, 499.00, NULL),
(8, 'Hirono Rose Hooded (model7)', 300.00, 499.00, NULL),
(9, 'Hirono Royal Prince (model8)', 300.00, 499.00, NULL),
(10, 'Hirono Chibi Monk (model9)', 300.00, 499.00, NULL)
ON DUPLICATE KEY UPDATE description=VALUES(description);

INSERT INTO stock (item_id, quantity) VALUES
(1, 15),
(2, 25),
(3, 20),
(4, 10),
(5, 8),
(6, 12),
(7, 5),
(8, 14),
(9, 6),
(10, 18)
ON DUPLICATE KEY UPDATE quantity=VALUES(quantity);

-- 7. Seed Default User and Admin Test Accounts
INSERT INTO users (id, name, email, password, role) VALUES
(1, 'Default User', 'user@littlemono.com', '$2b$10$SkXtfx9G2BlV7PwFORvJWuE9G0bTbi3kYozJ5KNsJdFfAIo5U8e76', 'customer'),
(2, 'Default Admin', 'admin@littlemono.com', '$2b$10$aA80jNtKDMtvj3ZrAI/lnuYl/CBlrDHcSGsu2k7D90IWty.BDMdQC', 'admin')
ON DUPLICATE KEY UPDATE name=VALUES(name), role=VALUES(role);

INSERT INTO customer (customer_id, user_id, fname, lname, phone, dob) VALUES
(1, 1, 'Default', 'User', '123-456-7890', '1995-01-01'),
(2, 2, 'Default', 'Admin', '987-654-3210', '1990-01-01')
ON DUPLICATE KEY UPDATE fname=VALUES(fname);

-- 8. Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    item_id INT NOT NULL,
    rating INT NOT NULL,
    comment TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES item(item_id) ON DELETE CASCADE
);

-- 9. Wishlists Table
CREATE TABLE IF NOT EXISTS wishlists (
    wishlist_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    item_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES item(item_id) ON DELETE CASCADE,
    UNIQUE KEY unique_wishlist (user_id, item_id)
);

