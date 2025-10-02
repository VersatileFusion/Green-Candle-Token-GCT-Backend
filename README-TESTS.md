# GCT Token Platform - Test Suite

This directory contains comprehensive test scripts for the GCT Token Platform, covering frontend, backend, and integration testing.

## 🧪 Test Structure

### Test Files

1. **`test-frontend.js`** - Frontend UI testing using Puppeteer
2. **`test-backend.js`** - Backend API testing using Axios
3. **`test-integration.js`** - End-to-end workflow testing
4. **`test-runner.js`** - Master test runner that executes all tests
5. **`package-test.json`** - Dependencies for test environment

## 🚀 Quick Start

### Prerequisites

1. **Install Dependencies:**
   ```bash
   npm install puppeteer axios nodemon
   ```

2. **Start the Backend Server:**
   ```bash
   cd src
   npm start
   ```

3. **Start the Frontend Server:**
   ```bash
   # In another terminal
   cd public
   python -m http.server 3000
   # OR use any static file server
   ```

### Running Tests

#### Run All Tests
```bash
node test-runner.js
```

#### Run Individual Test Suites
```bash
# Frontend tests only
node test-frontend.js

# Backend tests only
node test-backend.js

# Integration tests only
node test-integration.js
```

#### Run Tests in Watch Mode
```bash
npm run test:watch
```

## 📊 Test Coverage

### Frontend Tests (`test-frontend.js`)

- ✅ **Homepage Loading** - Verifies main page loads with all elements
- ✅ **Navigation** - Tests all navigation links and page transitions
- ✅ **Authentication** - Tests login and wallet connection pages
- ✅ **Staking Pages** - Tests staking pools, details, and user positions
- ✅ **Price Pages** - Tests price charts and historical data
- ✅ **Admin Dashboard** - Tests admin interface and navigation
- ✅ **API Integration** - Verifies API client initialization
- ✅ **WebSocket Connection** - Tests real-time connection setup
- ✅ **Form Submissions** - Tests form validation and submission
- ✅ **Error Handling** - Tests error states and recovery

### Backend Tests (`test-backend.js`)

- ✅ **Health Check** - Verifies server health endpoint
- ✅ **Authentication** - Tests wallet and admin authentication
- ✅ **User Management** - Tests user profile and stats endpoints
- ✅ **Claim System** - Tests token claiming functionality
- ✅ **Price API** - Tests price data and historical endpoints
- ✅ **Staking System** - Tests staking pools and positions
- ✅ **Blog System** - Tests blog posts and content management
- ✅ **Email System** - Tests email templates and queue
- ✅ **Cache System** - Tests in-memory cache management
- ✅ **Admin Functions** - Tests admin dashboard and management
- ✅ **Error Handling** - Tests error responses and validation

### Integration Tests (`test-integration.js`)

- ✅ **Complete User Journey** - Tests full user navigation flow
- ✅ **Staking Workflow** - Tests complete staking process
- ✅ **Price Monitoring** - Tests price chart interactions
- ✅ **Admin Management** - Tests admin workflow and management
- ✅ **Blog System** - Tests blog reading and navigation
- ✅ **Real-time Updates** - Tests WebSocket functionality
- ✅ **Error Recovery** - Tests error handling and recovery

## 📈 Test Reports

### Generated Reports

1. **`master-test-report.json`** - Complete test results in JSON format
2. **`test-report.html`** - Visual HTML report with charts and details
3. **`frontend-test-report.json`** - Frontend-specific results
4. **`backend-test-report.json`** - Backend-specific results
5. **`integration-test-report.json`** - Integration-specific results

### Report Features

- 📊 **Summary Statistics** - Total tests, pass/fail rates, execution time
- 📋 **Detailed Results** - Individual test results with timestamps
- 💡 **Recommendations** - Suggestions for improving test coverage
- 🎨 **Visual HTML Report** - Easy-to-read dashboard with color coding

## 🔧 Configuration

### Test Configuration

The tests are configured to run against:
- **Frontend:** `http://localhost:3000`
- **Backend API:** `http://localhost:3000/api/v1`

### Environment Variables

Create a `.env.test` file for test-specific configuration:

```env
# Test Configuration
TEST_BASE_URL=http://localhost:3000
TEST_API_URL=http://localhost:3000/api/v1
TEST_WALLET_ADDRESS=0x1234567890123456789012345678901234567890
TEST_EMAIL=test@example.com

# Browser Configuration
HEADLESS_MODE=false
BROWSER_TIMEOUT=30000
```

## 🐛 Troubleshooting

### Common Issues

1. **Port Conflicts**
   - Ensure ports 3000 and 3001 are available
   - Check if other services are running on these ports

2. **Browser Issues**
   - Install Chrome/Chromium for Puppeteer
   - Run with `--no-sandbox` flag if needed

3. **API Connection Issues**
   - Verify backend server is running
   - Check CORS configuration
   - Ensure database is connected

4. **Test Timeouts**
   - Increase timeout values in test configuration
   - Check network connectivity
   - Verify server response times

### Debug Mode

Run tests with debug output:
```bash
DEBUG=true node test-runner.js
```

## 📝 Adding New Tests

### Frontend Test Example

```javascript
async testNewFeature() {
  console.log('🆕 Testing New Feature...');
  
  try {
    await this.page.goto(`${this.baseUrl}/new-feature.html`);
    const element = await this.page.$('.new-feature');
    this.assert(element !== null, 'New feature should be displayed');
    
    this.recordTest('New Feature', true, 'New feature works correctly');
  } catch (error) {
    this.recordTest('New Feature', false, `New feature failed: ${error.message}`);
  }
}
```

### Backend Test Example

```javascript
async testNewAPI() {
  console.log('🆕 Testing New API...');
  
  try {
    const response = await this.makeRequest('GET', '/new-endpoint');
    this.assert(response.success, 'New API should work');
    
    this.recordTest('New API', true, 'New API endpoint works correctly');
  } catch (error) {
    this.recordTest('New API', false, `New API failed: ${error.message}`);
  }
}
```

## 🚀 CI/CD Integration

### GitHub Actions Example

```yaml
name: GCT Platform Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:ci
      - uses: actions/upload-artifact@v2
        with:
          name: test-reports
          path: *.json
```

## 📚 Best Practices

1. **Test Isolation** - Each test should be independent
2. **Clear Assertions** - Use descriptive assertion messages
3. **Error Handling** - Always handle and report errors
4. **Resource Cleanup** - Clean up resources after tests
5. **Regular Updates** - Keep tests updated with code changes
6. **Performance Monitoring** - Track test execution times
7. **Coverage Goals** - Aim for >80% test coverage

## 🤝 Contributing

When adding new features to the GCT platform:

1. **Add corresponding tests** for new functionality
2. **Update existing tests** if behavior changes
3. **Ensure all tests pass** before submitting PR
4. **Document test changes** in commit messages

## 📞 Support

For test-related issues:
- Check the troubleshooting section above
- Review test logs and error messages
- Ensure all dependencies are installed
- Verify server configuration

---

**Happy Testing! 🧪✨**