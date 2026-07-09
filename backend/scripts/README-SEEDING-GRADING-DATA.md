# Grading Test Data Seeding - Quick Start Guide

**Purpose:** Populate test submissions for Epic 03 Story 02 - Grading Interface QA Testing
**Created:** 2025-10-29
**For:** QA Team (Quinn) and Development Team

---

## Quick Start (3 Steps)

### 1. Navigate to Backend Directory
```bash
cd backend
```

### 2. Run the Seed Script
```bash
node scripts/seedGradingData.js
```

### 3. Login and Test
- Navigate to: http://localhost:3000/coach/grading
- Login: **coach@gmail.com** / **password123**
- Verify submissions are displayed

---

## What the Script Does

The script automatically:

1. ✅ **Finds existing coach** (coach@gmail.com)
2. ✅ **Finds existing students** in coach's Balagruha
3. ✅ **Finds existing courses** (uses any available courses)
4. ✅ **Deletes old test submissions** (if any exist)
5. ✅ **Creates 36 NEW test submissions:**
   - 📝 **18 Pending** (ready for grading)
   - ✅ **15 Graded** (already graded with coins awarded)
   - ⚠️ **3 Flagged** (flagged for admin review)
6. ✅ **Mix of submission types:**
   - 🎨 **18 Art submissions** (image placeholders)
   - 🎥 **10 Video submissions** (video placeholders)
   - 🎙️ **8 Audio submissions** (audio placeholders)

---

## Expected Output

After running the script, you should see:

```
✅ Connected to MongoDB

👤 Finding existing coach...
✅ Found coach: coach (coach@gmail.com)

👥 Finding existing students in coach's Balagruha...
✅ Found 204 existing students

📚 Finding existing courses...
✅ Found 5 existing courses

📤 Creating submissions...
   🎨 Creating art submissions...
   ✅ Art submission 1/18: xyz - Draw a Tree (pending)
   ... (18 art submissions)

   🎥 Creating video submissions...
   ... (10 video submissions)

   🎙️ Creating audio submissions...
   ... (8 audio submissions)

📊 Test Data Summary:
  📤 Submissions: 36 total submissions
     - 📝 Pending: 18
     - ✅ Graded: 15
     - ⚠️ Flagged: 3

🎉 Grading test data seeding completed successfully!

💡 You can now test the grading interface at:
   Dashboard: http://localhost:3000/coach/grading
   Login: coach@gmail.com / password123
```

---

## Verifying Test Data

### Step 1: Login to Grading Dashboard
1. Navigate to http://localhost:3000/coach/grading
2. Login with coach@gmail.com / password123

### Step 2: Check Quick Stats
You should see:
- 📝 Pending: **18 submissions**
- ✅ Graded: **15 submissions**
- ⚠️ Flagged: **3 submissions**
- ⏱️ This Week: **~4+ submissions** (varies based on random dates)

### Step 3: Verify Submission Queue
- Submission list should display 18 pending submissions
- Mix of art (orange border), video (blue border), audio (green border)
- Each submission shows student name, task title, submission date

---

## Troubleshooting

### Problem: "No submissions found"

**Cause:** Script may not have run successfully or coach account mismatch

**Solution:**
1. Re-run the seed script: `node scripts/seedGradingData.js`
2. Check MongoDB is running: `mongo --version`
3. Verify coach@gmail.com exists in database

---

### Problem: "Script fails with connection error"

**Cause:** MongoDB not running or wrong connection string

**Solution:**
1. Start MongoDB service
2. Check `.env` file has correct MONGO_URI
3. Test connection: `node -e "const mongoose = require('mongoose'); mongoose.connect('mongodb://localhost:27017/isfplayground').then(() => console.log('Connected!')).catch(e => console.error(e));"`

---

### Problem: "Coach has 0 submissions but script says 18 created"

**Cause:** Coach's Balagruha doesn't match student Balagruha assignments

**Solution:**
1. The script automatically uses coach's assigned Balagruhas
2. Check coach's Balagruha IDs: Script output shows "Balagruha IDs: ..."
3. Students are automatically filtered by these Balagruha IDs

---

### Problem: "Media files not loading"

**Cause:** Placeholder URLs are external and may not load

**Solution:**
- **This is expected behavior!** The grading interface functionality can still be tested
- Placeholder URLs are used:
  - Art: https://via.placeholder.com/...
  - Video: https://www.w3schools.com/html/...
  - Audio: https://www.soundhelix.com/...
- Some external URLs may be blocked or slow to load
- **Testing focus:** Verify grading interface UI, not media playback

---

## Re-running the Script

The script is **safe to re-run multiple times**:

- ✅ Automatically deletes old test submissions
- ✅ Keeps existing users (coach, students)
- ✅ Keeps existing courses
- ✅ Creates fresh test data every time

To re-run:
```bash
cd backend
node scripts/seedGradingData.js
```

---

## What Gets Created

### Submissions Breakdown

**Art Submissions (18 total):**
- 9 pending
- 6 graded (quality: excellent/good/needs_improvement, coins: 30-85)
- 3 flagged (reason: "Submission unclear - needs review")

**Video Submissions (10 total):**
- 5 pending
- 5 graded (quality: excellent/good, coins: 70-90)

**Audio Submissions (8 total):**
- 4 pending
- 4 graded (quality: good/needs_improvement, coins: 35-65)

---

## For QA Testing

After running the seed script, you can test:

✅ **TC 1.1:** Dashboard Load - Quick stats display correct counts
✅ **TC 1.2-1.8:** Filter by course type, status, sort order
✅ **TC 2.1-2.3:** Search by student name or course title
✅ **TC 3.1-3.12:** Art grading interface (click "Preview & Grade" on art submission)
✅ **TC 4.1-4.10:** Video grading interface
✅ **TC 5.1-5.8:** Audio grading interface
✅ **TC 6.1-6.11:** Grading panel validation (quality rating, coin slider, feedback)
✅ **TC 7.1-7.7:** Navigation controls (Previous, Next, Skip, Flag)

---

## Technical Details

**Script Location:** `backend/scripts/seedGradingData.js`

**Dependencies:**
- mongoose
- bcryptjs
- dotenv

**Database Collections Modified:**
- `submissions` (creates new submissions, deletes old ones)

**Database Collections Read-Only:**
- `users` (finds coach and students)
- `courses` (finds existing courses)
- `balagruhas` (reads Balagruha assignments)

**Safe to Run:** Yes - only modifies `submissions` collection

---

## Contact

**Questions?** Contact Dev Team (James) or QA Team (Quinn)

**Issues?** Check:
1. MongoDB is running
2. Backend .env file has correct MONGO_URI
3. coach@gmail.com account exists with assigned Balagruhas
4. Students exist in coach's Balagruha

---

**Last Updated:** 2025-10-29 (via `date '+%Y-%m-%d %H:%M:%S'`)
**Script Version:** 1.1 (Updated to use existing coach@gmail.com)
**Status:** ✅ Ready for QA Testing
