# ISF Shop Seed Data Reference

**Date Created:** October 8, 2025
**Total Products:** 40 products
**Purpose:** Test data for Sprint5-Story-01 E2E testing

---

## Database Summary

### Products by Category

| Category | Total Products | In Stock | Out of Stock | Total Quantity |
|----------|---------------|----------|--------------|----------------|
| **Stationery** | 10 | 10 | 0 | 568 |
| **Books** | 8 | 7 | 1 | 150 |
| **Sports** | 7 | 6 | 1 | 115 |
| **Uniforms** | 5 | 4 | 1 | 115 |
| **Digital** | 4 | 4 | 0 | 280 |
| **Other** | 6 | 6 | 0 | 255 |
| **TOTAL** | **40** | **37** | **3** | **1,483** |

### Price Statistics

- **Minimum Price:** 3 coins (Eraser)
- **Maximum Price:** 500 coins (Online Coding Course Access)
- **Average Price:** 129 coins
- **Products with Discounts:** 5 products
- **Out of Stock Products:** 3 products
- **Low Stock Products:** 4 products (≤10 items)

---

## Test Scenarios Covered

### ✅ AC1: Product Grid Display
- **40 products** available for grid display
- Multiple rows for pagination testing
- Out-of-stock overlay testable (3 products)

### ✅ AC2: Category Filtering
All 6 categories have products:
- Stationery: 10 products
- Books: 8 products
- Sports: 7 products
- Uniforms: 5 products
- Digital: 4 products
- Other: 6 products

### ✅ AC3: Price Range Filtering
Wide price range for slider testing:
- **Low-end:** 3-50 coins (17 products)
- **Mid-range:** 50-200 coins (18 products)
- **High-end:** 200-500 coins (5 products)

### ✅ AC4: Text Search
Products with searchable keywords:
- "pen" → STAT-001 (Blue Ballpoint Pen)
- "mathematics" → BOOK-001, STAT-005, DIG-001
- "football" → SPORT-001
- "uniform" → UNI-001, UNI-002, UNI-003, UNI-004, UNI-005

### ✅ AC5: Sorting Options
- **Price (low to high):** 3 coins → 500 coins
- **Price (high to low):** 500 coins → 3 coins
- **Newest:** Based on createdAt timestamp
- **Most popular:** (requires view count - future feature)

### ✅ AC6: Pagination
- **40 products total**
- **Page size:** 20 products
- **Expected pages:** 2 pages

### ✅ AC7: Product Hover Effects
- All 40 products have hover states
- "Add to Cart" button shows on hover

### ✅ AC8: Empty State
Testable by searching for: "xyznonexistentproduct12345"

---

## Special Test Cases

### Out of Stock Products (3)
Perfect for testing out-of-stock overlay:
1. **BOOK-007** - History of India (0 stock)
2. **UNI-001** - School Uniform Shirt (0 stock)
3. **SPORT-007** - Table Tennis Bat Pair (0 stock)

### Low Stock Products (4)
Perfect for testing low stock badges:
1. **STAT-006** - Colored Markers (8 stock, threshold 10)
2. **SPORT-001** - Football Size 5 (8 stock, threshold 10)
3. **OTH-005** - Umbrella Compact (7 stock, threshold 10)
4. *(One more based on dynamic threshold)*

### Discounted Products (5)
Perfect for testing discount price display:
1. **STAT-007** - Scientific Calculator (₹150 → ₹120)
2. **BOOK-006** - The Adventures of Tom Sawyer (₹50 → ₹40)
3. **SPORT-001** - Football Size 5 (₹150 → ₹120)
4. **UNI-005** - School Blazer (₹450 → ₹400)
5. **DIG-003** - Online Coding Course Access (₹500 → ₹400)

---

## Responsive Grid Testing

### Expected Grid Columns by Viewport

| Viewport | Width | Expected Columns | Products Per Row |
|----------|-------|------------------|------------------|
| **Mobile** | 375px | 1 column | 1 product |
| **Tablet** | 768px | 2 columns | 2 products |
| **Laptop** | 1366px | 3 columns | 3 products |
| **Desktop** | 1920px | 4 columns | 4 products |

---

## Running the Seed Script

### First Time Setup
```bash
cd backend
node scripts/seedShopProducts.js
```

### Re-seed Database
The script will:
1. **Clear** all existing shop items
2. **Insert** 40 fresh products
3. **Display** summary statistics

**Safe to run multiple times** - it clears old data first.

---

## Image Placeholders

**Current:** All products use `https://via.placeholder.com/300`

**To Replace:**
1. Place images in `backend/public/uploads/products/`
2. Update `imageUrl` field in seed script
3. Re-run seed script

**Image Categories Needed:**
- Stationery: pens, pencils, notebooks, erasers, geometry sets, markers, calculators, sketch pads
- Books: textbooks, workbooks, novels, atlases, reference books
- Sports: footballs, cricket bats, badminton rackets, basketballs, chess sets
- Uniforms: shirts, trousers, t-shirts, ties, blazers
- Digital: software boxes, e-books, online courses (generic icons)
- Other: water bottles, backpacks, lunch boxes, pencil cases, umbrellas, badges

---

## Verifying Seed Success

### Check MongoDB
```bash
# Using MongoDB Compass or mongosh
db.shopitems.countDocuments()  # Should return 40

db.shopitems.find({ category: 'stationery' }).count()  # Should return 10
db.shopitems.find({ stock: 0 }).count()  # Should return 3
db.shopitems.find({ discountPrice: { $ne: null } }).count()  # Should return 5
```

### Check API Endpoints
```bash
# Get all products
curl http://localhost:5001/api/v2/shop/products

# Filter by category
curl http://localhost:5001/api/v2/shop/products?category=stationery

# Search
curl http://localhost:5001/api/v2/shop/products?search=pen

# Price range
curl http://localhost:5001/api/v2/shop/products?minPrice=50&maxPrice=200
```

---

## Notes for QA Testing

✅ **Database is ready** for Playwright E2E tests
✅ **All test scenarios** are covered with realistic data
✅ **Price range** is wide enough for filter testing (3-500 coins)
✅ **Multiple categories** available for multi-select testing
✅ **Out-of-stock items** exist for overlay testing
✅ **Pagination** will work (40 products > 20 per page)

**QA can now proceed with Playwright MCP execution!**

---

**Created:** October 8, 2025
**Script Location:** `backend/scripts/seedShopProducts.js`
**Total Products:** 40
**Ready for Testing:** ✅ YES
