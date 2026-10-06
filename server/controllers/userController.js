const { User } = require('../models/User');
const generateToken = require('../utils/generateToken');
const { setAuthCookies, clearAuthCookies, readRefreshCookie } = require('../utils/authCookie');
const {
  createSession,
  resolveSession,
  rotateSession,
  revokeSession,
  revokeAllSessions,
} = require('../utils/refreshToken');
const asyncHandler = require('../utils/asyncHandler');
const { validateUser } = require('../middleware/validationMiddleware');

const authUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (user && !user.isActive) {
    res.status(403);
    throw new Error('Account has been disabled');
  }
  if (user && (await user.matchPassword(password))) {
    user.lastLogin = new Date();
    user.loginCount += 1;
    await user.save();
    // Short-lived access JWT plus an opaque, revocable refresh session.
    const token = generateToken(user._id, user.tokenVersion || 0);
    const session = await createSession(user._id, {
      userAgent: req.headers['user-agent'] || '',
      ip: req.ip || '',
    });
    setAuthCookies(res, { accessToken: token, refreshToken: session.raw });
    res.json({
      _id: user._id, name: user.name, email: user.email,
      isAdmin: user.isAdmin, role: user.role,
      permissions: user.getEffectivePermissions(),
      loyaltyPoints: user.loyaltyPoints,
      token,
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
    const token = generateToken(user._id, user.tokenVersion || 0);
    const session = await createSession(user._id, {
      userAgent: req.headers['user-agent'] || '',
      ip: req.ip || '',
    });
    setAuthCookies(res, { accessToken: token, refreshToken: session.raw });
    res.status(201).json({
      _id: user._id, name: user.name, email: user.email,
      isAdmin: user.isAdmin, role: user.role,
      permissions: user.getEffectivePermissions(),
      loyaltyPoints: user.loyaltyPoints,
      token,
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
    if (req.body.email && req.body.email.toLowerCase() !== user.email) {
      const taken = await User.findOne({ email: req.body.email.toLowerCase() });
      if (taken) {
        res.status(400);
        throw new Error('Email is already in use');
      }
    }
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.phone = req.body.phone || user.phone;
    user.address = req.body.address || user.address;
    if (req.body.password) {
      // Changing a password requires proving knowledge of the current one, and
      // invalidates every previously issued token.
      const currentPassword = req.body.currentPassword;
      if (!currentPassword) {
        res.status(400);
        throw new Error('Current password is required to set a new password');
      }
      if (!(await user.matchPassword(currentPassword))) {
        res.status(401);
        throw new Error('Current password is incorrect');
      }
      if (req.body.password.length < 8) {
        res.status(400);
        throw new Error('Password must be at least 8 characters');
      }
      user.password = req.body.password;
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      user.passwordChangedAt = new Date();
    }
    const updatedUser = await user.save();
    // A password change bumps tokenVersion and revokes every existing session,
    // then mints a replacement so the current device stays signed in.
    await revokeAllSessions(updatedUser._id);
    const token = generateToken(updatedUser._id, updatedUser.tokenVersion || 0);
    const session = await createSession(updatedUser._id, {
      userAgent: req.headers['user-agent'] || '',
      ip: req.ip || '',
    });
    setAuthCookies(res, { accessToken: token, refreshToken: session.raw });
    res.json({
      _id: updatedUser._id, name: updatedUser.name, email: updatedUser.email,
      isAdmin: updatedUser.isAdmin, role: updatedUser.role,
      permissions: updatedUser.getEffectivePermissions(),
      loyaltyPoints: updatedUser.loyaltyPoints, address: updatedUser.address,
      phone: updatedUser.phone, token,
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

/**
 * Clears the auth cookie. The JWT itself is stateless, so the client is
 * expected to discard it; tokenVersion remains available for hard revocation.
 */
const logoutUser = async (req, res) => {
  // Revoking the server-side session is what makes logout meaningful: a
  // stolen refresh token stops working immediately, not at expiry.
  const presented = readRefreshCookie(req);
  if (presented) await revokeSession(presented);
  clearAuthCookies(res);
  res.json({ message: 'Signed out' });
};

/**
 * Re-issues a fresh cookie for the current session. The httpOnly cookie is not
 * readable by the app, so an explicit endpoint is used to roll it forward.
 */
const refreshSession = async (req, res) => {
  // The access token may already be expired, so validate the refresh session
  // directly rather than relying on req.user.
  const presented = readRefreshCookie(req);
  const session = await resolveSession(presented);
  if (!session) {
    clearAuthCookies(res);
    res.status(401);
    throw new Error('Session expired, please sign in again');
  }
  const rotated = await rotateSession(session, {
    userAgent: req.headers['user-agent'] || '',
    ip: req.ip || '',
  });
  if (!rotated) {
    // Lost the race: the token was already used. Treat as theft/replay.
    clearAuthCookies(res);
    res.status(401);
    throw new Error('Session expired, please sign in again');
  }
  const user = req.user || (await User.findById(session.user));
  if (!user) {
    clearAuthCookies(res);
    res.status(401);
    throw new Error('User not found');
  }
  // A disabled account must not be able to mint new credentials, even though
  // its session row is still live.
  if (!user.isActive) {
    await revokeSession(rotated.raw);
    clearAuthCookies(res);
    res.status(403);
    throw new Error('Account has been disabled');
  }
  const token = generateToken(user._id, user.tokenVersion || 0);
  setAuthCookies(res, { accessToken: token, refreshToken: rotated.raw });
  res.json({ _id: user._id, name: user.name, email: user.email, role: user.role, token });
};

module.exports = {
  authUser: asyncHandler(authUser),
  registerUser: asyncHandler(registerUser),
  getUserProfile: asyncHandler(getUserProfile),
  updateUserProfile: asyncHandler(updateUserProfile),
  addToWishlist: asyncHandler(addToWishlist),
  logoutUser: asyncHandler(logoutUser),
  refreshSession: asyncHandler(refreshSession),
};
