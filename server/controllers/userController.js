const { User } = require('../models/User');
const generateToken = require('../utils/generateToken');
const asyncHandler = require('../utils/asyncHandler');
const { validateUser } = require('../middleware/validationMiddleware');

const authUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (user && (await user.matchPassword(password))) {
    user.lastLogin = new Date();
    user.loginCount += 1;
    await user.save();
    res.json({
      _id: user._id, name: user.name, email: user.email,
      isAdmin: user.isAdmin, role: user.role,
      permissions: user.getEffectivePermissions(),
      loyaltyPoints: user.loyaltyPoints,
      token: generateToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
};

const registerUser = async (req, res) => {
  const validation = validateUser(req.body);
  if (!validation.isValid) {
    res.status(400);
    throw new Error(validation.errors.join(', '));
  }

  const { name, email, password } = req.body;
  const userExists = await User.findOne({ email: email.toLowerCase() });
  if (userExists) { res.status(400); throw new Error('User already exists'); }
  const user = await User.create({ name: name.trim(), email: email.toLowerCase().trim(), password });
  if (user) {
    res.status(201).json({
      _id: user._id, name: user.name, email: user.email,
      isAdmin: user.isAdmin, role: user.role,
      permissions: user.getEffectivePermissions(),
      loyaltyPoints: user.loyaltyPoints,
      token: generateToken(user._id),
    });
  } else {
    res.status(400); throw new Error('Invalid user data');
  }
};

const getUserProfile = async (req, res) => {
  const user = await User.findById(req.user._id).populate('wishlist');
  if (user) {
    res.json({
      _id: user._id, name: user.name, email: user.email,
      isAdmin: user.isAdmin, role: user.role,
      permissions: user.getEffectivePermissions(),
      loyaltyPoints: user.loyaltyPoints, address: user.address,
      wishlist: user.wishlist, phone: user.phone, avatar: user.avatar,
      isActive: user.isActive, createdAt: user.createdAt,
    });
  } else {
    res.status(404); throw new Error('User not found');
  }
};

const updateUserProfile = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.phone = req.body.phone || user.phone;
    user.address = req.body.address || user.address;
    if (req.body.password) {
      if (req.body.password.length < 6) {
        res.status(400);
        throw new Error('Password must be at least 6 characters');
      }
      user.password = req.body.password;
    }
    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id, name: updatedUser.name, email: updatedUser.email,
      isAdmin: updatedUser.isAdmin, role: updatedUser.role,
      permissions: updatedUser.getEffectivePermissions(),
      loyaltyPoints: updatedUser.loyaltyPoints, address: updatedUser.address,
      phone: updatedUser.phone, token: generateToken(updatedUser._id),
    });
  } else {
    res.status(404); throw new Error('User not found');
  }
};

const addToWishlist = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    if (user.wishlist.includes(req.params.id)) {
      user.wishlist = user.wishlist.filter((id) => id.toString() !== req.params.id.toString());
    } else {
      user.wishlist.push(req.params.id);
    }
    await user.save();
    const updated = await User.findById(req.user._id).populate('wishlist');
    res.json({ wishlist: updated.wishlist });
  } else {
    res.status(404); throw new Error('User not found');
  }
};

module.exports = {
  authUser: asyncHandler(authUser),
  registerUser: asyncHandler(registerUser),
  getUserProfile: asyncHandler(getUserProfile),
  updateUserProfile: asyncHandler(updateUserProfile),
  addToWishlist: asyncHandler(addToWishlist),
};
