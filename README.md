# Green Candle Token (GCT) Backend | بک‌اند توکن گرین کندل

[🇺🇸 English](#english) | [🇮🇷 فارسی](#persian)

---

## English

A secure and scalable backend API for the Green Candle Token platform, built with Express.js and MongoDB. This backend supports token claim management, Merkle tree distribution, admin panel, and BSC blockchain integration.

## 🚀 Features

### Core Features
- **Secure User Authentication** - Wallet-based authentication with signature verification
- **Admin Management System** - Role-based access control with 2FA support
- **Token Claim System** - Self-claim and admin-claim functionality
- **Merkle Tree Distribution** - Efficient token distribution with cryptographic proofs
- **Blockchain Integration** - BSC network integration for smart contract interaction
- **Rate Limiting** - Protection against abuse and DDoS attacks
- **Comprehensive Logging** - Security and audit trail logging
- **Input Validation** - XSS and injection attack prevention

### Security Features
- JWT-based authentication
- Rate limiting and throttling
- CORS protection
- Helmet security headers
- Input sanitization and validation
- Session management
- Two-factor authentication for admins
- Secure password hashing
- IP tracking and monitoring

### API Endpoints
- **Authentication** - `/api/v1/auth/*`
- **User Management** - `/api/v1/user/*`
- **Admin Panel** - `/api/v1/admin/*`
- **Claim Operations** - `/api/v1/claim/*`
- **Blockchain** - `/api/v1/blockchain/*`

## 📋 Prerequisites

- **Node.js** >= 18.0.0
- **MongoDB** >= 4.4
- **npm** or **yarn**

## 🛠️ Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd GTC-backend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Configuration
Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` file with your configuration:

```env
# Server Configuration
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Database
MONGODB_URI=mongodb://localhost:27017/GTC-backend

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
SESSION_SECRET=your-super-secret-session-key-change-this-in-production
BCRYPT_ROUNDS=12

# Admin Configuration
ADMIN_EMAIL=admin@GTC-token.com
ADMIN_DEFAULT_PASSWORD=Admin123!@#

# Blockchain Configuration
BSC_RPC_URL=https://bsc-dataseed.binance.org/
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
NETWORK=testnet
CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
PRIVATE_KEY=your-private-key-for-admin-transactions

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CLAIM_RATE_LIMIT_WINDOW_MS=3600000
CLAIM_RATE_LIMIT_MAX_REQUESTS=10

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### 4. Database Setup
Make sure MongoDB is running, then create the default admin user:

```bash
node src/scripts/createDefaultAdmin.js
```

### 5. Start the server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT).

## 📚 API Documentation

### Authentication

#### Get Authentication Message
```http
GET /api/v1/auth/message/:walletAddress
```

Returns a message for wallet signature authentication.

#### Wallet Authentication
```http
POST /api/v1/auth/wallet
Content-Type: application/json

{
  "walletAddress": "0x742d35Cc6634C0532925a3b8D23a40b83d8FA16F",
  "signature": "0x...",
  "message": "Welcome to GTC Token Platform!..."
}
```

#### Admin Login
```http
POST /api/v1/auth/admin/login
Content-Type: application/json

{
  "email": "admin@GTC-token.com",
  "password": "Admin123!@#",
  "twoFactorCode": "123456"
}
```

### User Operations

#### Get User Profile
```http
GET /api/v1/user/profile
Authorization: Bearer <jwt_token>
```

#### Get Claim History
```http
GET /api/v1/user/claims?page=1&limit=10
Authorization: Bearer <jwt_token>
```

#### Check Eligibility
```http
GET /api/v1/user/eligibility
Authorization: Bearer <jwt_token>
```

### Claim Operations

#### Self Claim
```http
POST /api/v1/claim/self
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "walletAddress": "0x742d35Cc6634C0532925a3b8D23a40b83d8FA16F",
  "amount": "1000000000000000000",
  "signature": "0x...",
  "message": "..."
}
```

#### Admin Claim
```http
POST /api/v1/claim/admin
Content-Type: application/json
Authorization: Bearer <admin_jwt_token>

{
  "walletAddress": "0x742d35Cc6634C0532925a3b8D23a40b83d8FA16F",
  "amount": "1000000000000000000",
  "adminNote": "Manual distribution for presale participant"
}
```

### Admin Operations

#### Dashboard Statistics
```http
GET /api/v1/admin/dashboard
Authorization: Bearer <admin_jwt_token>
```

#### User Management
```http
GET /api/v1/admin/users?page=1&limit=20&search=0x742d
Authorization: Bearer <admin_jwt_token>
```

#### Create Merkle Tree
```http
POST /api/v1/admin/merkle-trees
Content-Type: application/json
Authorization: Bearer <admin_jwt_token>

{
  "name": "Phase 1 Distribution",
  "description": "Initial token distribution for early supporters",
  "data": [
    {
      "walletAddress": "0x742d35Cc6634C0532925a3b8D23a40b83d8FA16F",
      "amount": "1000000000000000000"
    }
  ]
}
```

### Blockchain Operations

#### Get Network Info
```http
GET /api/v1/blockchain/network
```

#### Get Wallet Balance
```http
GET /api/v1/blockchain/balance/0x742d35Cc6634C0532925a3b8D23a40b83d8FA16F
```

#### Process Pending Claims (Admin Only)
```http
POST /api/v1/blockchain/process-claims
Authorization: Bearer <admin_jwt_token>
```

## 🔧 Scripts

### Create Default Admin
```bash
node src/scripts/createDefaultAdmin.js
```

### Import Merkle Tree from CSV/JSON
```bash
node src/scripts/importMerkleTree.js allocations.csv "Phase 1" "Description" admin@GTC-token.com
```

**CSV Format:**
```csv
walletAddress,amount
0x742d35Cc6634C0532925a3b8D23a40b83d8FA16F,1000000000000000000
0x8ba1f109551bD432803012645Hac136c22C12345,2000000000000000000
```

**JSON Format:**
```json
[
  {
    "walletAddress": "0x742d35Cc6634C0532925a3b8D23a40b83d8FA16F",
    "amount": "1000000000000000000"
  }
]
```

## 🔒 Security

### Rate Limiting
- **API Endpoints**: 100 requests per 15 minutes per IP
- **Authentication**: 5 attempts per 15 minutes per IP
- **Claims**: 10 claims per hour per IP, 1 claim per 24 hours per user

### Authentication
- **Users**: Wallet signature-based authentication
- **Admins**: Email/password + optional 2FA

### Data Protection
- All sensitive data is encrypted
- No private keys stored on server
- Secure session management
- Input validation and sanitization
- HTTPS enforced in production

## 🌐 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
PORT=443
MONGODB_URI=mongodb://your-production-db/GTC-backend
JWT_SECRET=your-production-secret
SSL_KEY_PATH=/path/to/ssl/private.key
SSL_CERT_PATH=/path/to/ssl/certificate.crt
```

### Docker Deployment (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src ./src
EXPOSE 3000
CMD ["npm", "start"]
```

### Production Checklist
- [ ] Change default admin password
- [ ] Enable 2FA for all admin accounts
- [ ] Configure proper MongoDB connection with authentication
- [ ] Set up SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
- [ ] Set strong JWT secrets
- [ ] Configure proper CORS origins
- [ ] Set up rate limiting
- [ ] Configure environment variables
- [ ] Test all endpoints
- [ ] Set up error monitoring (e.g., Sentry)

## 📊 Monitoring

### Health Check
```http
GET /health
```

### Logs
Logs are stored in the `logs/` directory:
- `error.log` - Error level logs
- `combined.log` - All logs

### Log Categories
- **Security**: Authentication, authorization, suspicious activities
- **Admin**: Administrative actions
- **Claim**: Token claim operations
- **Blockchain**: Smart contract interactions
- **Audit**: All significant operations

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Linting
```bash
npm run lint
npm run lint:fix
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run linting and tests
6. Submit a pull request

## 📝 API Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": [
    // Validation errors if applicable
  ]
}
```

### Pagination Response
```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5
    }
  }
}
```

## 🔗 Related Documentation

- [Smart Contract Documentation](./docs/smart-contract.md)
- [API Reference](./docs/api-reference.md)
- [Security Guidelines](./docs/security.md)
- [Deployment Guide](./docs/deployment.md)

## ⚠️ Important Notes

1. **Never store private keys on the server** - The backend only manages proofs and metadata
2. **Change default passwords** - Always change default admin credentials in production
3. **Enable 2FA** - Two-factor authentication is strongly recommended for admin accounts
4. **Regular backups** - Implement regular database backups
5. **Monitor logs** - Regularly check logs for suspicious activities
6. **Update dependencies** - Keep all dependencies updated for security

## 📞 Support

For technical support or questions:
- Email: support@GTC-token.com
- Documentation: [Link to docs]
- Issues: [GitHub Issues]

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Persian

# بک‌اند توکن گرین کندل (GCT)

یک API بک‌اند امن و مقیاس‌پذیر برای پلتفرم توکن گرین کندل که با Express.js و MongoDB ساخته شده است. این بک‌اند از مدیریت claim توکن، توزیع Merkle tree، پنل ادمین و یکپارچگی با بلاک‌چین BSC پشتیبانی می‌کند.

## 🚀 ویژگی‌ها

### ویژگی‌های اصلی
- **احراز هویت امن کاربران** - احراز هویت مبتنی بر کیف پول با تأیید امضا
- **سیستم مدیریت ادمین** - کنترل دسترسی مبتنی بر نقش با پشتیبانی 2FA
- **سیستم Claim توکن** - قابلیت خود-claim و ادمین-claim
- **توزیع Merkle Tree** - توزیع کارآمد توکن با اثبات‌های رمزنگاری
- **یکپارچگی بلاک‌چین** - یکپارچگی شبکه BSC برای تعامل با قرارداد هوشمند
- **محدودیت نرخ** - محافظت در برابر سوءاستفاده و حملات DDoS
- **ثبت وقایع جامع** - ثبت امنیت و مسیر حسابرسی
- **اعتبارسنجی ورودی** - جلوگیری از حملات XSS و injection

### ویژگی‌های امنیتی
- احراز هویت مبتنی بر JWT
- محدودیت نرخ و throttling
- محافظت CORS
- هدرهای امنیتی Helmet
- پاکسازی و اعتبارسنجی ورودی
- مدیریت جلسه
- احراز هویت دو مرحله‌ای برای ادمین‌ها
- هش امن رمز عبور
- ردیابی و نظارت IP

### نقاط پایانی API
- **احراز هویت** - `/api/v1/auth/*`
- **مدیریت کاربر** - `/api/v1/user/*`
- **پنل ادمین** - `/api/v1/admin/*`
- **عملیات Claim** - `/api/v1/claim/*`
- **بلاک‌چین** - `/api/v1/blockchain/*`

## 📋 پیش‌نیازها

- **Node.js** >= 18.0.0
- **MongoDB** >= 4.4
- **npm** یا **yarn**

## 🛠️ نصب

### 1. کلون کردن مخزن
```bash
git clone <repository-url>
cd gct-backend
```

### 2. نصب وابستگی‌ها
```bash
npm install
```

### 3. پیکربندی محیط
فایل نمونه محیط را کپی کرده و تنظیمات خود را پیکربندی کنید:

```bash
cp .env.example .env
```

فایل `.env` را با پیکربندی خود ویرایش کنید:

```env
# پیکربندی سرور
NODE_ENV=development
PORT=3000
API_VERSION=v1

# پایگاه داده
MONGODB_URI=mongodb://localhost:27017/gct-backend

# امنیت
JWT_SECRET=کلید-فوق-محرمانه-jwt-خود-را-در-تولید-تغییر-دهید
SESSION_SECRET=کلید-فوق-محرمانه-جلسه-خود-را-در-تولید-تغییر-دهید
BCRYPT_ROUNDS=12

# پیکربندی ادمین
ADMIN_EMAIL=admin@gct-token.com
ADMIN_DEFAULT_PASSWORD=Admin123!@#

# پیکربندی بلاک‌چین
BSC_RPC_URL=https://bsc-dataseed.binance.org/
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
NETWORK=testnet
CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
PRIVATE_KEY=کلید-خصوصی-شما-برای-تراکنش‌های-ادمین

# محدودیت نرخ
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CLAIM_RATE_LIMIT_WINDOW_MS=3600000
CLAIM_RATE_LIMIT_MAX_REQUESTS=10

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### 4. راه‌اندازی پایگاه داده
مطمئن شوید که MongoDB در حال اجرا است، سپس کاربر ادمین پیش‌فرض را ایجاد کنید:

```bash
node src/scripts/createDefaultAdmin.js
```

### 5. شروع سرور

**توسعه:**
```bash
npm run dev
```

**تولید:**
```bash
npm start
```

سرور روی `http://localhost:3000` (یا PORT پیکربندی شده شما) شروع خواهد شد.

## 📚 مستندات API

### احراز هویت

#### دریافت پیام احراز هویت
```http
GET /api/v1/auth/message/:walletAddress
```

پیامی برای احراز هویت امضای کیف پول بازمی‌گرداند.

#### احراز هویت کیف پول
```http
POST /api/v1/auth/wallet
Content-Type: application/json

{
  "walletAddress": "0x742d35Cc6634C0532925a3b8D23a40b83d8FA16F",
  "signature": "0x...",
  "message": "خوش آمدید به پلتفرم توکن GCT!..."
}
```

#### ورود ادمین
```http
POST /api/v1/auth/admin/login
Content-Type: application/json

{
  "email": "admin@gct-token.com",
  "password": "Admin123!@#",
  "twoFactorCode": "123456"
}
```

## 🔧 اسکریپت‌ها

### ایجاد ادمین پیش‌فرض
```bash
node src/scripts/createDefaultAdmin.js
```

### وارد کردن Merkle Tree از CSV/JSON
```bash
node src/scripts/importMerkleTree.js allocations.csv "فاز 1" "توضیحات" admin@gct-token.com
```

**فرمت CSV:**
```csv
walletAddress,amount
0x742d35Cc6634C0532925a3b8D23a40b83d8FA16F,1000000000000000000
0x8ba1f109551bD432803012645Hac136c22C12345,2000000000000000000
```

## 🔒 امنیت

### محدودیت نرخ
- **نقاط پایانی API**: 100 درخواست در 15 دقیقه به ازای هر IP
- **احراز هویت**: 5 تلاش در 15 دقیقه به ازای هر IP
- **Claims**: 10 claim در ساعت به ازای هر IP، 1 claim در 24 ساعت به ازای هر کاربر

### احراز هویت
- **کاربران**: احراز هویت مبتنی بر امضای کیف پول
- **ادمین‌ها**: ایمیل/رمز عبور + 2FA اختیاری

### محافظت داده‌ها
- تمام داده‌های حساس رمزنگاری شده‌اند
- هیچ کلید خصوصی روی سرور ذخیره نمی‌شود
- مدیریت امن جلسه
- اعتبارسنجی و پاکسازی ورودی
- HTTPS اجباری در تولید

## 🌐 استقرار

### متغیرهای محیط برای تولید
```env
NODE_ENV=production
PORT=443
MONGODB_URI=mongodb://your-production-db/gct-backend
JWT_SECRET=رمز-تولید-شما
SSL_KEY_PATH=/path/to/ssl/private.key
SSL_CERT_PATH=/path/to/ssl/certificate.crt
```

### چک‌لیست تولید
- [ ] تغییر رمز عبور ادمین پیش‌فرض
- [ ] فعال‌سازی 2FA برای تمام حساب‌های ادمین
- [ ] پیکربندی اتصال مناسب MongoDB با احراز هویت
- [ ] تنظیم گواهینامه‌های SSL/TLS
- [ ] پیکربندی قوانین فایروال
- [ ] راه‌اندازی نظارت و ثبت وقایع
- [ ] پیکربندی استراتژی پشتیبان‌گیری
- [ ] تنظیم رمزهای قوی JWT
- [ ] پیکربندی منابع مناسب CORS
- [ ] راه‌اندازی محدودیت نرخ
- [ ] پیکربندی متغیرهای محیط
- [ ] تست تمام نقاط پایانی
- [ ] راه‌اندازی نظارت خطا

## 📊 نظارت

### بررسی سلامت
```http
GET /health
```

### وقایع
وقایع در دایرکتوری `logs/` ذخیره می‌شوند:
- `error.log` - وقایع سطح خطا
- `combined.log` - تمام وقایع

### دسته‌بندی وقایع
- **امنیت**: احراز هویت، مجوز، فعالیت‌های مشکوک
- **ادمین**: اقدامات اداری
- **Claim**: عملیات claim توکن
- **بلاک‌چین**: تعاملات قرارداد هوشمند
- **حسابرسی**: تمام عملیات مهم

## 🧪 تست

### اجرای تست‌ها
```bash
npm test
```

### اجرای تست‌ها در حالت نظارت
```bash
npm run test:watch
```

### Linting
```bash
npm run lint
npm run lint:fix
```

## 🤝 مشارکت

1. مخزن را fork کنید
2. یک شاخه ویژگی ایجاد کنید
3. تغییرات خود را اعمال کنید
4. تست‌هایی برای قابلیت جدید اضافه کنید
5. linting و تست‌ها را اجرا کنید
6. درخواست pull ارسال کنید

## 📝 فرمت پاسخ API

### پاسخ موفقیت‌آمیز
```json
{
  "success": true,
  "data": {
    // داده‌های پاسخ
  }
}
```

### پاسخ خطا
```json
{
  "success": false,
  "error": "پیام خطا",
  "details": [
    // خطاهای اعتبارسنجی در صورت وجود
  ]
}
```

## 🔗 مستندات مرتبط

- [مستندات قرارداد هوشمند](./docs/smart-contract.md)
- [مرجع API](./docs/API.md)
- [راهنمای امنیت](./docs/security.md)
- [راهنمای استقرار](./docs/DEPLOYMENT.md)

## ⚠️ نکات مهم

1. **هرگز کلیدهای خصوصی را روی سرور ذخیره نکنید** - بک‌اند فقط proof ها و metadata را مدیریت می‌کند
2. **رمزهای عبور پیش‌فرض را تغییر دهید** - همیشه اعتبارنامه‌های ادمین پیش‌فرض را در تولید تغییر دهید
3. **2FA را فعال کنید** - احراز هویت دو مرحله‌ای برای حساب‌های ادمین به شدت توصیه می‌شود
4. **پشتیبان‌گیری منظم** - پشتیبان‌گیری منظم از پایگاه داده را پیاده‌سازی کنید
5. **نظارت بر وقایع** - به طور منظم وقایع را برای فعالیت‌های مشکوک بررسی کنید
6. **به‌روزرسانی وابستگی‌ها** - تمام وابستگی‌ها را برای امنیت به‌روز نگه دارید

## 📞 پشتیبانی

برای پشتیبانی فنی یا سؤالات:
- ایمیل: support@gct-token.com
- مستندات: [لینک به مستندات]
- مسائل: [GitHub Issues]

## 📄 مجوز

این پروژه تحت مجوز MIT منتشر شده است - فایل [LICENSE](LICENSE) را برای جزئیات مشاهده کنید.

---

**⚠️ اطلاعیه امنیتی**: این بک‌اند عملیات مالی را مدیریت می‌کند. همیشه بهترین شیوه‌های امنیتی را دنبال کنید، تست کامل انجام دهید و قبل از استقرار در تولید، حسابرسی امنیتی حرفه‌ای را در نظر بگیرید.