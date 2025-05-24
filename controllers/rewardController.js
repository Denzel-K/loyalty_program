const Reward = require('../models/Reward');
const Redemption = require('../models/Redemption');
const Visit = require('../models/Visit');

// Create a new reward (business only)
const createReward = async (req, res) => {
  try {
    const businessId = req.business._id;
    const rewardData = {
      ...req.body,
      business: businessId
    };
    
    const reward = new Reward(rewardData);
    await reward.save();
    
    res.status(201).json({
      success: true,
      message: 'Reward created successfully',
      data: {
        reward
      }
    });

  } catch (error) {
    console.error('Create reward error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating reward',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get rewards (filtered by user type)
const getRewards = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    let filter = {};
    
    // Filter based on user type
    if (req.userType === 'business') {
      filter.business = req.business._id;
    } else if (req.userType === 'customer') {
      // For customers, only show active rewards
      filter.isActive = true;
      
      // Optionally filter by business if businessId is provided in query
      if (req.query.businessId) {
        filter.business = req.query.businessId;
      }
    }
    
    const rewards = await Reward.find(filter)
      .populate('business', 'businessName businessType')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Reward.countDocuments(filter);
    
    // If customer, check which rewards they can redeem
    if (req.userType === 'customer') {
      for (let reward of rewards) {
        // Get customer's points for this business
        const customerPoints = await Visit.aggregate([
          {
            $match: {
              customer: req.customer._id,
              business: reward.business._id
            }
          },
          {
            $group: {
              _id: null,
              totalPoints: { $sum: '$pointsEarned' }
            }
          }
        ]);
        
        const points = customerPoints.length > 0 ? customerPoints[0].totalPoints : 0;
        reward._doc.customerCanRedeem = points >= reward.pointsRequired;
        reward._doc.customerPoints = points;
      }
    }
    
    res.json({
      success: true,
      data: {
        rewards,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get rewards error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching rewards',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get specific reward by ID
const getRewardById = async (req, res) => {
  try {
    const rewardId = req.params.id;
    
    const reward = await Reward.findById(rewardId)
      .populate('business', 'businessName businessType');
    
    if (!reward) {
      return res.status(404).json({
        success: false,
        message: 'Reward not found'
      });
    }
    
    // Check authorization for business users
    if (req.userType === 'business' && !reward.business._id.equals(req.business._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // For customers, add redemption info
    if (req.userType === 'customer') {
      const customerPoints = await Visit.aggregate([
        {
          $match: {
            customer: req.customer._id,
            business: reward.business._id
          }
        },
        {
          $group: {
            _id: null,
            totalPoints: { $sum: '$pointsEarned' }
          }
        }
      ]);
      
      const points = customerPoints.length > 0 ? customerPoints[0].totalPoints : 0;
      reward._doc.customerCanRedeem = points >= reward.pointsRequired;
      reward._doc.customerPoints = points;
    }
    
    res.json({
      success: true,
      data: {
        reward
      }
    });

  } catch (error) {
    console.error('Get reward error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching reward',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update reward (business only)
const updateReward = async (req, res) => {
  try {
    const rewardId = req.params.id;
    const updates = req.body;
    
    // Remove fields that shouldn't be updated
    delete updates.business;
    delete updates.totalRedemptions;
    
    const reward = await Reward.findOneAndUpdate(
      { _id: rewardId, business: req.business._id },
      updates,
      { new: true, runValidators: true }
    );
    
    if (!reward) {
      return res.status(404).json({
        success: false,
        message: 'Reward not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Reward updated successfully',
      data: {
        reward
      }
    });

  } catch (error) {
    console.error('Update reward error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating reward',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete reward (business only)
const deleteReward = async (req, res) => {
  try {
    const rewardId = req.params.id;
    
    const reward = await Reward.findOneAndDelete({
      _id: rewardId,
      business: req.business._id
    });
    
    if (!reward) {
      return res.status(404).json({
        success: false,
        message: 'Reward not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Reward deleted successfully'
    });

  } catch (error) {
    console.error('Delete reward error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting reward',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Redeem reward (customer only)
const redeemReward = async (req, res) => {
  try {
    const customerId = req.customer._id;
    const { rewardId, transactionAmount } = req.body;
    
    const reward = await Reward.findById(rewardId);
    
    if (!reward) {
      return res.status(404).json({
        success: false,
        message: 'Reward not found'
      });
    }
    
    if (!reward.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Reward is not active'
      });
    }
    
    // Check if customer has enough points
    const customerPoints = await Visit.aggregate([
      {
        $match: {
          customer: customerId,
          business: reward.business
        }
      },
      {
        $group: {
          _id: null,
          totalPoints: { $sum: '$pointsEarned' }
        }
      }
    ]);
    
    const points = customerPoints.length > 0 ? customerPoints[0].totalPoints : 0;
    
    if (points < reward.pointsRequired) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient points',
        data: {
          required: reward.pointsRequired,
          available: points
        }
      });
    }
    
    // Check if reward is available for customer
    const isAvailable = await reward.isAvailableForCustomer(customerId);
    if (!isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Reward is not available for redemption'
      });
    }
    
    // Create redemption
    const redemption = new Redemption({
      customer: customerId,
      business: reward.business,
      reward: rewardId,
      pointsUsed: reward.pointsRequired,
      transactionAmount,
      status: 'confirmed'
    });
    
    await redemption.save();
    
    // Populate for response
    await redemption.populate('reward', 'title description rewardType rewardValue');
    await redemption.populate('business', 'businessName');
    
    res.status(201).json({
      success: true,
      message: 'Reward redeemed successfully',
      data: {
        redemption,
        redemptionCode: redemption.redemptionCode
      }
    });

  } catch (error) {
    console.error('Redeem reward error:', error);
    res.status(500).json({
      success: false,
      message: 'Error redeeming reward',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get redemptions (filtered by user type)
const getRedemptions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    let filter = {};
    
    // Filter based on user type
    if (req.userType === 'business') {
      filter.business = req.business._id;
    } else if (req.userType === 'customer') {
      filter.customer = req.customer._id;
    }
    
    const redemptions = await Redemption.find(filter)
      .populate('customer', 'phoneNumber firstName lastName')
      .populate('business', 'businessName businessType')
      .populate('reward', 'title description rewardType rewardValue')
      .sort({ redemptionDate: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Redemption.countDocuments(filter);
    
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
    console.error('Get redemptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching redemptions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Verify redemption code (business only)
const verifyRedemption = async (req, res) => {
  try {
    const { code } = req.params;
    
    const redemption = await Redemption.findByCode(code);
    
    if (!redemption) {
      return res.status(404).json({
        success: false,
        message: 'Redemption code not found'
      });
    }
    
    // Check if redemption belongs to this business
    if (!redemption.business._id.equals(req.business._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    res.json({
      success: true,
      data: {
        redemption,
        isValid: redemption.isValid()
      }
    });

  } catch (error) {
    console.error('Verify redemption error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying redemption',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createReward,
  getRewards,
  getRewardById,
  updateReward,
  deleteReward,
  redeemReward,
  getRedemptions,
  verifyRedemption
};
