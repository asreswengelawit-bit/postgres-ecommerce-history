const Vendor = require('../models/Vendor');

/**
 * Fetch dashboard analytics stats for the vendor storefront
 */
exports.getDashboardStats = async (req, res, next) => {
  const vendorId = req.user.vendorId;

  try {
    if (!vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. User is not registered as a store vendor.',
      });
    }

    const stats = await Vendor.getStoreStats(vendorId);

    res.status(200).json({
      success: true,
      stats,
    });
  } catch (err) {
    next(err);
  }
};
