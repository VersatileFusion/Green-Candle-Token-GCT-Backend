# Green Candle Token (GCT) Backend | بک‌اند توکن شمع سبز (GCT)

<div align="center">

![GCT Logo](https://via.placeholder.com/200x100/00ff00/ffffff?text=GCT)

**A secure and scalable backend API for the Green Candle Token platform**  
**یک API بک‌اند امن و مقیاس‌پذیر برای پلتفرم توکن شمع سبز**

[![Node.js](https://img.shields.io/badge/Node.js-18.0.0+-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.18.2-blue.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4.4+-green.svg)](https://mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## 📋 Table of Contents | فهرست مطالب

### English Section
- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [API Documentation](#api-documentation)
- [Security](#security)
- [Deployment](#deployment)
- [Technology Stack](#technology-stack)
- [Contributing](#contributing)
- [Support](#support)

### بخش فارسی
- [نمای کلی](#نمای-کلی)
- [ویژگی‌ها](#ویژگی‌ها)
- [پیش‌نیازها](#پیش‌نیازها)
- [نصب و راه‌اندازی](#نصب-و-راه-اندازی)
- [مستندات API](#مستندات-api)
- [امنیت](#امنیت)
- [استقرار](#استقرار)
- [پشته فناوری](#پشته-فناوری)
- [مشارکت](#مشارکت)
- [پشتیبانی](#پشتیبانی)

---

## Overview | نمای کلی

**English:**  
A comprehensive backend API built with Express.js and MongoDB for the Green Candle Token (GCT) platform. This backend supports token claim management, Merkle tree distribution, admin panel, BSC blockchain integration, and real-time price tracking from multiple sources with advanced caching and performance optimization.

**فارسی:**  
یک API بک‌اند جامع ساخته شده با Express.js و MongoDB برای پلتفرم توکن شمع سبز (GCT). این بک‌اند مدیریت ادعای توکن، توزیع درخت مرکل، پنل مدیریت، ادغام بلاک‌چین BSC و ردیابی قیمت بلادرنگ از منابع متعدد با کش پیشرفته و بهینه‌سازی عملکرد را پشتیبانی می‌کند.

---

## 🚀 Features | ویژگی‌ها

### Core Features | ویژگی‌های اصلی

| English | فارسی |
|---------|--------|
| **Secure User Authentication** - Wallet-based authentication with signature verification | **احراز هویت امن کاربر** - احراز هویت مبتنی بر کیف پول با تأیید امضا |
| **Admin Management System** - Role-based access control with 2FA support | **سیستم مدیریت ادمین** - کنترل دسترسی مبتنی بر نقش با پشتیبانی از احراز هویت دو مرحله‌ای |
| **Token Claim System** - Self-claim and admin-claim functionality | **سیستم ادعای توکن** - عملکرد ادعای خودکار و ادعای ادمین |
| **Merkle Tree Distribution** - Efficient token distribution with cryptographic proofs | **توزیع درخت مرکل** - توزیع کارآمد توکن با اثبات‌های رمزنگاری |
| **Blockchain Integration** - BSC network integration for smart contract interaction | **ادغام بلاک‌چین** - ادغام شبکه BSC برای تعامل قرارداد هوشمند |
| **Real-time Price Tracking** - Multi-source price aggregation from CoinGecko, CoinMarketCap, PancakeSwap, and Binance | **ردیابی قیمت بلادرنگ** - تجمیع قیمت چندمنبعه از CoinGecko، CoinMarketCap، PancakeSwap و Binance |
| **Advanced Caching System** - Intelligent caching with TTL and memory management | **سیستم کش پیشرفته** - کش هوشمند با TTL و مدیریت حافظه |
| **Rate Limiting** - Protection against abuse and DDoS attacks | **محدودیت نرخ** - محافظت در برابر سوءاستفاده و حملات DDoS |
| **Comprehensive Logging** - Security and audit trail logging | **ثبت‌نام جامع** - ثبت‌نام امنیت و رد ممیزی |
| **Input Validation** - XSS and injection attack prevention | **اعتبارسنجی ورودی** - پیشگیری از حملات XSS و تزریق |

### Security Features | ویژگی‌های امنیتی

| English | فارسی |
|---------|--------|
| JWT-based authentication | احراز هویت مبتنی بر JWT |
| Rate limiting and throttling | محدودیت نرخ و تنظیم سرعت |
| CORS protection | محافظت CORS |
| Helmet security headers | هدرهای امنیتی Helmet |
| Input sanitization and validation | پاکسازی و اعتبارسنجی ورودی |
| Session management | مدیریت جلسه |
| Two-factor authentication for admins | احراز هویت دو مرحله‌ای برای ادمین‌ها |
| Secure password hashing | هش کردن امن رمز عبور |
| IP tracking and monitoring | ردیابی و نظارت IP |

### API Endpoints | نقاط پایانی API

| Endpoint | Description | توضیحات |
|----------|-------------|---------|
| `/api/v1/auth/*` | Authentication | احراز هویت |
| `/api/v1/user/*` | User Management | مدیریت کاربر |
| `/api/v1/admin/*` | Admin Panel | پنل مدیریت |
| `/api/v1/claim/*` | Claim Operations | عملیات ادعا |
| `/api/v1/blockchain/*` | Blockchain Integration | ادغام بلاک‌چین |
| `/api/v1/price/*` | Price Tracking | ردیابی قیمت |
| `/api/v1/staking/*` | Staking Operations | عملیات استیکینگ |
| `/api/v1/blog/*` | Blog Management | مدیریت وبلاگ |
| `/api/v1/help/*` | Help System | سیستم راهنما |
| `/api/v1/activity/*` | Activity Tracking | ردیابی فعالیت |

---

## 📋 Prerequisites | پیش‌نیازها

### English
- **Node.js** >= 18.0.0
- **MongoDB** >= 4.4
- **npm** or **yarn**
- **Git** for version control

### فارسی
- **Node.js** >= 18.0.0
- **MongoDB** >= 4.4
- **npm** یا **yarn**
- **Git** برای کنترل نسخه

---

## 🛠️ Installation | نصب و راه‌اندازی

### 1. Clone the repository | کلون کردن مخزن

```bash
# English
git clone <repository-url>
cd GTC-backend

# فارسی
git clone <repository-url>
cd GTC-backend
```

### 2. Install dependencies | نصب وابستگی‌ها

```bash
# English
npm install

# فارسی
npm install
```

### 3. Environment Configuration | پیکربندی محیط

Copy the example environment file and configure your settings:

```bash
# English
cp .env.example .env

# فارسی
cp .env.example .env
```

Edit `.env` file with your configuration:

```env
# Server Configuration | پیکربندی سرور
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Database | پایگاه داده
MONGODB_URI=mongodb://localhost:27017/GTC-backend

# Security | امنیت
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
SESSION_SECRET=your-super-secret-session-key-change-this-in-production
BCRYPT_ROUNDS=12

# Admin Configuration | پیکربندی ادمین
ADMIN_EMAIL=admin@GTC-token.com
ADMIN_DEFAULT_PASSWORD=Admin123!@#

# Blockchain Configuration | پیکربندی بلاک‌چین
BSC_RPC_URL=https://bsc-dataseed.binance.org/
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
NETWORK=testnet
CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
PRIVATE_KEY=your-private-key-for-admin-transactions

# Rate Limiting | محدودیت نرخ
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CLAIM_RATE_LIMIT_WINDOW_MS=3600000
CLAIM_RATE_LIMIT_MAX_REQUESTS=10

# CORS | CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Price Service Configuration | پیکربندی سرویس قیمت
COINGECKO_API_KEY=your-coingecko-api-key-optional
COINMARKETCAP_API_KEY=your-coinmarketcap-api-key-optional
PRICE_CACHE_TTL=60000
PRICE_CACHE_MAX_SIZE=1000
```

### 4. Database Setup | راه‌اندازی پایگاه داده

Make sure MongoDB is running, then create the default admin user:

```bash
# English
node src/scripts/createDefaultAdmin.js

# فارسی
node src/scripts/createDefaultAdmin.js
```

### 5. Start the server | شروع سرور

**Development | توسعه:**
```bash
# English
npm run dev

# فارسی
npm run dev
```

**Production | تولید:**
```bash
# English
npm start

# فارسی
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT).

---

## 📚 API Documentation | مستندات API

### Authentication | احراز هویت

#### Get Authentication Message | دریافت پیام احراز هویت

```http
GET /api/v1/auth/message/:walletAddress
```

**English:** Returns a message for wallet signature authentication.  
**فارسی:** پیامی برای احراز هویت امضای کیف پول برمی‌گرداند.

#### Wallet Authentication | احراز هویت کیف پول

```http
POST /api/v1/auth/wallet
Content-Type: application/json

{
  "walletAddress": "0x742d35Cc6634C0532925a3b8D23a40b83d8FA16F",
  "signature": "0x...",
  "message": "Welcome to GTC Token Platform!..."
}
```

#### Admin Login | ورود ادمین

```http
POST /api/v1/auth/admin/login
Content-Type: application/json

{
  "email": "admin@GTC-token.com",
  "password": "Admin123!@#",
  "twoFactorCode": "123456"
}
```

### User Operations | عملیات کاربر

#### Get User Profile | دریافت پروفایل کاربر

```http
GET /api/v1/user/profile
Authorization: Bearer <jwt_token>
```

#### Get Claim History | دریافت تاریخچه ادعا

```http
GET /api/v1/user/claims?page=1&limit=10
Authorization: Bearer <jwt_token>
```

#### Check Eligibility | بررسی واجد شرایط بودن

```http
GET /api/v1/user/eligibility
Authorization: Bearer <jwt_token>
```

### Claim Operations | عملیات ادعا

#### Self Claim | ادعای خودکار

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

#### Admin Claim | ادعای ادمین

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

### Price Operations | عملیات قیمت

#### Get Current Token Price | دریافت قیمت فعلی توکن

```http
GET /api/v1/price/current/:address?
```

**English:** Returns real-time token price from multiple sources with caching.  
**فارسی:** قیمت بلادرنگ توکن از منابع متعدد با کش برمی‌گرداند.

#### Get Historical Prices | دریافت قیمت‌های تاریخی

```http
GET /api/v1/price/historical/:address?days=7
```

**English:** Get historical price data for specified number of days (1-365).  
**فارسی:** داده‌های قیمت تاریخی برای تعداد روزهای مشخص شده (1-365) دریافت کنید.

#### Get Price Comparison | دریافت مقایسه قیمت

```http
GET /api/v1/price/comparison/:address?
```

**English:** Compare prices across different sources (CoinGecko, CoinMarketCap, PancakeSwap, Binance).  
**فارسی:** قیمت‌ها را در منابع مختلف مقایسه کنید (CoinGecko، CoinMarketCap، PancakeSwap، Binance).

---

## 🔧 Scripts | اسکریپت‌ها

### Create Default Admin | ایجاد ادمین پیش‌فرض

```bash
# English
node src/scripts/createDefaultAdmin.js

# فارسی
node src/scripts/createDefaultAdmin.js
```

### Import Merkle Tree from CSV/JSON | وارد کردن درخت مرکل از CSV/JSON

```bash
# English
node src/scripts/importMerkleTree.js allocations.csv "Phase 1" "Description" admin@GTC-token.com

# فارسی
node src/scripts/importMerkleTree.js allocations.csv "Phase 1" "Description" admin@GTC-token.com
```

**CSV Format | فرمت CSV:**
```csv
walletAddress,amount
0x742d35Cc6634C0532925a3b8D23a40b83d8FA16F,1000000000000000000
0x8ba1f109551bD432803012645Hac136c22C12345,2000000000000000000
```

**JSON Format | فرمت JSON:**
```json
[
  {
    "walletAddress": "0x742d35Cc6634C0532925a3b8D23a40b83d8FA16F",
    "amount": "1000000000000000000"
  }
]
```

---

## 🔒 Security | امنیت

### Rate Limiting | محدودیت نرخ

| Endpoint | Limit | توضیحات |
|----------|-------|---------|
| **API Endpoints** | 100 requests per 15 minutes per IP | 100 درخواست در هر 15 دقیقه برای هر IP |
| **Authentication** | 5 attempts per 15 minutes per IP | 5 تلاش در هر 15 دقیقه برای هر IP |
| **Claims** | 10 claims per hour per IP, 1 claim per 24 hours per user | 10 ادعا در ساعت برای هر IP، 1 ادعا در 24 ساعت برای هر کاربر |

### Authentication | احراز هویت

| Type | Method | روش |
|------|--------|-----|
| **Users** | Wallet signature-based authentication | احراز هویت مبتنی بر امضای کیف پول |
| **Admins** | Email/password + optional 2FA | ایمیل/رمز عبور + احراز هویت دو مرحله‌ای اختیاری |

### Data Protection | محافظت از داده

| Feature | Description | توضیحات |
|---------|-------------|---------|
| All sensitive data is encrypted | تمام داده‌های حساس رمزنگاری شده‌اند |
| No private keys stored on server | هیچ کلید خصوصی روی سرور ذخیره نمی‌شود |
| Secure session management | مدیریت جلسه امن |
| Input validation and sanitization | اعتبارسنجی و پاکسازی ورودی |
| HTTPS enforced in production | HTTPS در تولید اجباری |

---

## 🌐 Deployment | استقرار

### Environment Variables for Production | متغیرهای محیط برای تولید

```env
NODE_ENV=production
PORT=443
MONGODB_URI=mongodb://your-production-db/GTC-backend
JWT_SECRET=your-production-secret
SSL_KEY_PATH=/path/to/ssl/private.key
SSL_CERT_PATH=/path/to/ssl/certificate.crt
```

### Docker Deployment (Optional) | استقرار Docker (اختیاری)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src ./src
EXPOSE 3000
CMD ["npm", "start"]
```

### Production Checklist | چک‌لیست تولید

- [ ] **English:** Change default admin password | **فارسی:** تغییر رمز عبور پیش‌فرض ادمین
- [ ] **English:** Enable 2FA for all admin accounts | **فارسی:** فعال کردن احراز هویت دو مرحله‌ای برای تمام حساب‌های ادمین
- [ ] **English:** Configure proper MongoDB connection with authentication | **فارسی:** پیکربندی اتصال مناسب MongoDB با احراز هویت
- [ ] **English:** Set up SSL/TLS certificates | **فارسی:** راه‌اندازی گواهی‌های SSL/TLS
- [ ] **English:** Configure firewall rules | **فارسی:** پیکربندی قوانین فایروال
- [ ] **English:** Set up monitoring and logging | **فارسی:** راه‌اندازی نظارت و ثبت‌نام
- [ ] **English:** Configure backup strategy | **فارسی:** پیکربندی استراتژی پشتیبان‌گیری
- [ ] **English:** Set strong JWT secrets | **فارسی:** تنظیم اسرار JWT قوی
- [ ] **English:** Configure proper CORS origins | **فارسی:** پیکربندی منابع CORS مناسب
- [ ] **English:** Set up rate limiting | **فارسی:** راه‌اندازی محدودیت نرخ
- [ ] **English:** Configure environment variables | **فارسی:** پیکربندی متغیرهای محیط
- [ ] **English:** Test all endpoints | **فارسی:** تست تمام نقاط پایانی
- [ ] **English:** Set up error monitoring (e.g., Sentry) | **فارسی:** راه‌اندازی نظارت خطا (مثل Sentry)

---

## 💰 Price Service & Caching | سرویس قیمت و کش

### Price Sources | منابع قیمت

The backend integrates with multiple price sources for accurate and reliable token pricing:

| Source | Priority | Features | ویژگی‌ها |
|--------|----------|----------|----------|
| **CoinGecko** | 1 | Free tier available, comprehensive historical data | سطح رایگان موجود، داده‌های تاریخی جامع |
| **CoinMarketCap** | 2 | Professional data, requires API key | داده‌های حرفه‌ای، نیاز به کلید API |
| **PancakeSwap** | 3 | DEX pricing, real-time data | قیمت‌گذاری DEX، داده‌های بلادرنگ |
| **Binance** | 4 | Exchange pricing, high reliability | قیمت‌گذاری صرافی، قابلیت اطمینان بالا |

### Caching System | سیستم کش

Advanced caching system with intelligent memory management:

| Cache Type | TTL | Description | توضیحات |
|------------|-----|-------------|---------|
| **Current Price Cache** | 1 minute | Real-time data | داده‌های بلادرنگ |
| **Historical Data Cache** | 10 minutes | Historical data | داده‌های تاریخی |
| **Price Comparison Cache** | 5 minutes | Cross-source comparisons | مقایسه‌های چندمنبعه |
| **Memory Management** | - | Automatic cleanup and eviction policies | پاکسازی خودکار و سیاست‌های حذف |

### Price Service Features | ویژگی‌های سرویس قیمت

| Feature | Description | توضیحات |
|---------|-------------|---------|
| **Multi-source Aggregation** | Combines data from multiple sources for accuracy | ترکیب داده‌ها از منابع متعدد برای دقت |
| **Fallback Mechanism** | Graceful degradation when sources fail | تخریب تدریجی هنگام شکست منابع |
| **Rate Limit Protection** | Built-in rate limiting for external API calls | محدودیت نرخ داخلی برای فراخوانی‌های API خارجی |
| **Data Validation** | Comprehensive validation of price data integrity | اعتبارسنجی جامع یکپارچگی داده‌های قیمت |
| **Real-time Updates** | Live price tracking with configurable refresh intervals | ردیابی قیمت زنده با فواصل تازه‌سازی قابل تنظیم |

---

## 📊 Monitoring | نظارت

### Health Check | بررسی سلامت

```http
GET /health
```

### Logs | ثبت‌نام‌ها

Logs are stored in the `logs/` directory:

| Log File | Description | توضیحات |
|----------|-------------|---------|
| `error.log` | Error level logs | ثبت‌نام‌های سطح خطا |
| `combined.log` | All logs | تمام ثبت‌نام‌ها |

### Log Categories | دسته‌بندی ثبت‌نام‌ها

| Category | Description | توضیحات |
|----------|-------------|---------|
| **Security** | Authentication, authorization, suspicious activities | احراز هویت، مجوز، فعالیت‌های مشکوک |
| **Admin** | Administrative actions | اقدامات مدیریتی |
| **Claim** | Token claim operations | عملیات ادعای توکن |
| **Blockchain** | Smart contract interactions | تعاملات قرارداد هوشمند |
| **Price** | Price service operations, cache hits/misses, source failures | عملیات سرویس قیمت، ضربه/خطای کش، شکست منابع |
| **Audit** | All significant operations | تمام عملیات مهم |

---

## 🧪 Testing | تست

### Run Tests | اجرای تست‌ها

```bash
# English
npm test

# فارسی
npm test
```

### Run Tests in Watch Mode | اجرای تست‌ها در حالت نظارت

```bash
# English
npm run test:watch

# فارسی
npm run test:watch
```

### Linting | بررسی کد

```bash
# English
npm run lint
npm run lint:fix

# فارسی
npm run lint
npm run lint:fix
```

---

## 🛠️ Technology Stack | پشته فناوری

### Core Dependencies | وابستگی‌های اصلی

| Package | Version | Description | توضیحات |
|---------|---------|-------------|---------|
| **Express.js** | ^4.18.2 | Web framework | چارچوب وب |
| **MongoDB** | ^8.0.3 | Database with Mongoose ODM | پایگاه داده با Mongoose ODM |
| **Node.js** | >= 18.0.0 | Runtime environment | محیط اجرا |

### Security & Authentication | امنیت و احراز هویت

| Package | Version | Description | توضیحات |
|---------|---------|-------------|---------|
| **jsonwebtoken** | ^9.0.2 | JWT token management | مدیریت توکن JWT |
| **bcryptjs** | ^2.4.3 | Password hashing | هش کردن رمز عبور |
| **speakeasy** | ^2.0.0 | Two-factor authentication | احراز هویت دو مرحله‌ای |
| **helmet** | ^7.1.0 | Security headers | هدرهای امنیتی |
| **express-rate-limit** | ^7.1.5 | Rate limiting | محدودیت نرخ |

### Blockchain Integration | ادغام بلاک‌چین

| Package | Version | Description | توضیحات |
|---------|---------|-------------|---------|
| **ethers** | ^6.8.1 | Ethereum/BSC blockchain interaction | تعامل بلاک‌چین Ethereum/BSC |
| **merkletreejs** | ^0.3.11 | Merkle tree implementation | پیاده‌سازی درخت مرکل |
| **keccak256** | ^1.0.6 | Cryptographic hashing | هش رمزنگاری |

### Price Service & External APIs | سرویس قیمت و API های خارجی

| Package | Version | Description | توضیحات |
|---------|---------|-------------|---------|
| **axios** | ^1.6.0 | HTTP client for external API calls | کلاینت HTTP برای فراخوانی‌های API خارجی |
| **express-validator** | ^7.0.1 | Input validation | اعتبارسنجی ورودی |
| **compression** | ^1.7.4 | Response compression | فشرده‌سازی پاسخ |

### Caching & Performance | کش و عملکرد

| Package | Version | Description | توضیحات |
|---------|---------|-------------|---------|
| **express-slow-down** | ^2.0.1 | Advanced rate limiting | محدودیت نرخ پیشرفته |
| **connect-mongo** | ^5.1.0 | Session storage | ذخیره جلسه |
| **express-session** | ^1.17.3 | Session management | مدیریت جلسه |

### Utilities & Communication | ابزارها و ارتباطات

| Package | Version | Description | توضیحات |
|---------|---------|-------------|---------|
| **winston** | ^3.11.0 | Logging framework | چارچوب ثبت‌نام |
| **nodemailer** | ^6.9.7 | Email notifications | اعلان‌های ایمیل |
| **qrcode** | ^1.5.3 | QR code generation | تولید کد QR |
| **cors** | ^2.8.5 | Cross-origin resource sharing | اشتراک‌گذاری منابع چندمنبعه |
| **dotenv** | ^16.3.1 | Environment configuration | پیکربندی محیط |

### Development Tools | ابزارهای توسعه

| Package | Version | Description | توضیحات |
|---------|---------|-------------|---------|
| **nodemon** | ^3.0.2 | Development server | سرور توسعه |
| **jest** | ^29.7.0 | Testing framework | چارچوب تست |
| **eslint** | ^8.54.0 | Code linting | بررسی کد |

---

## 🤝 Contributing | مشارکت

### English
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run linting and tests
6. Submit a pull request

### فارسی
1. فورک کردن مخزن
2. ایجاد شاخه ویژگی
3. ایجاد تغییرات شما
4. اضافه کردن تست برای عملکرد جدید
5. اجرای بررسی کد و تست‌ها
6. ارسال درخواست pull

---

## 📝 API Response Format | فرمت پاسخ API

### Success Response | پاسخ موفقیت

```json
{
  "success": true,
  "data": {
    // Response data | داده‌های پاسخ
  }
}
```

### Error Response | پاسخ خطا

```json
{
  "success": false,
  "error": "Error message | پیام خطا",
  "details": [
    // Validation errors if applicable | خطاهای اعتبارسنجی در صورت وجود
  ]
}
```

### Pagination Response | پاسخ صفحه‌بندی

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

---

## 🔗 Related Documentation | مستندات مرتبط

| Document | Description | توضیحات |
|----------|-------------|---------|
| [API Reference](./docs/API.md) | Detailed API documentation | مستندات تفصیلی API |
| [Price API Documentation](./docs/PRICE_API.md) | Price service API documentation | مستندات API سرویس قیمت |
| [Deployment Guide](./docs/DEPLOYMENT.md) | Deployment instructions | دستورالعمل‌های استقرار |

---

## ⚠️ Important Notes | نکات مهم

### English
1. **Never store private keys on the server** - The backend only manages proofs and metadata
2. **Change default passwords** - Always change default admin credentials in production
3. **Enable 2FA** - Two-factor authentication is strongly recommended for admin accounts
4. **Regular backups** - Implement regular database backups
5. **Monitor logs** - Regularly check logs for suspicious activities
6. **Update dependencies** - Keep all dependencies updated for security
7. **Price service configuration** - Configure API keys for CoinGecko and CoinMarketCap for optimal price accuracy
8. **Cache management** - Monitor cache performance and clear when necessary to ensure fresh data
9. **Rate limiting** - Price endpoints have specific rate limits to prevent abuse

### فارسی
1. **هرگز کلیدهای خصوصی را روی سرور ذخیره نکنید** - بک‌اند فقط اثبات‌ها و متاداده‌ها را مدیریت می‌کند
2. **تغییر رمزهای عبور پیش‌فرض** - همیشه اعتبارنامه‌های ادمین پیش‌فرض را در تولید تغییر دهید
3. **فعال کردن احراز هویت دو مرحله‌ای** - احراز هویت دو مرحله‌ای برای حساب‌های ادمین به شدت توصیه می‌شود
4. **پشتیبان‌گیری منظم** - پشتیبان‌گیری منظم پایگاه داده را پیاده‌سازی کنید
5. **نظارت بر ثبت‌نام‌ها** - به طور منظم ثبت‌نام‌ها را برای فعالیت‌های مشکوک بررسی کنید
6. **به‌روزرسانی وابستگی‌ها** - تمام وابستگی‌ها را برای امنیت به‌روز نگه دارید
7. **پیکربندی سرویس قیمت** - کلیدهای API برای CoinGecko و CoinMarketCap را برای دقت بهینه قیمت پیکربندی کنید
8. **مدیریت کش** - عملکرد کش را نظارت کنید و در صورت لزوم پاک کنید تا داده‌های تازه تضمین شود
9. **محدودیت نرخ** - نقاط پایانی قیمت محدودیت‌های نرخ خاصی دارند تا از سوءاستفاده جلوگیری شود

---

## 📞 Support | پشتیبانی

### English
For technical support or questions:
- Email: support@GTC-token.com
- Documentation: [Link to docs]
- Issues: [GitHub Issues]

### فارسی
برای پشتیبانی فنی یا سوالات:
- ایمیل: support@GTC-token.com
- مستندات: [لینک به مستندات]
- مسائل: [مسائل GitHub]

---

## 📄 License | مجوز

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

این پروژه تحت مجوز MIT مجاز است - برای جزئیات فایل [LICENSE](LICENSE) را ببینید.

---

<div align="center">

**Made with ❤️ by the GTC Team | ساخته شده با ❤️ توسط تیم GCT**

[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue.svg)](https://github.com/your-repo)
[![Discord](https://img.shields.io/badge/Discord-Join%20Us-7289da.svg)](https://discord.gg/your-discord)
[![Twitter](https://img.shields.io/badge/Twitter-Follow%20Us-1da1f2.svg)](https://twitter.com/your-twitter)

</div>