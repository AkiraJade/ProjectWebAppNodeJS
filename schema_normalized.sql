-- ============================================================
-- Little Mono Figurine Store - Normalized Database Schema
-- ============================================================

DROP DATABASE IF EXISTS little_mono;
CREATE DATABASE little_mono;
USE little_mono;

-- ------------------------------------------------------------
-- 1. Users Table
-- ------------------------------------------------------------
CREATE TABLE users (
  id            INT          NOT NULL AUTO_INCREMENT,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('admin', 'customer') NOT NULL DEFAULT 'customer',
  token         TEXT         NULL DEFAULT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP    NULL DEFAULT NULL,
  PRIMARY KEY (id)
);

-- ------------------------------------------------------------
-- 2. Customer Table (No address fields or redundancies)
-- ------------------------------------------------------------
CREATE TABLE customer (
  id                 INT          NOT NULL AUTO_INCREMENT,
  user_id            INT          NOT NULL UNIQUE,
  first_name         VARCHAR(100) NOT NULL,
  last_name          VARCHAR(100) NOT NULL,
  phone              VARCHAR(30)  NULL,
  profile_image_path VARCHAR(255) NULL,
  dob                DATE         NULL,
  created_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at         TIMESTAMP    NULL DEFAULT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_customer_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- ------------------------------------------------------------
-- 3. Customer Addresses Table
-- ------------------------------------------------------------
CREATE TABLE customer_addresses (
  id         INT          NOT NULL AUTO_INCREMENT,
  user_id    INT          NOT NULL,
  label      VARCHAR(50)  NOT NULL DEFAULT 'Home',
  street     VARCHAR(255) NOT NULL,
  city       VARCHAR(100) NOT NULL,
  province   VARCHAR(100) NOT NULL,
  zip_code   VARCHAR(20)  NOT NULL,
  country    VARCHAR(100) NOT NULL DEFAULT 'Philippines',
  is_default BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP    NULL DEFAULT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_address_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- ------------------------------------------------------------
-- 4. Brand Lookup Table
-- ------------------------------------------------------------
CREATE TABLE brand (
  id          INT          NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT         NULL,
  logo_path   VARCHAR(255) NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP    NULL DEFAULT NULL,
  PRIMARY KEY (id)
);

-- ------------------------------------------------------------
-- 5. Category Lookup Table
-- ------------------------------------------------------------
CREATE TABLE category (
  id          INT          NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT         NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP    NULL DEFAULT NULL,
  PRIMARY KEY (id)
);

-- ------------------------------------------------------------
-- 6. Tag Lookup Table
-- ------------------------------------------------------------
CREATE TABLE tag (
  id          INT          NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100) NOT NULL UNIQUE,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP    NULL DEFAULT NULL,
  PRIMARY KEY (id)
);

-- ------------------------------------------------------------
-- 7. Item Table (Stock quantity merged to remove 1:1 redundancy)
-- ------------------------------------------------------------
CREATE TABLE item (
  id          INT            NOT NULL AUTO_INCREMENT,
  brand_id    INT            NOT NULL,
  category_id INT            NOT NULL,
  name        VARCHAR(150)   NOT NULL,
  description TEXT           NOT NULL,
  cost_price  DECIMAL(10, 2) NOT NULL,
  sell_price  DECIMAL(10, 2) NOT NULL,
  quantity    INT            NOT NULL DEFAULT 0,
  created_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP      NULL DEFAULT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_item_brand
    FOREIGN KEY (brand_id) REFERENCES brand (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_item_category
    FOREIGN KEY (category_id) REFERENCES category (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ------------------------------------------------------------
-- 8. Item Tags (Pivot / Junction Table)
-- NO SURROGATE PRIMARY KEY (Uses composite key of the two foreign keys)
-- ------------------------------------------------------------
CREATE TABLE item_tags (
  item_id INT NOT NULL,
  tag_id  INT NOT NULL,
  PRIMARY KEY (item_id, tag_id),
  CONSTRAINT fk_item_tags_item
    FOREIGN KEY (item_id) REFERENCES item (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_item_tags_tag
    FOREIGN KEY (tag_id) REFERENCES tag (id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- ------------------------------------------------------------
-- 9. Item Images Table
-- ------------------------------------------------------------
CREATE TABLE item_images (
  id         INT          NOT NULL AUTO_INCREMENT,
  item_id    INT          NOT NULL,
  image_path VARCHAR(255) NOT NULL,
  is_primary BOOLEAN      NOT NULL DEFAULT FALSE,
  sort_order INT          NOT NULL DEFAULT 0,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_item_image_item
    FOREIGN KEY (item_id) REFERENCES item (id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- ------------------------------------------------------------
-- 10. Order Statuses Lookup Table
-- ------------------------------------------------------------
CREATE TABLE order_statuses (
  id          INT          NOT NULL AUTO_INCREMENT,
  status_name VARCHAR(50)  NOT NULL UNIQUE,
  PRIMARY KEY (id)
);

-- ------------------------------------------------------------
-- 11. Order Info Table (No total columns, shipping address snapshotted)
-- ------------------------------------------------------------
CREATE TABLE orderinfo (
  id                INT            NOT NULL AUTO_INCREMENT,
  user_id           INT            NOT NULL,
  address_id        INT            NOT NULL,
  status_id         INT            NOT NULL DEFAULT 1,
  shipping_street   VARCHAR(255)   NOT NULL,
  shipping_city     VARCHAR(100)   NOT NULL,
  shipping_province VARCHAR(100)   NOT NULL,
  shipping_zip      VARCHAR(20)    NOT NULL,
  shipping_fee      DECIMAL(10, 2) NOT NULL DEFAULT 100.00,
  date_placed       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_shipped      TIMESTAMP      NULL DEFAULT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_orderinfo_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_orderinfo_address
    FOREIGN KEY (address_id) REFERENCES customer_addresses (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_orderinfo_status
    FOREIGN KEY (status_id) REFERENCES order_statuses (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ------------------------------------------------------------
-- 12. Order Line (Pivot / Junction Table)
-- NO SURROGATE PRIMARY KEY (Uses composite key: orderinfo_id, item_id)
-- ------------------------------------------------------------
CREATE TABLE orderline (
  orderinfo_id INT            NOT NULL,
  item_id      INT            NOT NULL,
  quantity     INT            NOT NULL DEFAULT 1,
  sell_price   DECIMAL(10, 2) NOT NULL,
  PRIMARY KEY (orderinfo_id, item_id),
  CONSTRAINT fk_orderline_orderinfo
    FOREIGN KEY (orderinfo_id) REFERENCES orderinfo (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_orderline_item
    FOREIGN KEY (item_id) REFERENCES item (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ------------------------------------------------------------
-- 13. Payments Table (No total/amount field since it is aggregated)
-- ------------------------------------------------------------
CREATE TABLE payments (
  id              INT            NOT NULL AUTO_INCREMENT,
  orderinfo_id    INT            NOT NULL UNIQUE,
  payment_method  ENUM('cod', 'gcash', 'card', 'bank_transfer') NOT NULL DEFAULT 'cod',
  payment_status  ENUM('pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  transaction_ref VARCHAR(255)   NULL,
  paid_at         TIMESTAMP      NULL DEFAULT NULL,
  created_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_payment_orderinfo
    FOREIGN KEY (orderinfo_id) REFERENCES orderinfo (id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- ------------------------------------------------------------
-- 14. Review Table
-- ------------------------------------------------------------
CREATE TABLE review (
  id         INT       NOT NULL AUTO_INCREMENT,
  user_id    INT       NOT NULL,
  item_id    INT       NOT NULL,
  rating     TINYINT   NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT      NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_review_user_item (user_id, item_id),
  CONSTRAINT fk_review_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_review_item
    FOREIGN KEY (item_id) REFERENCES item (id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- ------------------------------------------------------------
-- 15. Wishlist (Pivot / Junction Table)
-- NO SURROGATE PRIMARY KEY (Uses composite key: user_id, item_id)
-- ------------------------------------------------------------
CREATE TABLE wishlist (
  user_id    INT       NOT NULL,
  item_id    INT       NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, item_id),
  CONSTRAINT fk_wishlist_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_wishlist_item
    FOREIGN KEY (item_id) REFERENCES item (id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- ------------------------------------------------------------
-- 16. Seed Initial Data
-- ------------------------------------------------------------

-- Seed default brands
INSERT INTO brand (id, name, description) VALUES
(1, 'Pop Mart', 'Pop Mart designer toys and collectibles'),
(2, '52Toys', '52Toys sub-brands and action figures'),
(3, 'Finding Unicorn', 'Finding Unicorn art toys');

-- Seed default categories
INSERT INTO category (id, name, description) VALUES
(1, 'blind box', 'Blind box mystery packages'),
(2, 'action figure', 'Articulated action figures'),
(3, 'plush toy', 'Collectible plushies');

-- Seed default tags
INSERT INTO tag (id, name) VALUES
(1, 'hirono'),
(2, 'new'),
(3, 'limited'),
(4, 'popular');

-- Seed Order Statuses
INSERT INTO order_statuses (id, status_name) VALUES
(1, 'Pending'),
(2, 'Processing'),
(3, 'Shipped'),
(4, 'Delivered'),
(5, 'Cancelled');

-- Seed users
INSERT INTO users (id, email, password_hash, role) VALUES
(1, 'user@littlemono.com', '$2b$10$rjuK2bhAABDJW4kaY81fP.mKxONwPy6UTEGage/sG8Hx8o1ixottm', 'customer'),
(2, 'admin@littlemono.com', '$2b$10$Ll/NdL.xl8QWQtY/gRXzPemiZNAYrN6uvAWygdthFV119kfDZQYIy', 'admin');

-- Seed customers
INSERT INTO customer (id, user_id, first_name, last_name, phone, dob) VALUES
(1, 1, 'Default', 'User', '123-456-7890', '1995-01-01'),
(2, 2, 'Default', 'Admin', '987-654-3210', '1990-01-01');

-- Seed customer addresses
INSERT INTO customer_addresses (id, user_id, label, street, city, province, zip_code, is_default) VALUES
(1, 1, 'Home', '123 Main St., Brgy. Teachers Village', 'Manila', 'Metro Manila', '1000', TRUE),
(2, 2, 'Office', '456 Admin Rd., BGC', 'Taguig City', 'Metro Manila', '1630', TRUE);

-- Seed Hirono items into item table (quantities included)
INSERT INTO item (id, brand_id, category_id, name, description, cost_price, sell_price, quantity) VALUES
(1, 1, 1, 'Hirono Hero Prince', 'Hirono Hero Prince (PrinceCenter) designer toy figurine.', 350.00, 599.00, 15),
(2, 1, 1, 'Hirono Chibi Character', 'Hirono Chibi Character (model1) designer toy figurine.', 300.00, 499.00, 25),
(3, 1, 1, 'Hirono Chibi Figure', 'Hirono Chibi Figure (model2) designer toy figurine.', 300.00, 499.00, 20),
(4, 1, 1, 'Hirono Cute Hooded', 'Hirono Cute Hooded (model3) designer toy figurine.', 300.00, 499.00, 10),
(5, 1, 1, 'Hirono Dinosaur Hoodie', 'Hirono Dinosaur Hoodie (model4) designer toy figurine.', 300.00, 499.00, 8),
(6, 1, 1, 'Hirono Feathered Sheep', 'Hirono Feathered Sheep (model5) designer toy figurine.', 300.00, 499.00, 12),
(7, 1, 1, 'Hirono Lantern Headed', 'Hirono Lantern Headed (model6) designer toy figurine.', 300.00, 499.00, 5),
(8, 1, 1, 'Hirono Rose Hooded', 'Hirono Rose Hooded (model7) designer toy figurine.', 300.00, 499.00, 14),
(9, 1, 1, 'Hirono Royal Prince', 'Hirono Royal Prince (model8) designer toy figurine.', 300.00, 499.00, 6),
(10, 1, 1, 'Hirono Chibi Monk', 'Hirono Chibi Monk (model9) designer toy figurine.', 300.00, 499.00, 18);

-- Seed item tags
INSERT INTO item_tags (item_id, tag_id) VALUES
(1, 1), (1, 2),
(2, 1),
(3, 1),
(4, 1), (4, 4),
(5, 1), (5, 2),
(6, 1),
(7, 1), (7, 3),
(8, 1),
(9, 1), (9, 3),
(10, 1);

-- Seed item images
INSERT INTO item_images (item_id, image_path, is_primary, sort_order) VALUES
(1, 'assets/toy_1.png', TRUE, 1),
(2, 'assets/toy_2.png', TRUE, 1),
(3, 'assets/toy_3.png', TRUE, 1);

