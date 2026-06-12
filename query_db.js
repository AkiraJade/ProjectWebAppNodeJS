const { sequelize, Item, ItemImage } = require('./models');

async function checkDb() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');
        const items = await Item.findAll({
            include: [{ model: ItemImage, as: 'images' }]
        });
        console.log(`Found ${items.length} items in DB:`);
        items.forEach(item => {
            console.log(`ID: ${item.item_id} | Name: ${item.description}`);
            console.log(`  Main Image: ${item.img_path}`);
            console.log(`  Secondary Images:`, item.images.map(img => img.img_path));
        });
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkDb();
