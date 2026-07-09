const express = require("express");
const router = express.Router();
const roleController = require("../controllers/roleController");
const checkPermission = require("../middleware/checkPermission");
const { authorize, authenticate } = require("../middleware/auth");
const {
  createRole,
  updateRolePermissions,
  getAllRoles,
  getRoleById,
  deleteRole,
  getAllRolePermissions,
  fixAdminUserDeletePermission,
} = require("../controllers/roleController");

/**
 * @swagger
 * tags:
 *   name: Roles
 *   description: API for managing roles and permissions
 */

/**
 * @swagger
 * /api/roles:
 *   post:
 *     summary: Create a new role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: [] # Requires authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               roleName:
 *                 type: string
 *                 description: Name of the role
 *                 example: Coach
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     module:
 *                       type: string
 *                       description: Module name
 *                       example: User Management
 *                     actions:
 *                       type: array
 *                       items:
 *                         type: string
 *                         enum: [Create, Read, Update, Delete]
 *                       description: List of actions allowed for the module
 *                       example: [Read, Update]
 *     responses:
 *       201:
 *         description: Role created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Role created successfully
 *                 role:
 *                   $ref: '#/components/schemas/Role'
 *       400:
 *         description: Bad request (e.g., role already exists or invalid input)
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/roles/{roleId}:
 *   put:
 *     summary: Update permissions for a role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: [] # Requires authentication
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the role to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     module:
 *                       type: string
 *                       description: Module name
 *                       example: User Management
 *                     actions:
 *                       type: array
 *                       items:
 *                         type: string
 *                         enum: [Create, Read, Update, Delete]
 *                       description: List of actions allowed for the module
 *                       example: [Read, Update]
 *     responses:
 *       200:
 *         description: Permissions updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Permissions updated successfully
 *                 role:
 *                   $ref: '#/components/schemas/Role'
 *       404:
 *         description: Role not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/roles:
 *   get:
 *     summary: Get all roles
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: [] # Requires authentication
 *     responses:
 *       200:
 *         description: List of all roles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 roles:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Role'
 *       404:
 *         description: No roles found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/roles/{roleId}:
 *   get:
 *     summary: Get a role by ID
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: [] # Requires authentication
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the role to retrieve
 *     responses:
 *       200:
 *         description: Role details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 role:
 *                   $ref: '#/components/schemas/Role'
 *       404:
 *         description: Role not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/roles/{roleId}:
 *   delete:
 *     summary: Delete a role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: [] # Requires authentication
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the role to delete
 *     responses:
 *       200:
 *         description: Role deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Role deleted successfully
 *       404:
 *         description: Role not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Role:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The unique ID of the role
 *           example: 64f1c2e5b5d6c2a1b8e4f123
 *         roleName:
 *           type: string
 *           description: The name of the role
 *           example: Admin
 *         permissions:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               module:
 *                 type: string
 *                 description: The module name
 *                 example: User Management
 *               actions:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [Create, Read, Update, Delete]
 *                 description: List of actions allowed for the module
 *                 example: [Create, Read, Update, Delete]
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the role was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the role was last updated
 */

router.post(
  "/",
  authenticate,
  authorize("Role Management", "Create"),
  roleController.createRole
);

router.put(
  "/fix-admin-user-delete",
  authenticate,
  fixAdminUserDeletePermission
);

router.put(
  "/:roleId",
  authenticate,
  authorize("Role Management", "Update"),
  roleController.updateRolePermissions
);

router.get(
  "/",
  authenticate,
  authorize("Role Management", "Read"),
  roleController.getAllRoles
);

router.get("/getAllRolePermissions", authenticate, roleController.getAllRolePermissions);

router.delete(
  "/:roleId",
  authenticate,
  authorize("Role Management", "Delete"),
  roleController.deleteRole
);


module.exports = router;

