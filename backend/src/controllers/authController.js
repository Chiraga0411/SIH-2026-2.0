const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const DEMO_OTP = "123456";
const DEMO_PASSWORD = "demo123";

const OFFICIALS = {
  "REV-001": {
    name: "Vikram Singh",
    role: "officer",
    department: "Revenue & Land Records"
  },

  "REG-001": {
    name: "Sunita Devi",
    role: "registrar",
    department: "Registration Department"
  },

  "PLN-001": {
    name: "Meera Singh",
    role: "planner",
    department: "Urban Planning"
  },

  "ADM-001": {
    name: "Ops Admin",
    role: "admin",
    department: "IT & System Administration"
  }
};

function generateToken(user) {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      name: user.name
    },
    process.env.JWT_SECRET || "landstack-development-secret",
    {
      expiresIn: "1d"
    }
  );
}


// ===============================
// SEND OTP
// ===============================

exports.sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!/^[6-9]\d{9}$/.test(phone || "")) {
      return res.status(400).json({
        message: "Enter a valid 10-digit Indian mobile number"
      });
    }

    // Demo OTP
    res.json({
      message: "OTP sent successfully",
      demoOtp: DEMO_OTP
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to send OTP"
    });
  }
};


// ===============================
// VERIFY OTP
// ===============================

exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otp, name } = req.body;

    if (!/^[6-9]\d{9}$/.test(phone || "")) {
      return res.status(400).json({
        message: "Invalid phone number"
      });
    }

    if (otp !== DEMO_OTP) {
      return res.status(401).json({
        message: "Incorrect OTP"
      });
    }

    let user = await User.findOne({ phone });

    // New citizen
    if (!user) {
      user = await User.create({
        phone,
        name: name?.trim() || "Citizen",
        role: "citizen"
      });
    }

    const token = generateToken(user);

    res.json({
      message: "Login successful",

      token,

      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role
      }
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Login failed"
    });
  }
};


// ===============================
// OFFICIAL LOGIN
// ===============================

exports.officialLogin = async (req, res) => {
  try {
    const { employeeId, password } = req.body;

    const id = employeeId?.trim().toUpperCase();

    const official = OFFICIALS[id];

    if (!official || password !== DEMO_PASSWORD) {
      return res.status(401).json({
        message: "Employee ID or password is incorrect"
      });
    }

    let user = await User.findOne({
      employeeId: id
    });

    // Create demo official if first login
    if (!user) {

      const passwordHash = await bcrypt.hash(
        password,
        10
      );

      user = await User.create({
        employeeId: id,
        passwordHash,
        name: official.name,
        role: official.role,
        department: official.department
      });
    }

    const token = generateToken(user);

    res.json({
      message: "Official login successful",

      token,

      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        department: user.department,
        employeeId: user.employeeId
      }
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Official login failed"
    });
  }
};
