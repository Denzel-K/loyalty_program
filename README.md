# Loyalty Program API

A comprehensive loyalty rewards system for local businesses (salons, barbershops, eateries) that uses phone numbers to track customer visits and reward frequent customers.

## Features

- **Phone-based Customer Authentication**: Customers sign up and login using their phone number with OTP verification
- **Business Management**: Business owners can register, manage their loyalty program settings, and track customer visits
- **Visit Tracking**: Record customer visits and automatically award loyalty points
- **Reward System**: Create and manage rewards that customers can redeem with their points
- **Analytics**: Track business performance and customer engagement
- **RESTful API**: Clean, well-documented API endpoints

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT tokens with phone number verification
- **Validation**: Express-validator
- **Security**: bcrypt for password hashing, CORS enabled

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd loyalty_program
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory with the following variables:
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/loyalty_program
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d
OTP_EXPIRE_MINUTES=5
OTP_LENGTH=6
```

4. Start the server:
```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

## API Endpoints

### Authentication Routes (`/api/auth`)

#### Business Authentication
- `POST /api/auth/business/register` - Register a new business
- `POST /api/auth/business/login` - Business login

#### Customer Authentication (Phone-based)
- `POST /api/auth/customer/register` - Register/login customer with phone number
- `POST /api/auth/customer/verify-otp` - Verify OTP and complete login
- `POST /api/auth/customer/resend-otp` - Resend OTP

#### Common
- `POST /api/auth/logout` - Logout (clears cookies)
- `GET /api/auth/profile` - Get current user profile

### Business Routes (`/api/business`)
*Requires business authentication*

- `GET /api/business/dashboard` - Business dashboard data
- `PUT /api/business/profile` - Update business profile
- `GET /api/business/analytics` - Business analytics
- `PUT /api/business/loyalty-settings` - Update loyalty program settings
- `GET /api/business/customers` - Get business customers

### Customer Routes (`/api/customer`)
*Requires customer authentication*

- `GET /api/customer/profile` - Customer profile
- `PUT /api/customer/profile` - Update customer profile
- `GET /api/customer/visits` - Customer visit history
- `GET /api/customer/points` - Customer points balance
- `GET /api/customer/redemptions` - Customer redemption history

### Visit Routes (`/api/visits`)

- `POST /api/visits` - Record a new visit (business only)
- `GET /api/visits` - Get visits (filtered by user type)
- `GET /api/visits/:id` - Get specific visit
- `PUT /api/visits/:id` - Update visit (business only)
- `DELETE /api/visits/:id` - Delete visit (business only)

### Reward Routes (`/api/rewards`)

- `POST /api/rewards` - Create reward (business only)
- `GET /api/rewards` - Get rewards
- `GET /api/rewards/:id` - Get specific reward
- `PUT /api/rewards/:id` - Update reward (business only)
- `DELETE /api/rewards/:id` - Delete reward (business only)
- `POST /api/rewards/redeem` - Redeem reward (customer only)
- `GET /api/rewards/redemptions` - Get redemptions
- `GET /api/rewards/verify/:code` - Verify redemption code (business only)

## Database Schema

### Business
- Business information (name, type, contact details)
- Address and business hours
- Loyalty program settings (points per visit, redemption threshold)
- Statistics (total customers, visits, points issued)

### Customer
- Phone number (primary identifier)
- Optional personal information (name, email)
- Phone verification status and OTP handling
- Aggregated statistics

### Visit
- Customer and business references
- Visit details (date, points earned, service type, amount)
- Visit validation and metadata

### Reward
- Reward details (title, description, points required)
- Reward type and value
- Availability settings and restrictions
- Usage tracking

### Redemption
- Customer, business, and reward references
- Redemption details and status
- Unique redemption codes
- Usage tracking

## Development

### Project Structure
```
loyalty_program/
├── config/
│   └── db.js              # Database connection
├── controllers/
│   └── authControllers.js # Authentication logic
├── middleware/
│   ├── auth.js            # Authentication middleware
│   └── validation.js      # Input validation
├── models/
│   ├── Business.js        # Business schema
│   ├── Customer.js        # Customer schema
│   ├── Visit.js           # Visit schema
│   ├── Reward.js          # Reward schema
│   └── Redemption.js      # Redemption schema
├── routes/
│   ├── authRoutes.js      # Authentication routes
│   ├── businessRoutes.js  # Business routes
│   ├── customerRoutes.js  # Customer routes
│   ├── visitRoutes.js     # Visit routes
│   └── rewardRoutes.js    # Reward routes
├── utils/
│   ├── otpService.js      # OTP generation and sending
│   └── phoneValidator.js  # Phone number validation
├── app.js                 # Main application file
├── package.json
└── README.md
```

### Testing

The API includes test endpoints for each route group:
- `GET /api/auth/test`
- `GET /api/business/test`
- `GET /api/customer/test`
- `GET /api/visits/test/endpoint`
- `GET /api/rewards/test/endpoint`

### Health Check

- `GET /api/health` - API health status
- `GET /` - API information and available endpoints

## Security Features

- JWT-based authentication with secure cookies
- Phone number verification with OTP
- Password hashing with bcrypt
- Input validation and sanitization
- Rate limiting for OTP requests
- CORS configuration
- Environment-based configuration

## Future Enhancements

- SMS integration (Twilio, AWS SNS)
- Email notifications
- Push notifications
- Advanced analytics and reporting
- Multi-location business support
- Customer segmentation
- Promotional campaigns
- Mobile app integration

## License

This project is licensed under the ISC License.
