const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Vendor = require('../../models/vendor');
// Ensure User model is loaded (setup.js might have loaded a mock, but we need it for auth middleware reference)
const User = require('../../models/user');
const vendorRoutes = require('../../routes/v2/vendor');

const app = express();
app.use(express.json());
app.use('/api/v2/vendors', vendorRoutes);

describe('Vendor Routes Integration - Story 1.1', () => {
  let adminToken, userToken;

  beforeEach(async () => {
    // Create users using the available model (mock or real)
    const admin = await User.create({
      name: 'Admin',
      email: 'admin@test.com',
      role: 'admin',
      status: 'active'
    });
    
    const user = await User.create({
      name: 'User',
      email: 'user@test.com',
      role: 'student',
      status: 'active'
    });

    // Generate tokens
    adminToken = jwt.sign({ id: admin._id }, process.env.JWT_SECRET);
    userToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    await Vendor.deleteMany({});
  });

  describe('POST /api/v2/vendors', () => {
    it('should allow admin to create vendor', async () => {
      const res = await request(app)
        .post('/api/v2/vendors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Route Vendor',
          phone: '9876543210',
          address: 'Route Addr'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should deny non-admin', async () => {
      const res = await request(app)
        .post('/api/v2/vendors')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Route Vendor',
          phone: '9876543210',
          address: 'Route Addr'
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v2/vendors', () => {
    it('should allow admin to list vendors', async () => {
      const res = await request(app)
        .get('/api/v2/vendors')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should deny non-admin', async () => {
      const res = await request(app)
        .get('/api/v2/vendors')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/v2/vendors/:id', () => {
    it('should allow admin to update vendor', async () => {
      const vendor = await Vendor.create({ name: 'Old', phone: '9876543210', address: 'A' });
      
      const res = await request(app)
        .put(`/api/v2/vendors/${vendor._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'New' });

      expect(res.status).toBe(200);
      expect(res.body.vendor.name).toBe('New');
    });

    it('should deny non-admin update', async () => {
      const vendor = await Vendor.create({ name: 'Old', phone: '9876543210', address: 'A' });
      
      const res = await request(app)
        .put(`/api/v2/vendors/${vendor._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'New' });

      expect(res.status).toBe(403);
    });
  });
});
