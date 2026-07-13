const Role = require("../models/role");
const { errorLogger } = require('../config/pino-config');

exports.createRole = async (req, res) => {
  try {
    const { roleName, permissions } = req.body;

    if (!roleName || !permissions || !Array.isArray(permissions)) {
      return res.status(400).json({
        error:
          "Role name and permissions are required, and permissions must be an array",
      });
    }

    // Check if the role already exists
    const existingRole = await Role.findOne({ roleName: roleName.trim() });
    if (existingRole) {
      return res.status(400).json({ error: "Role already exists" });
    }

    // Create the new role
    const role = new Role({ roleName: roleName.trim(), permissions });
    await role.save();

    res.status(201).json({ message: "Role created successfully", role });
  } catch (error) {
    errorLogger.error({ err: error }, "Error creating role:");
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.updateRolePermissions = async (req, res) => {
  try {
    const { roleId } = req.params;
    const { permissions } = req.body;

    if (!permissions || !Array.isArray(permissions)) {
      return res.status(400).json({
        error: "Permissions must be an array of modules with actions",
      });
    }

    // Find the role by ID
    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({ error: "Role not found" });
    }

    const isPurchaseManager = role.roleName?.trim().toLowerCase() === "purchase-manager";

    // Iterate through the permissions array and update each module
    permissions.forEach((permission) => {
      const { module, actions } = permission;

      if (!module || !Array.isArray(actions)) {
        throw new Error(
          "Each permission must have a module name and an array of actions"
        );
      }

      // Check if the module already exists in the permissions array
      const moduleIndex = role.permissions.findIndex(
        (perm) => perm.module === module
      );

      const scope =
        isPurchaseManager && ["Purchase Management", "Shop Management"].includes(module)
          ? "balagruh"
          : permission.scope;

      if (moduleIndex !== -1) {
        // If the module exists, update its actions and scope
        role.permissions[moduleIndex].actions = actions;
        if (scope !== undefined) {
          role.permissions[moduleIndex].scope = scope;
        }
      } else {
        // If the module does not exist, add it to the permissions array
        role.permissions.push({ module, actions, scope });
      }
    });
    // Save the updated role
    await role.save();

    res.status(200).json({ message: "Permissions updated successfully", role });
  } catch (error) {
    errorLogger.error({ err: error }, "Error updating role permissions:");
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

exports.getAllRoles = async (req, res) => {
  try {
    const roles = await Role.find();

    if (!roles || roles.length === 0) {
      return res.status(404).json({ error: "No roles found" });
    }

    res.status(200).json({ success: true, roles });
  } catch (error) {
    errorLogger.error({ err: error }, "Error fetching roles:");
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getRoleById = async (req, res) => {
  try {
    const { roleId } = req.params;

    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({ error: "Role not found" });
    }

    res.status(200).json({ success: true, role });
  } catch (error) {
    errorLogger.error({ err: error }, "Error fetching role by ID:");
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.deleteRole = async (req, res) => {
  try {
    const { roleId } = req.params;

    const role = await Role.findByIdAndDelete(roleId);
    if (!role) {
      return res.status(404).json({ error: "Role not found" });
    }

    res.status(200).json({ message: "Role deleted successfully" });
  } catch (error) {
    errorLogger.error({ err: error }, "Error deleting role:");
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getAllRolePermissions = async (req, res) => {
  try {
    const roles = await Role.find();

    if (!roles || roles.length === 0) {
      return res.status(404).json({ error: "No roles found" });
    }

    res.status(200).json({ success: true, roles });
  } catch (error) {
    errorLogger.error({ err: error }, "Error fetching roles:");
    res.status(500).json({ error: "Internal server error" });
  }
};


exports.fixAdminUserDeletePermission = async (req, res) => {
  try {
    const role = await Role.findOne({
      roleName: { $regex: /^admin$/i },
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Admin role not found",
      });
    }

    const permission = role.permissions.find(
      (p) => p.module?.trim().toLowerCase() === "user management"
    );

    if (!permission) {
      role.permissions.push({
        module: "User Management",
        actions: ["Create", "Read", "Update", "Delete"],
        scope: "all",
      });
    } else {
      const hasDelete = permission.actions.some(
        (a) => a.trim().toLowerCase() === "delete"
      );

      if (!hasDelete) {
        permission.actions.push("Delete");
      }
    }

    await role.save();

    res.status(200).json({
      success: true,
      message: "Admin Delete permission added successfully",
      role,
    });
  } catch (error) {
    errorLogger.error({ err: error }, "Error fixing admin delete permission:");
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

