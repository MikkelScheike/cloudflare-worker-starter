/**
 * Authentication utilities for Cloudflare Workers
 * Provides user authentication, registration, and password management
 */

import { hashPassword, verifyPassword } from './utils.js';
import { createSession, destroySession } from './session.js';
import { saveToKV, getFromKV } from './kv-utils.js';
import { auditLog } from './audit.js';
import { isValidEmail } from './email-validation.js';

/**
 * Register a new user
 * @param {string} email - User email
 * @param {string} password - User password (will be hashed)
 * @param {Object} env - Environment variables
 * @param {Request} request - Request object for audit logging
 * @returns {Object} Result object with success status and user data
 */
export async function registerUser(email, password, env, request) {
  try {
    // Validate email format and check for spam/disposable domains
    const emailValidation = await isValidEmail(email, 'signup');
    if (!emailValidation.isValid) {
      await auditLog(env, {
        action: 'register_failed',
        email,
        reason: emailValidation.reason,
        ip: request.headers.get('CF-Connecting-IP'),
        userAgent: request.headers.get('User-Agent')
      });
      
      return {
        success: false,
        error: 'Invalid email address'
      };
    }

    // Check if user already exists
    const existingUser = await getFromKV(env.USERS, `user:${email}`);
    if (existingUser) {
      await auditLog(env, {
        action: 'register_failed',
        email,
        reason: 'email_exists',
        ip: request.headers.get('CF-Connecting-IP')
      });
      
      return {
        success: false,
        error: 'User already exists'
      };
    }

    // Hash password
    const hashedPassword = await hashPassword(password);
    
    // Create user object
    const user = {
      id: crypto.randomUUID(),
      email: email.toLowerCase(),
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      verified: false,
      plan: 'free'
    };

    // Save user to KV
    await saveToKV(env.USERS, `user:${email}`, user);
    await saveToKV(env.USERS, `user_by_id:${user.id}`, { email });

    // Log successful registration
    await auditLog(env, {
      action: 'user_registered',
      userId: user.id,
      email,
      ip: request.headers.get('CF-Connecting-IP'),
      userAgent: request.headers.get('User-Agent')
    });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        verified: user.verified,
        plan: user.plan
      }
    };

  } catch (error) {
    console.error('Registration error:', error);
    return {
      success: false,
      error: 'Registration failed'
    };
  }
}

/**
 * Authenticate user login
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {Object} env - Environment variables
 * @param {Request} request - Request object for audit logging
 * @returns {Object} Result object with success status and user data
 */
export async function loginUser(email, password, env, request) {
  try {
    // Get user from KV
    const user = await getFromKV(env.USERS, `user:${email.toLowerCase()}`);
    if (!user) {
      await auditLog(env, {
        action: 'login_failed',
        email,
        reason: 'user_not_found',
        ip: request.headers.get('CF-Connecting-IP')
      });
      
      return {
        success: false,
        error: 'Invalid credentials'
      };
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      await auditLog(env, {
        action: 'login_failed',
        userId: user.id,
        email,
        reason: 'invalid_password',
        ip: request.headers.get('CF-Connecting-IP')
      });
      
      return {
        success: false,
        error: 'Invalid credentials'
      };
    }

    // Log successful login
    await auditLog(env, {
      action: 'user_login',
      userId: user.id,
      email,
      ip: request.headers.get('CF-Connecting-IP'),
      userAgent: request.headers.get('User-Agent')
    });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        verified: user.verified,
        plan: user.plan
      }
    };

  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: 'Login failed'
    };
  }
}

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @param {Object} env - Environment variables
 * @returns {Object|null} User object or null if not found
 */
export async function getUserById(userId, env) {
  try {
    const userRef = await getFromKV(env.USERS, `user_by_id:${userId}`);
    if (!userRef) return null;

    const user = await getFromKV(env.USERS, `user:${userRef.email}`);
    if (!user) return null;

    // Return user without password
    const { password, ...safeUser } = user;
    return safeUser;

  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
}

/**
 * Update user data
 * @param {string} userId - User ID
 * @param {Object} updates - Fields to update
 * @param {Object} env - Environment variables
 * @returns {Object} Result object with success status
 */
export async function updateUser(userId, updates, env) {
  try {
    const userRef = await getFromKV(env.USERS, `user_by_id:${userId}`);
    if (!userRef) {
      return { success: false, error: 'User not found' };
    }

    const user = await getFromKV(env.USERS, `user:${userRef.email}`);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Apply updates (excluding sensitive fields)
    const allowedUpdates = ['verified', 'plan', 'settings'];
    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key];
        return obj;
      }, {});

    const updatedUser = {
      ...user,
      ...filteredUpdates,
      updatedAt: new Date().toISOString()
    };

    await saveToKV(env.USERS, `user:${user.email}`, updatedUser);

    return { success: true };

  } catch (error) {
    console.error('Update user error:', error);
    return { success: false, error: 'Update failed' };
  }
}

/**
 * Change user password
 * @param {string} userId - User ID
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @param {Object} env - Environment variables
 * @param {Request} request - Request object for audit logging
 * @returns {Object} Result object with success status
 */
export async function changePassword(userId, currentPassword, newPassword, env, request) {
  try {
    const userRef = await getFromKV(env.USERS, `user_by_id:${userId}`);
    if (!userRef) {
      return { success: false, error: 'User not found' };
    }

    const user = await getFromKV(env.USERS, `user:${userRef.email}`);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Verify current password
    const isValidPassword = await verifyPassword(currentPassword, user.password);
    if (!isValidPassword) {
      await auditLog(env, {
        action: 'password_change_failed',
        userId,
        reason: 'invalid_current_password',
        ip: request.headers.get('CF-Connecting-IP')
      });
      
      return { success: false, error: 'Invalid current password' };
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update user
    const updatedUser = {
      ...user,
      password: hashedNewPassword,
      updatedAt: new Date().toISOString()
    };

    await saveToKV(env.USERS, `user:${user.email}`, updatedUser);

    // Log password change
    await auditLog(env, {
      action: 'password_changed',
      userId,
      ip: request.headers.get('CF-Connecting-IP')
    });

    return { success: true };

  } catch (error) {
    console.error('Change password error:', error);
    return { success: false, error: 'Password change failed' };
  }
}

/**
 * Delete user account
 * @param {string} userId - User ID
 * @param {Object} env - Environment variables
 * @param {Request} request - Request object for audit logging
 * @returns {Object} Result object with success status
 */
export async function deleteUser(userId, env, request) {
  try {
    const userRef = await getFromKV(env.USERS, `user_by_id:${userId}`);
    if (!userRef) {
      return { success: false, error: 'User not found' };
    }

    const user = await getFromKV(env.USERS, `user:${userRef.email}`);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Delete user data
    await env.USERS.delete(`user:${user.email}`);
    await env.USERS.delete(`user_by_id:${userId}`);

    // Log account deletion
    await auditLog(env, {
      action: 'user_deleted',
      userId,
      email: user.email,
      ip: request.headers.get('CF-Connecting-IP')
    });

    return { success: true };

  } catch (error) {
    console.error('Delete user error:', error);
    return { success: false, error: 'Account deletion failed' };
  }
}
