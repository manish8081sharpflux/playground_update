const {
  getSettings,
  updateSettings,
} = require('../../../services/lmsCoinLimitSettings');
const { errorLogger } = require('../../../config/pino-config');

exports.getCoinLimits = async (req, res) => {
  try {
    const settings = await getSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    errorLogger.error({ err: error }, 'Error fetching LMS coin limits:');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch coin limits',
    });
  }
};

exports.updateCoinLimits = async (req, res) => {
  try {
    const settings = await updateSettings(
      req.body?.taskTypes,
      req.user?._id || req.user?.id
    );
    res.json({
      success: true,
      message: 'Suggested coin limits updated',
      data: settings,
    });
  } catch (error) {
    errorLogger.error({ err: error }, 'Error updating LMS coin limits:');
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update coin limits',
    });
  }
};
