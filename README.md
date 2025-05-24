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
- Postman (for API testing)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/loyalty_program.git
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
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
JWT_EXPIRE=7d
OTP_EXPIRE_MINUTES=5
OTP_LENGTH=6
DEFAULT_POINTS_PER_VISIT=10
DEFAULT_REDEMPTION_THRESHOLD=100
```

4. Start MongoDB:
Make sure MongoDB is running on your system. If using MongoDB locally:
```bash
mongod
```

5. Start the server:
```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

The server will start on `http://localhost:3000`

## API Testing with Postman

### Base URL
```
http://localhost:3000
```

### Health Check
**GET** `/api/health`
- No authentication required
- Returns API status

### Root Endpoint
**GET** `/`
- No authentication required
- Returns API information and available endpoints

---

## Authentication Routes (`/api/auth`)

### 1. Business Registration
**POST** `/api/auth/business/register`

**Body (JSON):**
```json
{
  "businessName": "Vivian's Hair Salon",
  "businessType": "salon",
  "email": "vivian@hairsalon.com",
  "phoneNumber": "+254705881229",
  "password": "SecurePass123",
  "address": {
    "street": "123 Main Street",
    "city": "Nairobi",
    "state": "Nairobi County",
    "zipCode": "00100",
    "country": "Kenya"
  }
}
```

### 2. Business Login
**POST** `/api/auth/business/login`

**Body (JSON):**
```json
{
  "email": "vivian@hairsalon.com",
  "password": "SecurePass123"
}
```

### 3. Customer Registration
**POST** `/api/auth/customer/register`

**Body (JSON):**
```json
{
  "phoneNumber": "+254705881229",
  "firstName": "Vivian",
  "lastName": "Kiunga",
  "email": "sifavivz@gmail.com"
}
```

### 4. Verify OTP
**POST** `/api/auth/customer/verify-otp`

**Body (JSON):**
```json
{
  "phoneNumber": "+254705881229",
  "otp": "123456"
}
```

### 5. Resend OTP
**POST** `/api/auth/customer/resend-otp`

**Body (JSON):**
```json
{
  "phoneNumber": "+254705881229"
}
```

### 6. Get Profile
**GET** `/api/auth/profile`
- **Authentication:** Required (Business or Customer token)

### 7. Logout
**POST** `/api/auth/logout`
- **Authentication:** Optional

---

## Business Routes (`/api/business`)
*All routes require business authentication*

### 1. Get Dashboard
**GET** `/api/business/dashboard`
- **Authentication:** Business token required

### 2. Update Profile
**PUT** `/api/business/profile`

**Body (JSON):**
```json
{
  "businessName": "Updated Salon Name",
  "businessHours": {
    "monday": { "open": "09:00", "close": "18:00", "isClosed": false },
    "tuesday": { "open": "09:00", "close": "18:00", "isClosed": false },
    "sunday": { "isClosed": true }
  }
}
```

### 3. Get Analytics
**GET** `/api/business/analytics?startDate=2024-01-01&endDate=2024-12-31`
- **Query Parameters:** `startDate`, `endDate` (optional)

### 4. Update Loyalty Settings
**PUT** `/api/business/loyalty-settings`

**Body (JSON):**
```json
{
  "loyaltySettings": {
    "pointsPerVisit": 15,
    "redemptionThreshold": 150,
    "rewardValue": 15,
    "maxRedemptionsPerDay": 3
  }
}
```

### 5. Get Customers
**GET** `/api/business/customers?page=1&limit=10`
- **Query Parameters:** `page`, `limit` (optional)

---

## Customer Routes (`/api/customer`)
*All routes require customer authentication*

### 1. Get Profile
**GET** `/api/customer/profile`

### 2. Update Profile
**PUT** `/api/customer/profile`

**Body (JSON):**
```json
{
  "firstName": "Updated Name",
  "lastName": "Updated Last Name",
  "email": "newemail@example.com",
  "preferences": {
    "receivePromotions": true,
    "preferredContactMethod": "sms"
  }
}
```

### 3. Get Visit History
**GET** `/api/customer/visits?page=1&limit=10`

### 4. Get Points Balance
**GET** `/api/customer/points`

### 5. Get Redemption History
**GET** `/api/customer/redemptions?page=1&limit=10`

---

## Visit Routes (`/api/visits`)

### 1. Record Visit (Business Only)
**POST** `/api/visits`
- **Authentication:** Business token required

**Body (JSON):**
```json
{
  "customerPhone": "+254705881229",
  "serviceType": "Haircut and Styling",
  "amount": 2500,
  "notes": "Regular customer, preferred stylist",
  "pointsMultiplier": 1.5
}
```

**Alternative with Customer ID:**
```json
{
  "customerId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "serviceType": "Manicure",
  "amount": 1500
}
```

### 2. Get Visits
**GET** `/api/visits?page=1&limit=10`
- **Authentication:** Business or Customer token required
- Returns visits filtered by user type

### 3. Get Visit by ID
**GET** `/api/visits/{visitId}`
- **Authentication:** Business or Customer token required

### 4. Update Visit (Business Only)
**PUT** `/api/visits/{visitId}`
- **Authentication:** Business token required

**Body (JSON):**
```json
{
  "serviceType": "Updated Service",
  "amount": 3000,
  "notes": "Updated notes"
}
```

### 5. Delete Visit (Business Only)
**DELETE** `/api/visits/{visitId}`
- **Authentication:** Business token required

---

## Reward Routes (`/api/rewards`)

### 1. Create Reward (Business Only)
**POST** `/api/rewards`
- **Authentication:** Business token required

**Body (JSON):**
```json
{
  "title": "Free Haircut",
  "description": "Get a free basic haircut when you redeem this reward",
  "pointsRequired": 100,
  "rewardType": "free_service",
  "rewardValue": 0,
  "maxRedemptionsPerCustomer": 1,
  "validUntil": "2024-12-31T23:59:59.000Z",
  "availableDays": ["monday", "tuesday", "wednesday", "thursday", "friday"],
  "availableTimeStart": "09:00",
  "availableTimeEnd": "17:00",
  "terms": "Valid for basic haircut only. Cannot be combined with other offers."
}
```

### 2. Get Rewards
**GET** `/api/rewards?page=1&limit=10`
- **Authentication:** Business or Customer token required
- For customers: only shows active rewards
- Optional query parameter: `businessId` (for customers)

### 3. Get Reward by ID
**GET** `/api/rewards/{rewardId}`
- **Authentication:** Business or Customer token required

### 4. Update Reward (Business Only)
**PUT** `/api/rewards/{rewardId}`
- **Authentication:** Business token required

**Body (JSON):**
```json
{
  "title": "Updated Reward Title",
  "pointsRequired": 120,
  "isActive": false
}
```

### 5. Delete Reward (Business Only)
**DELETE** `/api/rewards/{rewardId}`
- **Authentication:** Business token required

### 6. Redeem Reward (Customer Only)
**POST** `/api/rewards/redeem`
- **Authentication:** Customer token required

**Body (JSON):**
```json
{
  "rewardId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "transactionAmount": 2500
}
```

### 7. Get Redemptions
**GET** `/api/rewards/redemptions?page=1&limit=10`
- **Authentication:** Business or Customer token required
- Returns redemptions filtered by user type

### 8. Verify Redemption Code (Business Only)
**GET** `/api/rewards/verify/{redemptionCode}`
- **Authentication:** Business token required
- Example: `/api/rewards/verify/ABC12345`

---

## Authentication

### Using JWT Tokens

After successful login/registration, you'll receive a JWT token. Use this token in subsequent requests:

**Header:**
```
Authorization: Bearer YOUR_JWT_TOKEN_HERE
```

### Using Cookies (Alternative)

The API also supports cookie-based authentication. Tokens are automatically set as HTTP-only cookies after login.

---

## Testing Workflow

### 1. Test Basic Endpoints
1. **GET** `/api/health` - Verify API is running
2. **GET** `/` - Get API information

### 2. Business Flow
1. **POST** `/api/auth/business/register` - Register a business
2. **POST** `/api/auth/business/login` - Login (if already registered)
3. **GET** `/api/business/dashboard` - View dashboard
4. **POST** `/api/rewards` - Create a reward
5. **GET** `/api/rewards` - View rewards

### 3. Customer Flow
1. **POST** `/api/auth/customer/register` - Register with phone number
2. **POST** `/api/auth/customer/verify-otp` - Verify OTP (use OTP from console logs in development)
3. **GET** `/api/customer/profile` - View profile
4. **GET** `/api/customer/points` - Check points balance

### 4. Visit Recording Flow
1. Login as business
2. **POST** `/api/visits` - Record a customer visit
3. Login as customer
4. **GET** `/api/customer/visits` - View visit history
5. **GET** `/api/customer/points` - Check updated points

### 5. Reward Redemption Flow
1. Login as customer
2. **GET** `/api/rewards` - View available rewards
3. **POST** `/api/rewards/redeem` - Redeem a reward
4. Login as business
5. **GET** `/api/rewards/verify/{code}` - Verify redemption code

---

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "fieldName",
      "message": "Field-specific error message"
    }
  ]
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limiting)
- `500` - Internal Server Error

---

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

---

## Development Notes

### OTP in Development Mode

In development mode, OTP codes are logged to the console instead of being sent via SMS:

```
📱 OTP for +254705881229: 123456
```

Use these console-logged OTP codes for testing customer verification.

### Project Structure
```
loyalty_program/
├── config/
│   └── db.js                    # Database connection
├── controllers/
│   ├── authControllers.js       # Authentication logic
│   ├── businessController.js    # Business operations
│   ├── customerController.js    # Customer operations
│   ├── visitController.js       # Visit management
│   └── rewardController.js      # Reward & redemption logic
├── middleware/
│   ├── auth.js                  # Authentication middleware
│   └── validation.js            # Input validation
├── models/
│   ├── Business.js              # Business schema
│   ├── Customer.js              # Customer schema
│   ├── Visit.js                 # Visit schema
│   ├── Reward.js                # Reward schema
│   └── Redemption.js            # Redemption schema
├── routes/
│   ├── authRoutes.js            # Authentication routes
│   ├── businessRoutes.js        # Business routes
│   ├── customerRoutes.js        # Customer routes
│   ├── visitRoutes.js           # Visit routes
│   └── rewardRoutes.js          # Reward routes
├── utils/
│   ├── otpService.js            # OTP generation and sending
│   └── phoneValidator.js        # Phone number validation
├── app.js                       # Main application file
├── package.json
├── .env                         # Environment variables
└── README.md
```

### Test Endpoints

The API includes test endpoints for development:
- **GET** `/api/auth/test` - Test auth routes
- **GET** `/api/business/test` - Test business routes (requires business auth)
- **GET** `/api/customer/test` - Test customer routes (requires customer auth)
- **GET** `/api/visits/test/endpoint` - Test visit routes
- **GET** `/api/rewards/test/endpoint` - Test reward routes

---

## Postman Collection

You can create a Postman collection with the following structure:

### Folder: Health Check
- GET `/api/health`
- GET `/`

### Folder: Authentication
- POST `/api/auth/business/register`
- POST `/api/auth/business/login`
- POST `/api/auth/customer/register`
- POST `/api/auth/customer/verify-otp`
- POST `/api/auth/customer/resend-otp`
- GET `/api/auth/profile`
- POST `/api/auth/logout`

### Folder: Business Management
- GET `/api/business/dashboard`
- PUT `/api/business/profile`
- GET `/api/business/analytics`
- PUT `/api/business/loyalty-settings`
- GET `/api/business/customers`

### Folder: Customer Management
- GET `/api/customer/profile`
- PUT `/api/customer/profile`
- GET `/api/customer/visits`
- GET `/api/customer/points`
- GET `/api/customer/redemptions`

### Folder: Visit Management
- POST `/api/visits`
- GET `/api/visits`
- GET `/api/visits/{visitId}`
- PUT `/api/visits/{visitId}`
- DELETE `/api/visits/{visitId}`

### Folder: Reward Management
- POST `/api/rewards`
- GET `/api/rewards`
- GET `/api/rewards/{rewardId}`
- PUT `/api/rewards/{rewardId}`
- DELETE `/api/rewards/{rewardId}`
- POST `/api/rewards/redeem`
- GET `/api/rewards/redemptions`
- GET `/api/rewards/verify/{code}`

---

## Security Features

- JWT-based authentication with secure cookies
- Phone number verification with OTP
- Password hashing with bcrypt (salt rounds: 12)
- Input validation and sanitization
- Rate limiting for OTP requests (1-minute cooldown)
- CORS configuration
- Environment-based configuration
- Secure cookie settings (httpOnly, secure in production)

---

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check MONGODB_URI in .env file
   - Verify database permissions

2. **Authentication Errors**
   - Check JWT_SECRET in .env file
   - Verify token format in Authorization header
   - Ensure token hasn't expired

3. **Phone Number Validation Errors**
   - Use international format (+254...)
   - Supported countries: US, UK, Kenya, Nigeria, South Africa, etc.

4. **OTP Issues**
   - Check console logs in development mode
   - Verify OTP hasn't expired (5 minutes default)
   - Maximum 3 attempts per OTP

### Environment Variables

Ensure all required environment variables are set in `.env`:
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/loyalty_program
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
JWT_EXPIRE=7d
OTP_EXPIRE_MINUTES=5
OTP_LENGTH=6
DEFAULT_POINTS_PER_VISIT=10
DEFAULT_REDEMPTION_THRESHOLD=100
```

---

## License

This project is licensed under the ISC License.

---

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review the API documentation
3. Test with the provided Postman examples
4. Check console logs for detailed error messages
