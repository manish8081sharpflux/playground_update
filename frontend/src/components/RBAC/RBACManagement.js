import React, { useState, useEffect } from "react";
import "./RBACManagement.css";
import { fetchRolesandPermissions, updateRolePermissions } from "../../api";

// Main RBAC Management Component
const RBACManagement = () => {
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [modules, setModules] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [tempPermissions, setTempPermissions] = useState({});
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [formattedPermissions, setFormattedPermissions] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRolesAndPermissions();
  }, []);

  const fetchRolesAndPermissions = async () => {
    setIsLoading(true);

    const response = await fetchRolesandPermissions();

    // Simulate API call delay
    setTimeout(() => {
      const apiResponse = response;

      if (apiResponse.success) {
        // Extract unique modules from the API response
        const uniqueModules = new Set();
        apiResponse.roles.forEach((role) => {
          role.permissions.forEach((permission) => {
            uniqueModules.add(permission.module);
          });
        });

        // Create modules array with standard actions
        const modulesList = Array.from(uniqueModules).map((moduleName) => {
          return {
            id: moduleName.replace(/\s+/g, ""),
            name: moduleName,
            description: `Manage ${moduleName.toLowerCase()}`,
            icon: getModuleIcon(moduleName),
            color: getModuleColor(moduleName),
            actions: [
              {
                id: "create",
                name: "Create",
                description: `Create new ${moduleName.toLowerCase()}`,
                icon: "➕",
              },
              {
                id: "read",
                name: "Read",
                description: `View ${moduleName.toLowerCase()} details`,
                icon: "👁️",
              },
              {
                id: "update",
                name: "Update",
                description: `Update ${moduleName.toLowerCase()} information`,
                icon: "✏️",
              },
              {
                id: "delete",
                name: "Delete",
                description: `Remove ${moduleName.toLowerCase()}`,
                icon: "🗑️",
              },
            ],
          };
        });

        // Transform API roles to our format
        const transformedRoles = apiResponse.roles
          .filter((role) => role.roleName.toLowerCase() !== "admin")
          .map((role, index) => {
            const permissionsObj = {};

            modulesList.forEach((module) => {
              permissionsObj[module.id] = {
                create: false,
                read: false,
                update: false,
                delete: false,
              };
            });

            role.permissions.forEach((permission) => {
              const moduleId = permission.module.replace(/\s+/g, "");

              if (!permissionsObj[moduleId]) {
                permissionsObj[moduleId] = {
                  create: false,
                  read: false,
                  update: false,
                  delete: false,
                };
              }

              permission.actions.forEach((action) => {
                permissionsObj[moduleId][action.toLowerCase()] = true;
              });
            });

            return {
              id: role._id,
              name: capitalizeFirstLetter(role.roleName),
              description: `${capitalizeFirstLetter(role.roleName)} role with specific permissions`,
              color: getRoleColor(index),
              icon: getRoleIcon(role.roleName),
              permissions: permissionsObj,
              createdAt: role.createdAt,
              updatedAt: role.updatedAt,
            };
          });

          return {
            id: role._id,
            name: capitalizeFirstLetter(role.roleName),
            description: `${capitalizeFirstLetter(
              role.roleName,
            )} role with specific permissions`,
            color: getRoleColor(index),
            icon: getRoleIcon(role.roleName),
            permissions: permissionsObj,
            createdAt: role.createdAt,
            updatedAt: role.updatedAt,
          };
        });

        setRoles(transformedRoles);
        setModules(modulesList);
      } else {
        console.error("Failed to fetch roles");
      }

      setIsLoading(false);
    }, 1000); // Simulate network delay
  };

  // Helper function to get module icon
  const getModuleIcon = (moduleName) => {
    const icons = {
      "User Management": "👥",
      "Role Management": "🔑",
      "Task Management": "📋",
      "Machine Management": "🖥️",
    };

    return icons[moduleName] || "📁";
  };

  // Helper function to get module color
  const getModuleColor = (moduleName) => {
    const colors = {
      "User Management": "#3498db",
      "Role Management": "#9b59b6",
      "Task Management": "#f1c40f",
      "Machine Management": "#e74c3c",
    };

    return colors[moduleName] || "#2c3e50";
  };

  // Helper function to get role icon
  const getRoleIcon = (roleName) => {
    const icons = {
      admin: "👑",
      coach: "🏆",
      student: "📚",
    };

    return icons[roleName.toLowerCase()] || "👤";
  };

  // Helper function to get role color
  const getRoleColor = (index) => {
    const colors = [
      "#8e44ad",
      "#2980b9",
      "#16a085",
      "#f39c12",
      "#e74c3c",
      "#27ae60",
    ];
    return colors[index % colors.length];
  };

  // Helper function to capitalize first letter
  const capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  // Format permissions into the requested structure for API
  const formatPermissionsForAPI = (permissions) => {
    const formattedData = {
      permissions: [],
    };

    // Find module names from modules array
    modules.forEach((module) => {
      const moduleId = module.id;
      const moduleName = module.name;
      const modulePermissions = permissions[moduleId];

      if (modulePermissions) {
        const enabledActions = [];

        // Check which actions are enabled
        Object.keys(modulePermissions).forEach((actionId) => {
          if (modulePermissions[actionId]) {
            // Capitalize first letter of action
            const actionName =
              actionId.charAt(0).toUpperCase() + actionId.slice(1);
            enabledActions.push(actionName);
          }
        });

        // Add module even if no actions are enabled (to match API format)
        formattedData.permissions.push({
          module: moduleName,
          actions: enabledActions,
        });
      }
    });

    return formattedData;
  };

  // Filter roles based on search term
  const filteredRoles = roles.filter(
    (role) =>
      role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.description.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Count total permissions for a role
  const countPermissions = (permissions) => {
    let count = 0;
    let total = 0;

    Object.keys(permissions).forEach((moduleId) => {
      Object.keys(permissions[moduleId]).forEach((actionId) => {
        total++;
        if (permissions[moduleId][actionId]) {
          count++;
        }
      });
    });

    return { granted: count, total };
  };

  // Handle role selection
  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setTempPermissions(JSON.parse(JSON.stringify(role.permissions)));
    setIsEditing(false);

    // Format and set permissions in the requested structure
    const formatted = formatPermissionsForAPI(role.permissions);
    setFormattedPermissions(formatted);
  };

  // Handle permission toggle
  const handlePermissionToggle = (moduleId, actionId) => {
    if (!isEditing) return;

    setTempPermissions((prev) => {
      const updated = { ...prev };
      updated[moduleId] = { ...updated[moduleId] };
      updated[moduleId][actionId] = !updated[moduleId][actionId];

      // Handle special cases (e.g., if delete is enabled, read must be enabled)
      if (actionId === "delete" && updated[moduleId][actionId]) {
        updated[moduleId]["read"] = true;
      }

      // If create or update is enabled, read must be enabled
      if (
        (actionId === "create" || actionId === "update") &&
        updated[moduleId][actionId]
      ) {
        updated[moduleId]["read"] = true;
      }

      // Format and set permissions
      const formatted = formatPermissionsForAPI(updated);
      setFormattedPermissions(formatted);

      return updated;
    });
  };

  // Handle module toggle (all permissions for a module)
  const handleModuleToggle = (moduleId) => {
    if (!isEditing) return;

    // Check if all permissions are currently enabled
    const modulePermissions = tempPermissions[moduleId];
    const allEnabled = Object.values(modulePermissions).every(
      (value) => value === true,
    );

    // Toggle all permissions
    setTempPermissions((prev) => {
      const updated = { ...prev };
      updated[moduleId] = { ...updated[moduleId] };

      Object.keys(updated[moduleId]).forEach((actionId) => {
        updated[moduleId][actionId] = !allEnabled;
      });

      // Format and set permissions
      const formatted = formatPermissionsForAPI(updated);
      setFormattedPermissions(formatted);

      return updated;
    });
  };

  // Handle all permissions toggle for an action across all modules
  const handleActionToggleAll = (actionId) => {
    if (!isEditing) return;

    // Check if all modules have this action enabled
    const allEnabled = modules.every(
      (module) =>
        tempPermissions[module.id] && tempPermissions[module.id][actionId],
    );

    // Toggle the action for all modules
    setTempPermissions((prev) => {
      const updated = { ...prev };

      modules.forEach((module) => {
        const moduleId = module.id;
        updated[moduleId] = { ...updated[moduleId] };
        updated[moduleId][actionId] = !allEnabled;

        // If enabling read, make sure it's enabled
        if (actionId === "read" && !allEnabled) {
          updated[moduleId]["read"] = true;
        }

        // If enabling delete, read must be enabled
        if (actionId === "delete" && !allEnabled) {
          updated[moduleId]["read"] = true;
        }

        // If enabling create or update, read must be enabled
        if ((actionId === "create" || actionId === "update") && !allEnabled) {
          updated[moduleId]["read"] = true;
        }
      });

      // Format and set permissions
      const formatted = formatPermissionsForAPI(updated);
      setFormattedPermissions(formatted);

      return updated;
    });
  };

  // Save permission changes
  const savePermissions = async (id) => {
    const permissionsForAPI = formatPermissionsForAPI(tempPermissions);

    try {
      // ✅ Pass object directly, NOT JSON.stringify
      console.log(
        "Sending to API:",
        JSON.stringify(permissionsForAPI, null, 2),
      );
      const response = await updateRolePermissions(id, permissionsForAPI);
      console.log("API Response:", response);

      // ✅ Refetch from DB to confirm changes saved
      await fetchRolesAndPermissions();
    } catch (error) {
      console.error("Error updating role permissions:", error);
    }

    // Update local state (UI stays same as before)
    setRoles((prev) =>
      prev.map((role) =>
        role.id === selectedRole.id
          ? { ...role, permissions: tempPermissions }
          : role,
      ),
    );

    setSelectedRole((prev) => ({ ...prev, permissions: tempPermissions }));
    setIsEditing(false);
    setShowSaveConfirmation(true);
    setFormattedPermissions(permissionsForAPI);

    setTimeout(() => {
      setShowSaveConfirmation(false);
    }, 3000);
  };
  // Cancel editing
  const cancelEditing = () => {
    setTempPermissions(JSON.parse(JSON.stringify(selectedRole.permissions)));
    setIsEditing(false);

    // Reset formatted permissions to original
    const formatted = formatPermissionsForAPI(selectedRole.permissions);
    setFormattedPermissions(formatted);
  };

  // Get common actions across all modules
  const getCommonActions = () => {
    if (modules.length === 0) return [];

    // Get the first module's actions
    const firstModuleActions = modules[0].actions;

    // Check if all other modules have the same actions
    const commonActions = firstModuleActions.filter((action) =>
      modules.every((module) => module.actions.some((a) => a.id === action.id)),
    );

    return commonActions;
  };

  const commonActions = getCommonActions();

  const handleCheckboxChange = (e, moduleId, actionId) => {
    if (!isEditing) return;
    e.stopPropagation();

    handlePermissionToggle(moduleId, actionId);
  };
  const handleAllCheckboxChange = (e, moduleId) => {
    if (!isEditing) return;
    e.stopPropagation();

    handleModuleToggle(moduleId);
  };

  const handleActionHeaderCheckboxChange = (e, actionId) => {
    if (!isEditing) return;

    e.stopPropagation();

    handleActionToggleAll(actionId);
  };

  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="rbac-management">
      {/* <header className="header">
                <h1>🔐 Magic Permission Palace 🔐</h1>
                <div className="character">
                    <img src="https://via.placeholder.com/100" alt="Security character" className="character-img" />
                </div>
            </header> */}

      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading roles and permissions...</p>
        </div>
      ) : (
        <div className="rbac-container">
          <div className="roles-panel">
            <div className="panel-header">
              <h2>Roles</h2>
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search roles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
                <span className="search-icon">🔍</span>
              </div>
            </div>

            <div className="roles-list">
              {filteredRoles.map((role) => {
                const permissionCount = countPermissions(role.permissions);
                const percentage = Math.round(
                  (permissionCount.granted / permissionCount.total) * 100,
                );

                return (
                  <div
                    key={role.id}
                    className={`role-card ${selectedRole?.id === role.id ? "selected" : ""
                      }`}
                    onClick={() => handleRoleSelect(role)}
                    style={{ borderLeftColor: role.color }}
                  >
                    <div
                      className="role-icon"
                      style={{ backgroundColor: role.color }}
                    >
                      <span>{role.icon}</span>
                    </div>
                    <div className="role-info">
                      <h3>{role.name}</h3>
                      <p>{role.description}</p>
                      <div className="permission-meter">
                        <div className="meter-label">
                          Permissions: {permissionCount.granted}/
                          {permissionCount.total}
                        </div>
                        <div className="meter-bar">
                          <div
                            className="meter-fill"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor:
                                percentage > 75
                                  ? "#27ae60"
                                  : percentage > 40
                                    ? "#f39c12"
                                    : "#e74c3c",
                            }}
                          ></div>
                        </div>
                      </div>
                      {/* <div className="role-dates">
                                                <span className="date-label">Created: {formatDate(role.createdAt)}</span>
                                                <span className="date-label">Updated: {formatDate(role.updatedAt)}</span>
                                            </div> */}
                    </div>
                  </div>
                );
              })}

              {filteredRoles.length === 0 && (
                <div className="no-roles">
                  <div className="no-data-icon">🔍</div>
                  <div className="no-data-message">
                    No roles match your search
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="permissions-panel">
            {selectedRole ? (
              <>
                <div className="panel-header">
                  <div className="role-title">
                    <div
                      className="role-icon large"
                      style={{ backgroundColor: selectedRole.color }}
                    >
                      <span>{selectedRole.icon}</span>
                    </div>
                    <div>
                      <h2>{selectedRole.name} Permissions</h2>
                      <p>{selectedRole.description}</p>
                      <div className="role-meta">
                        {/* <span>ID: {selectedRole.id}</span> */}
                        {/* <span>Created: {formatDate(selectedRole.createdAt)}</span>
                                                <span>Last Updated: {formatDate(selectedRole.updatedAt)}</span> */}
                      </div>
                    </div>
                  </div>

                  <div className="action-buttons">
                    {isEditing ? (
                      <>
                        <button
                          className="cancel-button"
                          onClick={cancelEditing}
                        >
                          Cancel
                        </button>
                        <button
                          className="save-button"
                          onClick={() => savePermissions(selectedRole.id)}
                        >
                          Save Changes
                        </button>
                      </>
                    ) : (
                      <button
                        className="edit-button"
                        onClick={() => setIsEditing(true)}
                      >
                        Edit Permissions
                      </button>
                    )}
                  </div>
                </div>

                {showSaveConfirmation && (
                  <div className="save-confirmation">
                    <span className="confirmation-icon">✅</span>
                    Permissions updated successfully!
                  </div>
                )}
                {/* 
                                {formattedPermissions && isEditing && (
                                    <div className="formatted-permissions">
                                        <h3>Permissions JSON for API:</h3>
                                        <pre>{JSON.stringify(formattedPermissions, null, 2)}</pre>
                                    </div>
                                )} */}

                <div className="permissions-table-container">
                  <table className="permissions-table">
                    <thead>
                      <tr>
                        <th className="module-column">Module</th>
                        {commonActions.map((action) => (
                          <th
                            key={action.id}
                            className="action-column"
                            onClick={() =>
                              isEditing && handleActionToggleAll(action.id)
                            }
                            title={
                              isEditing
                                ? `Toggle ${action.name} for all modules`
                                : undefined
                            }
                          >
                            <div className="action-header">
                              <span className="action-icon">{action.icon}</span>
                              <span className="action-name">{action.name}</span>
                              {/* {isEditing && (
                                                                <label className="checkbox-container header-checkbox">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={modules.every(module =>
                                                                            tempPermissions[module.id] &&
                                                                            tempPermissions[module.id][action.id]
                                                                        )}
                                                                        onChange={(e) => handleActionHeaderCheckboxChange(e, action.id)}
                                                                    />
                                                                    <span className="checkmark"></span>
                                                                </label>
                                                            )} */}
                            </div>
                          </th>
                        ))}
                        <th className="all-column">All</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modules.map((module) => {
                        const modulePermissions = isEditing
                          ? tempPermissions[module.id]
                          : selectedRole.permissions[module.id];
                        const allEnabled =
                          modulePermissions &&
                          Object.values(modulePermissions).every(
                            (value) => value === true,
                          );

                        return (
                          <tr key={module.id} className="module-row">
                            <td
                              className="module-cell"
                              style={{ borderLeftColor: module.color }}
                            >
                              <div className="module-info-compact">
                                <span
                                  className="module-icon-small"
                                  style={{ backgroundColor: module.color }}
                                >
                                  {module.icon}
                                </span>
                                <span className="module-name">
                                  {module.name}
                                </span>
                              </div>
                            </td>

                            {commonActions.map((action) => {
                              const isEnabled =
                                modulePermissions &&
                                modulePermissions[action.id];

                              return (
                                <td
                                  key={`${module.id}-${action.id}`}
                                  className={`permission-cell ${isEditing ? "editable" : ""
                                    }`}
                                  onClick={() =>
                                    isEditing &&
                                    handlePermissionToggle(module.id, action.id)
                                  }
                                >
                                  <label className="checkbox-container">
                                    <input
                                      type="checkbox"
                                      checked={isEnabled || false}
                                      onChange={(e) =>
                                        handleCheckboxChange(
                                          e,
                                          module.id,
                                          action.id,
                                        )
                                      }
                                      disabled={!isEditing}
                                    />
                                    <span className="checkmark"></span>
                                  </label>
                                </td>
                              );
                            })}

                            <td
                              className={`all-cell ${isEditing ? "editable" : ""
                                }`}
                              onClick={() =>
                                isEditing && handleModuleToggle(module.id)
                              }
                            >
                              <label className="checkbox-container">
                                <input
                                  type="checkbox"
                                  checked={allEnabled || false}
                                  onChange={(e) =>
                                    handleAllCheckboxChange(e, module.id)
                                  }
                                  disabled={!isEditing}
                                />
                                <span className="checkmark"></span>
                              </label>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="no-role-selected">
                <div className="no-data-icon">👈</div>
                <div className="no-data-message">
                  Select a role to view and edit permissions
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RBACManagement;
