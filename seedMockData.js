const bcrypt = require('bcrypt');
const {
    sequelize,
    User,
    Customer,
    Address,
    Brand,
    Category,
    Tag,
    Item,
    ItemImage,
    Orderinfo,
    Orderline,
    Transaction,
    Review,
    Wishlist,
    CollectionLog,
    Supplier,
    PurchaseOrder,
    PurchaseOrderLine
} = require('./models');

async function seed() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('DB connected successfully. Cleaning up tables...');

        // Destroy in safe dependency order
        await Transaction.destroy({ where: {} });
        await Orderline.destroy({ where: {} });
        await Orderinfo.destroy({ where: {} });
        await Review.destroy({ where: {} });
        await Wishlist.destroy({ where: {} });
        await CollectionLog.destroy({ where: {} });
        await PurchaseOrderLine.destroy({ where: {} });
        await PurchaseOrder.destroy({ where: {} });
        await ItemImage.destroy({ where: {} });
        await Item.destroy({ where: {} });
        await Supplier.destroy({ where: {} });
        await Brand.destroy({ where: {} });
        await Category.destroy({ where: {} });
        await Tag.destroy({ where: {} });
        await Customer.destroy({ where: {} });
        await Address.destroy({ where: {} });
        await User.destroy({ where: {} });

        console.log('All existing records cleaned. Seeding Core metadata...');

        // 1. Brands
        const popmart = await Brand.create({ name: 'Pop Mart', description: 'Pop Mart designer toys and collectibles' });
        const molly = await Brand.create({ name: 'Molly', description: 'Molly character series' });
        const tokidoki = await Brand.create({ name: 'Tokidoki', description: 'Tokidoki character universe' });
        const toys52 = await Brand.create({ name: '52Toys', description: '52Toys designer series' });
        const kaiyodo = await Brand.create({ name: 'Kaiyodo', description: 'Kaiyodo action figures and capsules' });

        // 2. Categories
        const blindBox = await Category.create({ name: 'blind box', description: 'Surprise blind boxes' });
        const limitedEd = await Category.create({ name: 'limited edition', description: 'Special edition action collectibles' });
        const actionFig = await Category.create({ name: 'action figure', description: 'Articulated models and figurines' });

        // 3. Tags
        const tagNew = await Tag.create({ name: 'new' });
        const tagSecret = await Tag.create({ name: 'secret' });
        const tagRare = await Tag.create({ name: 'rare' });
        const tagTrending = await Tag.create({ name: 'trending' });
        const tagClassic = await Tag.create({ name: 'classic' });

        // 4. Suppliers
        const supPopMart = await Supplier.create({
            name: 'Pop Mart Global Distribution',
            contact_person: 'Kenji Sato',
            email: 'wholesale@popmart.com',
            phone: '+86 10-8765-4321',
            address: 'No. 12 Chaoyang District, Beijing, China'
        });
        const supMolly = await Supplier.create({
            name: 'Molly Toys Wholesale Ltd',
            contact_person: 'Grace Lau',
            email: 'sales@mollytoys.com',
            phone: '+852 2345-6789',
            address: '77 Nathan Road, Tsim Sha Tsui, Hong Kong'
        });
        const supKaiyodo = await Supplier.create({
            name: 'Kaiyodo Japan Co.',
            contact_person: 'Takao Osawa',
            email: 'orders@kaiyodo.co.jp',
            phone: '+81 6-6909-1050',
            address: '1-10-5 Oyamada, Kadoma City, Osaka, Japan'
        });

        console.log('Seeding Users, Customers & Addresses...');

        const passHashAdmin = bcrypt.hashSync('admin123', 10);
        const passHashCust = bcrypt.hashSync('customer123', 10);

        // Admin User
        const adminUser = await User.create({
            name: 'Akira Admin',
            email: 'admin@littlemono.com',
            password: passHashAdmin,
            role: 'admin',
            token: '123456',
            is_verified: true
        });

        // 5 Customers
        const customersData = [
            { fname: 'Ardee', lname: 'Jhade', email: 'jhade@gmail.com', phone: '09123456789', dob: '1995-04-12', city: 'Manila', prov: 'Metro Manila', zip: '1000' },
            { fname: 'Ardee', lname: 'Orlanda', email: 'orlanda@gmail.com', phone: '09223456789', dob: '1996-08-20', city: 'Quezon City', prov: 'Metro Manila', zip: '1100' },
            { fname: 'Michael', lname: 'Tan', email: 'tan@gmail.com', phone: '09333456789', dob: '1998-11-05', city: 'Cebu City', prov: 'Cebu', zip: '6000' },
            { fname: 'Sarah', lname: 'Cruz', email: 'cruz@gmail.com', phone: '09443456789', dob: '1997-02-15', city: 'Davao City', prov: 'Davao del Sur', zip: '8000' },
            { fname: 'Jessica', lname: 'Lee', email: 'lee@gmail.com', phone: '09553456789', dob: '1994-06-25', city: 'Makati City', prov: 'Metro Manila', zip: '1200' }
        ];

        const seededUsers = [];
        const seededAddresses = [];

        for (const c of customersData) {
            const u = await User.create({
                name: `${c.fname} ${c.lname}`,
                email: c.email,
                password: passHashCust,
                role: 'customer',
                token: '654321',
                is_verified: true
            });

            await Customer.create({
                user_id: u.id,
                fname: c.fname,
                lname: c.lname,
                phone: c.phone,
                dob: c.dob
            });

            const addr = await Address.create({
                user_id: u.id,
                label: 'Shipping',
                street_address: `123 Oak Street, ${c.city}`,
                city: c.city,
                province: c.prov,
                zip_code: c.zip,
                country: 'Philippines',
                is_default: true
            });

            seededUsers.push(u);
            seededAddresses.push(addr);
        }

        console.log('Seeding Toy Figurines Items...');

        // 10 Items
        const items = [
            { description: 'Hirono Hero Prince (PrinceCenter) designer toy figurine.', brand_id: popmart.id, category_id: blindBox.id, supplier_id: supPopMart.id, cost_price: 350.00, sell_price: 599.00, quantity: 12, edition_type: 'Secret', probability: '1/144 (0.69%)', img: 'assets/toy_one.png', tags: [tagNew, tagSecret, tagRare] },
            { description: 'Hirono Chibi Character (model1) designer toy figurine.', brand_id: popmart.id, category_id: blindBox.id, supplier_id: supPopMart.id, cost_price: 300.00, sell_price: 499.00, quantity: 23, edition_type: 'Standard', probability: '1/12 (8.33%)', img: 'assets/toy_two.png', tags: [tagTrending, tagClassic] },
            { description: 'Hirono Chibi Figure (model2) designer toy figurine.', brand_id: popmart.id, category_id: blindBox.id, supplier_id: supPopMart.id, cost_price: 300.00, sell_price: 499.00, quantity: 20, edition_type: 'Standard', probability: '1/12 (8.33%)', img: 'assets/toy_three.png', tags: [tagClassic] },
            { description: 'Hirono Elephant Boy designer toy figurine.', brand_id: popmart.id, category_id: blindBox.id, supplier_id: supPopMart.id, cost_price: 320.00, sell_price: 529.00, quantity: 4, edition_type: 'Standard', probability: '1/12 (8.33%)', img: 'assets/toy_placeholder.png', tags: [tagTrending] }, // Low stock!
            { description: 'Space Molly Astronaut designer toy figurine.', brand_id: molly.id, category_id: limitedEd.id, supplier_id: supMolly.id, cost_price: 110.00, sell_price: 189.00, quantity: 5, edition_type: 'Limited', probability: '1/1', img: 'assets/toy_placeholder.png', tags: [tagNew, tagRare] }, // Low stock!
            { description: 'Space Molly Panda designer toy figurine.', brand_id: molly.id, category_id: limitedEd.id, supplier_id: supMolly.id, cost_price: 120.00, sell_price: 199.00, quantity: 15, edition_type: 'Limited', probability: '1/1', img: 'assets/toy_placeholder.png', tags: [tagTrending, tagRare] },
            { description: 'Tokidoki Unicorno Stellina designer toy figurine.', brand_id: tokidoki.id, category_id: blindBox.id, supplier_id: supKaiyodo.id, cost_price: 9.00, sell_price: 15.90, quantity: 25, edition_type: 'Standard', probability: '1/12', img: 'assets/toy_placeholder.png', tags: [tagClassic] },
            { description: 'Tokidoki Unicorno Honeybee designer toy figurine.', brand_id: tokidoki.id, category_id: blindBox.id, supplier_id: supKaiyodo.id, cost_price: 9.50, sell_price: 16.90, quantity: 3, edition_type: 'Chase', probability: '1/24 (4.17%)', img: 'assets/toy_placeholder.png', tags: [tagNew, tagSecret] }, // Low stock!
            { description: '52Toys Panda Roll series figurine.', brand_id: toys52.id, category_id: blindBox.id, supplier_id: supPopMart.id, cost_price: 8.50, sell_price: 14.50, quantity: 30, edition_type: 'Standard', probability: '1/12', img: 'assets/toy_placeholder.png', tags: [tagClassic] },
            { description: 'Kaiyodo Revoltech Evangelion action model figurine.', brand_id: kaiyodo.id, category_id: actionFig.id, supplier_id: supKaiyodo.id, cost_price: 45.00, sell_price: 79.90, quantity: 8, edition_type: 'Collector', probability: '1/1', img: 'assets/toy_placeholder.png', tags: [tagRare, tagTrending] }
        ];

        const seededItems = [];
        for (const item of items) {
            const it = await Item.create({
                brand_id: item.brand_id,
                category_id: item.category_id,
                supplier_id: item.supplier_id,
                description: item.description,
                cost_price: item.cost_price,
                sell_price: item.sell_price,
                quantity: item.quantity,
                edition_type: item.edition_type,
                probability: item.probability,
                img_path: item.img
            });

            // Set tags association
            if (item.tags && item.tags.length > 0) {
                await it.setTags(item.tags);
            }

            // Create image records
            await ItemImage.create({
                item_id: it.item_id,
                img_path: item.img,
                is_primary: true
            });

            seededItems.push(it);
        }

        console.log('Seeding Supplier Procurement Purchase Orders (Expenses)...');

        // 6 Purchase Orders spread across 2026-01 to 2026-07
        const poData = [
            { supplier_id: supPopMart.id, number: 'PO-2026-0001', notes: 'Initial restock for Pop Mart Hirono figurines.', cost: 8500.00, date: '2026-01-15T09:00:00.000Z' },
            { supplier_id: supMolly.id, number: 'PO-2026-0002', notes: 'Pre-order purchase for Space Molly Series.', cost: 12000.00, date: '2026-02-20T10:30:00.000Z' },
            { supplier_id: supKaiyodo.id, number: 'PO-2026-0003', notes: 'Unicorno Stellina and Honeybee collections.', cost: 2300.00, date: '2026-03-12T14:15:00.000Z' },
            { supplier_id: supPopMart.id, number: 'PO-2026-0004', notes: 'Restock Hirono Elephant boy and Panda roll.', cost: 4200.00, date: '2026-05-02T11:00:00.000Z' },
            { supplier_id: supMolly.id, number: 'PO-2026-0005', notes: 'Restock Space Molly Panda action figure series.', cost: 9500.00, date: '2026-06-18T08:30:00.000Z' },
            { supplier_id: supKaiyodo.id, number: 'PO-2026-0006', notes: 'Kaiyodo Action figures and Evangelion restock.', cost: 3500.00, date: '2026-07-03T16:45:00.000Z' }
        ];

        for (const po of poData) {
            const pOrder = await PurchaseOrder.create({
                supplier_id: po.supplier_id,
                po_number: po.number,
                notes: po.notes,
                total_cost: po.cost,
                created_at: po.date
            });

            // PO lines (just link random supplied products)
            await PurchaseOrderLine.create({
                purchase_order_id: pOrder.id,
                item_id: seededItems[Math.floor(Math.random() * seededItems.length)].item_id,
                quantity: 10,
                unit_cost: 15.00
            });
        }

        console.log('Seeding Customer Orders and Transactions (Sales)...');

        // 30 Orders distributed from 2026-01 to 2026-07
        const monthlyDistribution = [
            { count: 3, month: '01' },
            { count: 4, month: '02' },
            { count: 5, month: '03' },
            { count: 4, month: '04' },
            { count: 6, month: '05' },
            { count: 5, month: '06' },
            { count: 3, month: '07' }
        ];

        let txCount = 1;
        const gateWays = ['gcash', 'cod', 'paymaya', 'credit_card'];

        for (const dist of monthlyDistribution) {
            for (let i = 0; i < dist.count; i++) {
                const userIdx = Math.floor(Math.random() * seededUsers.length);
                const user = seededUsers[userIdx];
                const address = seededAddresses[userIdx];

                // Create date placed inside the month
                const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
                const datePlacedStr = `2026-${dist.month}-${day}T12:00:00.000Z`;

                const shippingCost = 15.00;

                // Create Orderinfo
                const order = await Orderinfo.create({
                    user_id: user.id,
                    address_id: address.address_id,
                    status_id: 2, // Paid (so they count towards revenue summary metrics!)
                    shipping_street: address.street_address,
                    shipping_city: address.city,
                    shipping_province: address.province,
                    shipping_zip: address.zip_code,
                    shipping: shippingCost, // stores shipping_fee
                    date_placed: datePlacedStr,
                    date_shipped: datePlacedStr
                });

                // Add 1-2 Orderlines
                const linesCount = Math.floor(Math.random() * 2) + 1;
                const itemsSelected = [];
                let orderTotal = 0;

                for (let k = 0; k < linesCount; k++) {
                    const item = seededItems[Math.floor(Math.random() * seededItems.length)];
                    if (itemsSelected.includes(item.item_id)) continue;
                    itemsSelected.push(item.item_id);

                    const qty = Math.floor(Math.random() * 2) + 1;
                    const price = item.sell_price;
                    orderTotal += qty * price;

                    await Orderline.create({
                        orderinfo_id: order.orderinfo_id,
                        item_id: item.item_id,
                        quantity: qty,
                        sell_price: price
                    });
                }

                // Payment Status: 85% paid, 10% pending, 5% cancelled
                const randVal = Math.random();
                let status = 'paid';
                let orderStatusId = 2; // Paid
                if (randVal > 0.95) {
                    status = 'cancelled';
                    orderStatusId = 5; // Cancelled
                } else if (randVal > 0.85) {
                    status = 'pending';
                    orderStatusId = 1; // Pending
                }

                await order.update({ status_id: orderStatusId });

                // Transaction (payments)
                await Transaction.create({
                    orderinfo_id: order.orderinfo_id,
                    payment_method: gateWays[Math.floor(Math.random() * gateWays.length)],
                    status: status,
                    transaction_ref: `REF-${dist.month}${day}-${txCount}`,
                    paid_at: status === 'paid' ? datePlacedStr : null,
                    transaction_date: datePlacedStr // maps to created_at
                });

                txCount++;
            }
        }

        console.log('Database seeded with rich mock data successfully!');
    } catch (err) {
        console.error('ERROR SEEDING DATA:', err);
    } finally {
        await sequelize.close();
    }
}

seed();
