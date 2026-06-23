# Controller Scope Filter Implementation Guide

**Created:** 2025-10-18 22:25:06
**Sprint:** 1.1 - RBAC Refactor
**Purpose:** Guide for updating controllers to use req.scopeFilter for Balagruh-level data isolation

---

## Overview

The `checkPermission` middleware now automatically injects `req.scopeFilter` based on the user's permission scope:
- **scope='all'** (Admin): `req.scopeFilter = {}` (no filtering)
- **scope='balagruh'** (Coach/In-Charge): `req.scopeFilter = { balagruhaId: { $in: user.balagruhaIds } }`
- **scope='own'** (Student): `req.scopeFilter = { userId: user._id }`

---

## Pattern: How to Use req.scopeFilter

### Before (Unfiltered - Security Risk)
```javascript
exports.getAllStudents = async (req, res) => {
  try {
    // ❌ Returns ALL students from ALL Balagruhs
    const students = await Student.find({});
    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
```

### After (Filtered - Secure)
```javascript
exports.getAllStudents = async (req, res) => {
  try {
    // ✅ Returns only students in user's assigned Balagruh(s)
    // req.scopeFilter is injected by checkPermission middleware
    const students = await Student.find(req.scopeFilter || {});
    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
```

### With Additional Filters
```javascript
exports.getActiveStudents = async (req, res) => {
  try {
    // ✅ Combine scope filter with other conditions
    const filter = {
      ...(req.scopeFilter || {}),
      status: 'active'
    };
    const students = await Student.find(filter);
    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
```

### With Query Parameters
```javascript
exports.searchStudents = async (req, res) => {
  try {
    const { name, age } = req.query;

    // ✅ Build filter combining scope + search params
    const filter = {
      ...(req.scopeFilter || {}),
      ...(name && { name: { $regex: name, $options: 'i' } }),
      ...(age && { age: parseInt(age) })
    };

    const students = await Student.find(filter);
    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
```

---

## Which Controllers Need Updates?

Update controllers that query models with `balagruhaId` field:

### Models with balagruhaId (Require Scoping)
- ✅ `Attendance` - attendance records
- ✅ `Student` - student data (if using separate Student model)
- ✅ `PurchaseOrders` - purchase orders by Balagruh
- ✅ `RepairRequests` - repair requests by Balagruh
- ✅ `Schedules` - schedules by Balagruh
- ✅ `TrainingSession` - training sessions by Balagruh
- ✅ `MedicalRecord` - medical records (if scoped by Balagruh)

### Models WITHOUT balagruhaId (No Scoping Needed)
- ⏭️ `User` - uses balagruhaIds (array), not balagruhaId
- ⏭️ `Role` - global configuration
- ⏭️ `Machine` - assigned to Balagruh but different field name
- ⏭️ `Course` - scope='own' uses userId, not balagruhaId

---

## Implementation Checklist

For each controller method that queries Balagruh-scoped data:

- [ ] Check if route uses `checkPermission` middleware
- [ ] If yes, `req.scopeFilter` is automatically available
- [ ] Update query to merge `req.scopeFilter`:
  - Simple: `Model.find(req.scopeFilter || {})`
  - With filters: `Model.find({ ...(req.scopeFilter || {}), ...otherFilters })`
- [ ] Test with different user roles (Admin, Coach, Student)
- [ ] Verify scope filtering works correctly

---

## Testing Scope Filters

### Test Case 1: Admin Sees All Data
```javascript
// Login as Admin
// Expected: req.scopeFilter = {}
// Result: All records returned
```

### Test Case 2: Coach Sees Only Assigned Balagruh
```javascript
// Login as Coach assigned to Balagruh 1
// Expected: req.scopeFilter = { balagruhaId: { $in: [ObjectId('...Balagruh1')] } }
// Result: Only Balagruh 1 records returned
```

### Test Case 3: Student Sees Only Own Data
```javascript
// Login as Student
// Expected: req.scopeFilter = { userId: ObjectId('...studentId') }
// Result: Only student's own records returned
```

---

## Common Pitfalls

### ❌ Forgetting to Use req.scopeFilter
```javascript
// WRONG: Ignores scope, returns all data
const students = await Student.find({ status: 'active' });
```

### ✅ Correct: Always Merge req.scopeFilter
```javascript
// CORRECT: Applies scope filtering
const students = await Student.find({
  ...(req.scopeFilter || {}),
  status: 'active'
});
```

### ❌ Overwriting req.scopeFilter
```javascript
// WRONG: Overwrites scope filter
const filter = { status: 'active' }; // Lost req.scopeFilter!
const students = await Student.find(filter);
```

### ✅ Correct: Merge, Don't Overwrite
```javascript
// CORRECT: Preserves scope filter
const filter = {
  ...(req.scopeFilter || {}),
  status: 'active'
};
const students = await Student.find(filter);
```

---

## Examples by Controller Type

### User/Student Controller
```javascript
// User model uses balagruhaIds (array), not balagruhaId
// For querying users by Balagruh, use different approach:
const users = await User.find({
  role: 'student',
  balagruhaIds: { $in: req.user.balagruhaIds }
});
```

### Attendance Controller
```javascript
exports.getAttendance = async (req, res) => {
  try {
    const { date } = req.query;
    const filter = {
      ...(req.scopeFilter || {}), // Filters by balagruhaId
      ...(date && { dateString: date })
    };
    const records = await Attendance.find(filter);
    res.status(200).json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
```

### Schedule Controller
```javascript
exports.getSchedules = async (req, res) => {
  try {
    const { date } = req.query;
    const filter = {
      ...(req.scopeFilter || {}), // Filters by balagruhaId
      ...(date && { date: new Date(date) })
    };
    const schedules = await Schedule.find(filter)
      .populate('assignedTo')
      .sort({ startTime: 1 });
    res.status(200).json(schedules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
```

---

## Verification Steps

After updating controllers:

1. **Code Review**: Check all find() queries use req.scopeFilter
2. **Unit Tests**: Test scope filtering logic
3. **Integration Tests**: Test with different user roles
4. **Manual Testing**: Login as Coach, verify can't access other Balagruhs
5. **Security Audit**: Ensure no data leakage between Balagruhs

---

**Last Updated:** 2025-10-18 22:25:06
**Next Action:** Update controllers incrementally, test thoroughly
**Estimated Time per Controller:** 15-30 minutes
