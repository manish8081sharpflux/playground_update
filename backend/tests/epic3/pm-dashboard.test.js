const mongoose = require('mongoose');
const PurchaseRequest = require('../../models/purchaseRequest');
const ShopItem = require('../../models/shopItem');
const Vendor = require('../../models/vendor');
const User = require('../../models/user');
const shopController = require('../../controllers/shopController');
const { mockRequest, mockResponse } = global.testUtils || {
    mockRequest: (data) => ({ ...data, body: data.body || {}, params: data.params || {}, query: data.query || {}, user: data.user || {} }),
    mockResponse: () => {
        const res = {};
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        return res;
    }
};

describe('Epic 3: PM Dashboard Extensions (Stories 3.6, 3.7)', () => {
    let pmUser, adminUser;

    beforeAll(async () => {
        // Create users
        pmUser = new User({ _id: new mongoose.Types.ObjectId(), role: 'purchase-manager', name: 'PM', email: 'pm@test.com' });
        adminUser = new User({ _id: new mongoose.Types.ObjectId(), role: 'admin', name: 'Admin', email: 'admin@test.com' });
    });

    afterEach(async () => {
        await PurchaseRequest.deleteMany({});
        await ShopItem.deleteMany({});
        await Vendor.deleteMany({});
        // Reset counter if possible, or just ignore for sequential checks if we rely on relative increment
        // Since we can't easily reset the internal counter model from here without importing it
    });

    describe('Story 3.7: Short Request IDs', () => {
        it('should generate a 5-digit short ID on creation (PR-0000X)', async () => {
            // Create first request
            const pr1 = new PurchaseRequest({
                requestedBy: adminUser._id,
                balagruhaId: 'STOCK',
                category: 'Others',
                reason: 'Test 1',
                status: 'pending',
                items: []
            });
            await pr1.save();

            // Create second request
            const pr2 = new PurchaseRequest({
                requestedBy: adminUser._id,
                balagruhaId: 'STOCK',
                category: 'Others',
                reason: 'Test 2',
                status: 'pending',
                items: []
            });
            await pr2.save();

            expect(pr1.requestId).toMatch(/^PR-\d{5}$/);
            expect(pr2.requestId).toMatch(/^PR-\d{5}$/);

            // Extract numbers to verify increment
            const num1 = parseInt(pr1.requestId.split('-')[1]);
            const num2 = parseInt(pr2.requestId.split('-')[1]);

            expect(num2).toBeGreaterThan(num1);
        });
    });

    describe('Story 3.6: Additional Status Tabs (Analytics)', () => {
        // Setup data for analytics tests
        let vendor1, vendor2;
        let product1, product2, product3;

        beforeEach(async () => {
            // Create Vendors
            vendor1 = await Vendor.create({
                name: 'Vendor A',
                isActive: true,
                email: 'v1@test.com',
                phone: '9876543210',
                address: '123 Vendor St, City'
            });
            vendor2 = await Vendor.create({
                name: 'Vendor B',
                isActive: true,
                email: 'v2@test.com',
                phone: '9876543211',
                address: '456 Supplier Ave, Town'
            });

            // Create Products with variable stock and vendor assignments
            product1 = await ShopItem.create({
                name: 'High Stock Item',
                stock: 100, // In Stock
                lowStockThreshold: 10,
                approvedVendors: [{ vendorId: vendor1._id }],
                category: 'Others',
                purchaseCategory: 'Consumables',
                isActive: true,
                price: 100,
                sku: 'SKU-1-' + Date.now(),
                description: 'Test Description 1'
            });

            product2 = await ShopItem.create({
                name: 'Low Stock Item',
                stock: 5, // Low Stock (<= 10)
                lowStockThreshold: 10,
                approvedVendors: [{ vendorId: vendor1._id }, { vendorId: vendor2._id }],
                category: 'Others',
                purchaseCategory: 'Medicines',
                isActive: true,
                price: 200,
                sku: 'SKU-2-' + Date.now(),
                description: 'Test Description 2'
            });

            product3 = await ShopItem.create({
                name: 'Out of Stock Item',
                stock: 0, // Out of Stock
                lowStockThreshold: 10,
                approvedVendors: [{ vendorId: vendor2._id }],
                category: 'Others',
                purchaseCategory: 'Repairs',
                isActive: true,
                price: 300,
                sku: 'SKU-3-' + Date.now(),
                description: 'Test Description 3'
            });

            // Create Purchase Requests for consumption stats
            await PurchaseRequest.create({
                requestedBy: adminUser._id,
                balagruhaId: 'STOCK',
                status: 'delivered_store',
                category: 'Consumables',
                reason: 'Refill 1',
                items: [{
                    productId: product1._id,
                    productName: product1.name,
                    productSKU: product1.sku,
                    requestedQuantity: 50,
                    currentStock: product1.stock,
                    lowStockThreshold: product1.lowStockThreshold,
                    estimatedUnitCost: product1.price,
                    estimatedTotalCost: product1.price * 50
                }]
            });
            await PurchaseRequest.create({
                requestedBy: adminUser._id,
                balagruhaId: 'STOCK',
                status: 'delivered_store',
                category: 'Consumables',
                reason: 'Refill 2',
                items: [{
                    productId: product1._id,
                    productName: product1.name,
                    productSKU: product1.sku,
                    requestedQuantity: 20,
                    currentStock: product1.stock,
                    lowStockThreshold: product1.lowStockThreshold,
                    estimatedUnitCost: product1.price,
                    estimatedTotalCost: product1.price * 20
                }] // Total 70 for p1
            });
            await PurchaseRequest.create({
                requestedBy: adminUser._id,
                balagruhaId: 'STOCK',
                status: 'pending',
                category: 'Medicines',
                reason: 'Emergency',
                items: [{
                    productId: product2._id,
                    productName: product2.name,
                    productSKU: product2.sku,
                    requestedQuantity: 10,
                    currentStock: product2.stock,
                    lowStockThreshold: product2.lowStockThreshold,
                    estimatedUnitCost: product2.price,
                    estimatedTotalCost: product2.price * 10
                }] // Total 10 for p2
            });
        });

        it('getStockLevels should categorize stock correctly', async () => {
            const req = mockRequest({ query: {}, user: pmUser });
            const res = mockResponse();

            await shopController.getStockLevels(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
            const response = res.json.mock.calls[0][0];
            const data = response.data;

            expect(data).toHaveLength(3);

            const p1 = data.find(p => p._id.toString() === product1._id.toString());
            expect(p1.stockStatus).toBe('in_stock');

            const p2 = data.find(p => p._id.toString() === product2._id.toString());
            expect(p2.stockStatus).toBe('low_stock');

            const p3 = data.find(p => p._id.toString() === product3._id.toString());
            expect(p3.stockStatus).toBe('out_of_stock');

            expect(response.summary).toEqual({
                total: 3,
                inStock: 1,
                lowStock: 1,
                outOfStock: 1
            });
        });

        it('getVendorsWithProductCount should count products per vendor', async () => {
            const req = mockRequest({ query: {}, user: pmUser });
            const res = mockResponse();

            await shopController.getVendorsWithProductCount(req, res);

            // Controller returns the array directly (res.json(vendors))
            const response = res.json.mock.calls[0][0];
            expect(Array.isArray(response)).toBe(true);
            const vendors = response;

            // Vendor A has P1 and P2 -> count 2
            // Vendor B has P2 and P3 -> count 2
            const v1 = vendors.find(v => v._id.toString() === vendor1._id.toString());
            const v2 = vendors.find(v => v._id.toString() === vendor2._id.toString());

            expect(v1.productCount).toBe(2);
            expect(v2.productCount).toBe(2);
        });

        it('getMostConsumed should aggregate quantities correctly', async () => {
            const req = mockRequest({ query: { period: 'all' }, user: pmUser });
            const res = mockResponse();

            await shopController.getMostConsumed(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
            const response = res.json.mock.calls[0][0];
            const stats = response.data;

            const s1 = stats.find(s => s.productId.toString() === product1._id.toString());
            expect(s1.totalQuantity).toBe(70);
            expect(s1.requestCount).toBe(2);

            const s2 = stats.find(s => s.productId.toString() === product2._id.toString());
            expect(s2.totalQuantity).toBe(10);
            expect(s2.requestCount).toBe(1);
        });
    });
});
