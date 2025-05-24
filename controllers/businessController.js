const Business = require('../models/Business');
const Customer = require('../models/Customer');
const Visit = require('../models/Visit');
const Reward = require('../models/Reward');

// Get business dashboard data
const getDashboard = async (req, res) => {
  try {
    const businessId = req.business._id;
    
    // Get basic stats
    const totalCustomers = await Customer.countDocuments({
      _id: { $in: await Visit.distinct('customer', { business: businessId }) }
    });
    
    const totalVisits = await Visit.countDocuments({ business: businessId });
    const totalRewards = await Reward.countDocuments({ business: businessId });
    
    // Get recent visits
    const recentVisits = await Visit.find({ business: businessId })
      .populate('customer', 'phoneNumber firstName lastName')
      .sort({ visitDate: -1 })
      .limit(5);
    
    res.json({
      success: true,
      data: {
        business: req.business.getPublicInfo(),
        stats: {
          totalCustomers,
          totalVisits,
          totalRewards,
          totalPointsIssued: req.business.totalPointsIssued || 0,
          totalRedemptions: req.business.totalRedemptions || 0
        },
        recentVisits
      }
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update business profile
const updateProfile = async (req, res) => {
  try {
    const businessId = req.business._id;
    const updates = req.body;
    
    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete updates.password;
    delete updates.email;
    delete updates.isVerified;
    delete updates.isActive;
    
    const business = await Business.findByIdAndUpdate(
      businessId,
      updates,
      { new: true, runValidators: true }
    );
    
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        business: business.getPublicInfo()
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get business analytics
const getAnalytics = async (req, res) => {
  try {
    const businessId = req.business._id;
    const { startDate, endDate } = req.query;
    
    // Build date filter
    const dateFilter = { business: businessId };
    if (startDate && endDate) {
      dateFilter.visitDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    // Get visit analytics
    const visitAnalytics = await Visit.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            year: { $year: '$visitDate' },
            month: { $month: '$visitDate' },
            day: { $dayOfMonth: '$visitDate' }
          },
          totalVisits: { $sum: 1 },
          totalPoints: { $sum: '$pointsEarned' },
          uniqueCustomers: { $addToSet: '$customer' },
          averageAmount: { $avg: '$amount' }
        }
      },
      {
        $project: {
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: '$_id.day'
            }
          },
          totalVisits: 1,
          totalPoints: 1,
          uniqueCustomers: { $size: '$uniqueCustomers' },
          averageAmount: { $round: ['$averageAmount', 2] }
        }
      },
      { $sort: { date: 1 } }
    ]);
    
    res.json({
      success: true,
      data: {
        analytics: visitAnalytics,
        summary: {
          totalDays: visitAnalytics.length,
          totalVisits: visitAnalytics.reduce((sum, day) => sum + day.totalVisits, 0),
          totalPoints: visitAnalytics.reduce((sum, day) => sum + day.totalPoints, 0),
          averageVisitsPerDay: visitAnalytics.length > 0 ? 
            Math.round(visitAnalytics.reduce((sum, day) => sum + day.totalVisits, 0) / visitAnalytics.length) : 0
        }
      }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update loyalty settings
const updateLoyaltySettings = async (req, res) => {
  try {
    const businessId = req.business._id;
    const { loyaltySettings } = req.body;
    
    const business = await Business.findByIdAndUpdate(
      businessId,
      { loyaltySettings },
      { new: true, runValidators: true }
    );
    
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Loyalty settings updated successfully',
      data: {
        loyaltySettings: business.loyaltySettings
      }
    });

  } catch (error) {
    console.error('Update loyalty settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating loyalty settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get business customers
const getCustomers = async (req, res) => {
  try {
    const businessId = req.business._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Get customers who have visited this business
    const customerIds = await Visit.distinct('customer', { business: businessId });
    
    const customers = await Customer.find({ _id: { $in: customerIds } })
      .select('phoneNumber firstName lastName totalVisits totalPointsEarned lastVisitDate')
      .skip(skip)
      .limit(limit)
      .sort({ lastVisitDate: -1 });
    
    const total = customerIds.length;
    
    res.json({
      success: true,
      data: {
        customers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customers',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getDashboard,
  updateProfile,
  getAnalytics,
  updateLoyaltySettings,
  getCustomers
};
