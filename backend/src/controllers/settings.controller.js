const Settings = require('../models/Settings');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const { sendDiscordNotification } = require('../services/discord.service');

/**
 * GET /api/settings
 * Get global settings (admin only)
 */
const getSettings = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new ApiError(403, 'Access denied. Admin only.');
  }

  const settings = await Settings.getGlobal();
  sendSuccess(res, { data: settings });
});

/**
 * GET /api/settings/me
 * Get effective settings for current user (global + overrides)
 */
const getMySettings = asyncHandler(async (req, res) => {
  const settings = await Settings.getGlobal();
  const effectiveSettings = settings.getForUser(req.user._id);
  sendSuccess(res, { data: effectiveSettings });
});

/**
 * PATCH /api/settings
 * Update global settings (admin only)
 */
const updateSettings = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new ApiError(403, 'Access denied. Admin only.');
  }

  const settings = await Settings.getGlobal();
  
  // Only allow updating specific top-level keys
  const allowedKeys = ['discord', 'calendly', 'callQueue', 'leadRouting', 'notifications', 'automation', 'crm'];
  const updates = {};
  
  allowedKeys.forEach(key => {
    if (req.body[key] !== undefined) {
      updates[key] = req.body[key];
    }
  });

  Object.assign(settings, updates);
  await settings.save();

  sendSuccess(res, { message: 'Settings updated successfully', data: settings });
});

/**
 * PATCH /api/settings/overrides
 * Set user-specific override (admin only)
 */
const setUserOverride = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new ApiError(403, 'Access denied. Admin only.');
  }

  const { userId, path, value } = req.body;
  
  if (!userId || !path) {
    throw new ApiError(400, 'userId and path are required');
  }

  const settings = await Settings.getGlobal();
  await settings.setUserOverride(userId, path, value);

  sendSuccess(res, { message: 'User override set successfully' });
});

/**
 * DELETE /api/settings/overrides
 * Clear user-specific override (admin only)
 */
const clearUserOverride = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new ApiError(403, 'Access denied. Admin only.');
  }

  const { userId, path } = req.body;
  
  if (!userId || !path) {
    throw new ApiError(400, 'userId and path are required');
  }

  const settings = await Settings.getGlobal();
  await settings.clearUserOverride(userId, path);

  sendSuccess(res, { message: 'User override cleared successfully' });
});

/**
 * POST /api/settings/test-discord
 * Test Discord webhook connection (admin only)
 */
const testDiscord = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new ApiError(403, 'Access denied. Admin only.');
  }

  const settings = await Settings.getGlobal();
  const webhookUrl = req.body.webhookUrl || settings.discord.webhookUrl;

  if (!webhookUrl) {
    throw new ApiError(400, 'Discord webhook URL not configured');
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: 'Test G.A.I.A. Test Notification',
          description: 'Discord integration is working correctly!',
          color: 0x3ecf6a,
          timestamp: new Date().toISOString(),
          fields: [
            { name: 'Test Time', value: new Date().toLocaleString(), inline: true },
            { name: 'Status', value: 'âœ... Connected', inline: true },
          ],
        }],
      }),
    });

    if (!response.ok) {
      throw new ApiError(400, 'Discord webhook test failed');
    }

    sendSuccess(res, { message: 'Discord webhook test successful' });
  } catch (error) {
    throw new ApiError(400, 'Discord webhook test failed: ' + error.message);
  }
});

/**
 * POST /api/settings/notify
 * Send a structured operational notification using effective global settings.
 */
const sendNotification = asyncHandler(async (req, res) => {
  const { action = 'Lead Update', lead, notes, appointmentAt, enrichment, competition } = req.body;

  if (!lead || !lead.name) {
    throw new ApiError(400, 'A complete lead profile is required');
  }

  const result = await sendDiscordNotification(action, lead, req.user, {
    notes,
    appointmentAt,
    enrichment,
    competition,
  });

  if (!result.sent) {
    throw new ApiError(400, result.reason || 'Discord notification failed');
  }

  sendSuccess(res, { message: 'Discord notification sent', data: result });
});

module.exports = {
  getSettings,
  getMySettings,
  updateSettings,
  setUserOverride,
  clearUserOverride,
  testDiscord,
  sendNotification,
};

