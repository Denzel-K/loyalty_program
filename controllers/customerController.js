const Customer = require('../models/Customer');
const Visit = require('../models/Visit');
const Redemption = require('../models/Redemption');

// Get customer profile
const getProfile = async (req, res) => {
  try {
    const customer = req.customer;
    
    // Get additional stats
    const stats = await Visit.aggregate([
      { $match: { customer: customer._id } },
      {
        $group: {
          _id: null,
          totalVisits: { $sum: 1 },
          totalPointsEarned: { $sum: '$pointsEarned' },
          uniqueBusinesses: { $addToSet: '$business' }
        }
      }
    ]);
    
    const totalRedemptions = await Redemption.countDocuments({ customer: customer._id });
    
    const customerData = customer.getPublicInfo();
    if (stats.length > 0) {
      customerData.totalVisits = stats[0].totalVisits;
      customerData.totalPointsEarned = stats[0].totalPointsEarned;
      customerData.uniqueBusinesses = stats[0].uniqueBusinesses.length;
    }
    customerData.totalRedemptions = totalRedemptions;
    
    res.json({
      success: true,
      data: {
        customer: customerData
      }
    });

  } catch (error) {
    console.error('Get customer profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update customer profile
const updateProfile = async (req, res) => {
  try {
    const customerId = req.customer._id;
    const updates = req.body;
    
    // Remove sensitive fields that shouldn't be updated
    delete updates.phoneNumber;
    delete updates.isPhoneVerified;
    delete updates.otp;
    delete updates.isActive;
    delete updates.totalVisits;
    delete updates.totalPointsEarned;
    delete updates.totalRedemptions;
    
    const customer = await Customer.findByIdAndUpdate(
      customerId,
      updates,
      { new: true, runValidators: true }
    );
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        customer: customer.getPublicInfo()
      }
    });

  } catch (error) {
    console.error('Update customer profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get customer visit history
const getVisitHistory = async (req, res) => {
  try {
    const customerId = req.customer._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const visits = await Visit.find({ customer: customerId })
      .populate('business', 'businessName businessType address')
      .sort({ visitDate: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Visit.countDocuments({ customer: customerId });
    
    res.json({
      success: true,
      data: {
        visits,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get visit history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching visit history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get customer points balance (per business)
const getPointsBalance = async (req, res) => {
  try {
    const customerId = req.customer._id;
    
    // Get points balance per business
    const pointsBalance = await Visit.aggregate([
      { $match: { customer: customerId } },
      {
        $group: {
          _id: '$business',
          totalPoints: { $sum: '$pointsEarned' },
          totalVisits: { $sum: 1 },
          lastVisit: { $max: '$visitDate' }
        }
      },
      {
        $lookup: {
          from: 'businesses',
          localField: '_id',
          foreignField: '_id',
          as: 'business'
        }
      },
      {
        $unwind: '$business'
      },
      {
        $project: {
          business: {
            _id: '$business._id',
            businessName: '$business.businessName',
            businessType: '$business.businessType',
            loyaltySettings: '$business.loyaltySettings'
          },
          totalPoints: 1,
          totalVisits: 1,
          lastVisit: 1
        }
      },
      { $sort: { totalPoints: -1 } }
    ]);
    
    // Get points used in redemptions per business
    const redemptionsData = await Redemption.aggregate([
      { $match: { customer: customerId } },
      {
        $group: {
          _id: '$business',
          totalPointsUsed: { $sum: '$pointsUsed' },
          totalRedemptions: { $sum: 1 }
        }
      }
    ]);
    
    // Combine data
    const balanceWithRedemptions = pointsBalance.map(balance => {
      const redemption = redemptionsData.find(r => r._id.equals(balance._id));
      const pointsUsed = redemption ? redemption.totalPointsUsed : 0;
      const totalRedemptions = redemption ? redemption.totalRedemptions : 0;
      
      return {
        ...balance,
        pointsUsed,
        availablePoints: balance.totalPoints - pointsUsed,
        totalRedemptions
      };
    });
    
    res.json({
      success: true,
      data: {
        pointsBalance: balanceWithRedemptions,
        summary: {
          totalBusinesses: balanceWithRedemptions.length,
          totalPoints: balanceWithRedemptions.reduce((sum, b) => sum + b.totalPoints, 0),
          totalAvailablePoints: balanceWithRedemptions.reduce((sum, b) => sum + b.availablePoints, 0),
          totalPointsUsed: balanceWithRedemptions.reduce((sum, b) => sum + b.pointsUsed, 0)
        }
      }
    });

  } catch (error) {
    console.error('Get points balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching points balance',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get customer redemption history
const getRedemptionHistory = async (req, res) => {
  try {
    const customerId = req.customer._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const redemptions = await Redemption.find({ customer: customerId })
      .populate('business', 'businessName businessType')
      .populate('reward', 'title description rewardType rewardValue')
      .sort({ redemptionDate: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Redemption.countDocuments({ customer: customerId });
    
    res.json({
      success: true,
      data: {
        redemptions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get redemption history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching redemption history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getVisitHistory,
  getPointsBalance,
  getRedemptionHistory
};
