const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

const User = require('../../models/user');
const Balagruha = require('../../models/balagruha');
const userRoutes = require('../../routes/userRoutes');

const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);

describe('User Balagruhas Routes Integration - Story 2.1/3.2 Support', () => {
  let adminToken;
  let coachToken;

  beforeEach(async () => {
    const adminUser = await User.create({
      name: 'Admin',
      email: 'admin.balagruhas@test.com',
      role: 'admin'
    });

    const coachUser = await User.create({
      name: 'Coach',
      email: 'coach.balagruhas@test.com',
      role: 'coach'
    });

    adminToken = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET);
    coachToken = jwt.sign({ id: coachUser._id }, process.env.JWT_SECRET);
  });

  describe('GET /api/users/me/balagruhas', () => {
    it('returns STOCK + all balagruhas for admin', async () => {
      const bg1 = await Balagruha.create({ name: `Balagruha A ${Date.now()}`, location: 'Loc A' });
      const bg2 = await Balagruha.create({ name: `Balagruha B ${Date.now()}`, location: 'Loc B' });

      const res = await request(app)
        .get('/api/users/me/balagruhas')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const ids = res.body.data.map((entry) => String(entry._id));
      expect(ids).toContain('STOCK');
      expect(ids).toContain(String(bg1._id));
      expect(ids).toContain(String(bg2._id));
    });

    it('returns STOCK only for non-admin users with no assignments', async () => {
      await Balagruha.create({ name: `Balagruha X ${Date.now()}`, location: 'Loc X' });

      const res = await request(app)
        .get('/api/users/me/balagruhas')
        .set('Authorization', `Bearer ${coachToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([{ _id: 'STOCK', name: 'STOCK', isStock: true }]);
    });
  });
});
