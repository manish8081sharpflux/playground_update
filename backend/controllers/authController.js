const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { UserTypes } = require("../constants/users");
const { fetchMachinesByIds } = require("../data-access/machines");
const { default: mongoose } = require("mongoose");

/**
 * Register a new user
 * POST /register
 */
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      role: role || "admin",
    });

    await user.save();

    // Create token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
        },
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error in registration",
      error: err.message,
    });
  }
};

/**
 * Login user with email and password
 * POST /login
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check if account is locked
    if (user.isLocked()) {
      return res.status(423).json({
        success: false,
        message: "Account is locked. Please try again later",
      });
    }

    // Check if user is active
    if (user.status === "inactive") {
      return res.status(401).json({
        success: false,
        message: "Account is inactive. Please contact administrator",
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      if (user.role !== UserTypes.STUDENT) {
        await user.incrementLoginAttempts();

        return res.status(400).json({
          success: false,
          message: "Invalid credentials",
        });
      }
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Check for the user role is a student
    if (user.role === UserTypes.STUDENT) {
      // check the mac id from the header,
      let macAddress = req.headers["mac-address"];
      // match the mac id from the assigned devices
      // get the machines details from the users assigned machines
      if (user.assignedMachines && user.assignedMachines.length > 0) {
        let machineIds = user.assignedMachines.map((item) => item);
        let machines = await fetchMachinesByIds(machineIds);
        if (machines && machines.success) {
          let machineMacAddressList = machines.data.map(
            (item) => item.macAddress
          );
          if (machineMacAddressList.includes(macAddress)) {
            // do nothing, continue the flow,
          } else {
            // return res.status(400).json({
            //     success: false,
            //     data: {},
            //     message: "This machine is not assigned for this student. Contact Admin"
            // })
          }
        } else {
          // return res.status(400).json({
          //     success: false,
          //     data: {},
          //     message: "No machines are assigned for this student. Contact Admin"
          // })
        }
      } else {
        // return res.status(400).json({
        //     success: false,
        //     data: {},
        //     message: "This machine is not assigned for this student. Contact Admin"
        // })
      }
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Create token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          balagruhaIds: user.balagruhaIds || [],
        },
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error in login",
      error: err.message,
    });
  }
};

/**
 * Student userId-only login
 * POST /student/login
 */
exports.studentLogin = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "userId is required" });
    }
    // Find user by _id, userId field, or email
    const isValid = mongoose.Types.ObjectId.isValid(userId) && String(userId).length === 24;
    let user = null;

    if (isValid) {
      // Try to find by MongoDB ObjectId first
      try {
        user = await User.findById(userId);
      } catch (e) {
        // CastError — not a valid ObjectId, continue to other lookups
      }
    }

    if (!user) {
      // Try to find by custom userId field (for simple numeric IDs like "123")
      // Try both string and number formats since the input could be either
      const numericUserId = parseInt(userId);
      if (!isNaN(numericUserId)) {
        user = await User.findOne({ userId: numericUserId });
      }
      if (!user) {
        try {
          user = await User.findOne({ userId: userId });
        } catch (e) {
          // CastError — userId field is numeric, input is non-numeric string; skip
        }
      }
    }

    if (!user) {
      // Finally try to find by email
      user = await User.findOne({ email: userId });
    }
    if (!user || user.role !== UserTypes.STUDENT) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }

    // Check if user is active
    if (user.status === "inactive") {
      return res.status(403).json({
        success: false,
        message: "Account is inactive. Please contact administrator",
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Create token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    return res.json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          balagruhaIds: user.balagruhaIds || [],
        },
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Error in login", error: err.message });
  }
};

/**
 * Get user profile
 * GET /profile
 */
exports.getProfile = async (req, res) => {
  try {
    res.json({
      success: true,
      data: req.user,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error fetching profile",
      error: err.message,
    });
  }
};

/**
 * Update user profile
 * PUT /profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const updates = {
      name: req.body.name,
      email: req.body.email,
    };

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: user,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error updating profile",
      error: err.message,
    });
  }
};

/**
 * Change password
 * PUT /change-password
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error changing password",
      error: err.message,
    });
  }
};
