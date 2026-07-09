const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const ShopItem = require('../models/shopItem');
const Vendor = require('../models/vendor');

async function cleanupAndAdd() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        // 1. Delete 'brain'
        const delResult = await ShopItem.deleteOne({ sku: 'SWP121' });
        console.log('DELETED brain:', delResult);

        // 2. Find a vendor for new products
        const vendor = await Vendor.findOne({ active: true });
        if (!vendor) {
            console.log('NO ACTIVE VENDOR FOUND');
            await mongoose.disconnect();
            return;
        }
        console.log('USING VENDOR:', vendor.name, vendor._id);

        // 3. Create test products
        const p1 = await ShopItem.create({
            sku: 'TEST-MED-001',
            name: 'Test Medicine',
            description: 'Test Medicine for Purchase Flow',
            category: 'Medicines',
            purchaseCategory: 'Medicines',
            price: 150,
            stock: 50,
            lowStockThreshold: 10,
            isActive: true,
            approvedVendors: [{ vendorId: vendor._id, rank: 1 }]
        });
        console.log('CREATED p1:', p1.name);

        const p2 = await ShopItem.create({
            sku: 'TEST-CON-001',
            name: 'Test Consumable',
            description: 'Test Consumable for Purchase Flow',
            category: 'Consumables',
            purchaseCategory: 'Consumables',
            price: 200,
            stock: 50,
            lowStockThreshold: 10,
            isActive: true,
            approvedVendors: [{ vendorId: vendor._id, rank: 1 }]
        });
        console.log('CREATED p2:', p2.name);

        await mongoose.disconnect();
        console.log('DONE');
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

cleanupAndAdd();
