/**
 * Backend Test Script for GCT Token Platform
 * Tests all major backend functionality and API endpoints
 */

const axios = require('axios');
const fs = require('fs');

class GCTBackendTester {
  constructor() {
    this.baseUrl = 'http://localhost:3000/api/v1';
    this.testResults = [];
    this.authToken = null;
    this.testUser = {
      walletAddress: '0x1234567890123456789012345678901234567890',
      email: 'test@example.com'
    };
  }

  async runAllTests() {
    console.log('🚀 Starting GCT Backend Tests...\n');
    
    // Set test environment
    process.env.NODE_ENV = 'test';
    
    try {
      // Test 1: Health Check
      await this.testHealthCheck();
      
      // Test 2: Authentication
      await this.testAuthentication();
      
      // Test 3: User Management
      await this.testUserManagement();
      
      // Test 4: Claim System
      await this.testClaimSystem();
      
      // Test 5: Price API
      await this.testPriceAPI();
      
      // Test 6: Staking System
      await this.testStakingSystem();
      
      
      // Test 7: Blog System
      await this.testBlogSystem();
      
      // Test 8: Email System
      await this.testEmailSystem();
      
      // Test 9: Cache System
      await this.testCacheSystem();
      
      // Test 10: Admin Functions
      await this.testAdminFunctions();
      
      // Test 11: Error Handling
      await this.testErrorHandling();
      
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  }

  async makeRequest(method, endpoint, data = null, headers = {}) {
    try {
      const config = {
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };
      
      if (this.authToken) {
        config.headers.Authorization = `Bearer ${this.authToken}`;
      }
      
      if (data) {
        config.data = data;
      }
      
      const response = await axios(config);
      return { success: true, data: response.data, status: response.status };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || error.message,
        status: error.response?.status || 500
      };
    }
  }

  async testHealthCheck() {
    console.log('🏥 Testing Health Check...');
    
    try {
      const response = await axios.get('http://localhost:3000/health');
      this.assert(response.status === 200, 'Health check should succeed');
      this.assert(response.data.status === 'OK', 'Health status should be OK');
      
      this.recordTest('Health Check', true, 'Health check endpoint works correctly');
    } catch (error) {
      this.recordTest('Health Check', false, `Health check failed: ${error.message}`);
    }
  }

  async testAuthentication() {
    console.log('🔐 Testing Authentication...');
    
    try {
      // Test wallet authentication message
      const messageResponse = await this.makeRequest('GET', `/auth/message/${this.testUser.walletAddress}`);
      this.assert(messageResponse.success, 'Should get authentication message');
      this.assert(messageResponse.data.data.message, 'Message should be provided');
      
      // Test wallet authentication (mock)
      const authResponse = await this.makeRequest('POST', '/auth/wallet', {
        walletAddress: this.testUser.walletAddress,
        signature: '0x' + '1'.repeat(64) + '2'.repeat(64) + '1b', // Valid signature format: r + s + v (v=27)
        message: messageResponse.data.data.message
      });
      
      if (authResponse.success) {
        this.authToken = authResponse.data.token;
        this.recordTest('Authentication', true, 'Wallet authentication works');
      } else {
        this.recordTest('Authentication', false, `Authentication failed: ${authResponse.error}`);
      }
      
    } catch (error) {
      this.recordTest('Authentication', false, `Authentication test failed: ${error.message}`);
    }
  }

  async testUserManagement() {
    console.log('👤 Testing User Management...');
    
    try {
      // Test get user profile
      const profileResponse = await this.makeRequest('GET', '/user/profile');
      this.assert(profileResponse.success, 'Should get user profile');
      
      // Test update user profile
      const updateResponse = await this.makeRequest('PATCH', '/user/profile', {
        email: this.testUser.email
      });
      this.assert(updateResponse.success, 'Should update user profile');
      
      // Test user stats
      const statsResponse = await this.makeRequest('GET', '/user/stats');
      this.assert(statsResponse.success, 'Should get user stats');
      
      this.recordTest('User Management', true, 'User management endpoints work correctly');
      
    } catch (error) {
      this.recordTest('User Management', false, `User management test failed: ${error.message}`);
    }
  }

  async testClaimSystem() {
    console.log('💰 Testing Claim System...');
    
    try {
      // Test check eligibility
      const eligibilityResponse = await this.makeRequest('GET', '/user/eligibility');
      this.assert(eligibilityResponse.success, 'Should check eligibility');
      
      // Test get user claims
      const claimsResponse = await this.makeRequest('GET', '/user/claims');
      this.assert(claimsResponse.success, 'Should get user claims');
      
      // Test create self claim (mock)
      const claimResponse = await this.makeRequest('POST', '/claim/self', {
        walletAddress: this.testUser.walletAddress,
        amount: '1000000000000000000' // 1 GCT
      });
      
      // This might fail if user is not eligible, which is expected
      if (claimResponse.success || claimResponse.status === 403) {
        this.recordTest('Claim System', true, 'Claim system endpoints work correctly');
      } else {
        this.recordTest('Claim System', false, `Claim system failed: ${claimResponse.error}`);
      }
      
    } catch (error) {
      this.recordTest('Claim System', false, `Claim system test failed: ${error.message}`);
    }
  }

  async testPriceAPI() {
    console.log('📈 Testing Price API...');
    
    try {
      // Test get current price
      const priceResponse = await this.makeRequest('GET', '/price/current');
      this.assert(priceResponse.success, 'Should get current price');
      this.assert(priceResponse.data.data.price, 'Price should be provided');
      
      // Test get historical prices
      const historicalResponse = await this.makeRequest('GET', '/price/historical?days=7');
      this.assert(historicalResponse.success, 'Should get historical prices');
      
      // Test get price comparison
      const comparisonResponse = await this.makeRequest('GET', '/price/comparison');
      this.assert(comparisonResponse.success, 'Should get price comparison');
      
      // Test get price stats
      const statsResponse = await this.makeRequest('GET', '/price/stats');
      this.assert(statsResponse.success, 'Should get price stats');
      
      this.recordTest('Price API', true, 'Price API endpoints work correctly');
      
    } catch (error) {
      this.recordTest('Price API', false, `Price API test failed: ${error.message}`);
    }
  }

  async testStakingSystem() {
    console.log('🔒 Testing Staking System...');
    
    try {
      // Test get staking pools
      const poolsResponse = await this.makeRequest('GET', '/staking/pools');
      this.assert(poolsResponse.success, 'Should get staking pools');
      
      // Test get staking stats
      const statsResponse = await this.makeRequest('GET', '/staking/stats');
      this.assert(statsResponse.success, 'Should get staking stats');
      
      // Test get user staking positions
      const positionsResponse = await this.makeRequest('GET', '/staking/positions');
      this.assert(positionsResponse.success, 'Should get user staking positions');
      
      this.recordTest('Staking System', true, 'Staking system endpoints work correctly');
      
    } catch (error) {
      this.recordTest('Staking System', false, `Staking system test failed: ${error.message}`);
    }
  }


  async testBlogSystem() {
    console.log('📝 Testing Blog System...');
    
    try {
      // Test get blog posts
      const postsResponse = await this.makeRequest('GET', '/blog/posts');
      this.assert(postsResponse.success, 'Should get blog posts');
      
      // Test get blog categories
      const categoriesResponse = await this.makeRequest('GET', '/blog/categories');
      this.assert(categoriesResponse.success, 'Should get blog categories');
      
      // Test get blog tags
      const tagsResponse = await this.makeRequest('GET', '/blog/tags');
      this.assert(tagsResponse.success, 'Should get blog tags');
      
      this.recordTest('Blog System', true, 'Blog system endpoints work correctly');
      
    } catch (error) {
      this.recordTest('Blog System', false, `Blog system test failed: ${error.message}`);
    }
  }

  async testEmailSystem() {
    console.log('📧 Testing Email System...');
    
    try {
      // Test get email templates
      const templatesResponse = await this.makeRequest('GET', '/email/templates');
      this.assert(templatesResponse.success, 'Should get email templates');
      
      // Test get email queue
      const queueResponse = await this.makeRequest('GET', '/email/queue');
      this.assert(queueResponse.success, 'Should get email queue');
      
      this.recordTest('Email System', true, 'Email system endpoints work correctly');
      
    } catch (error) {
      this.recordTest('Email System', false, `Email system test failed: ${error.message}`);
    }
  }

  async testCacheSystem() {
    console.log('💾 Testing Cache System...');
    
    try {
      // Test get cache stats
      const statsResponse = await this.makeRequest('GET', '/cache/stats');
      this.assert(statsResponse.success, 'Should get cache stats');
      
      // Test get cache keys
      const keysResponse = await this.makeRequest('GET', '/cache/keys');
      this.assert(keysResponse.success, 'Should get cache keys');
      
      this.recordTest('Cache System', true, 'Cache system endpoints work correctly');
      
    } catch (error) {
      this.recordTest('Cache System', false, `Cache system test failed: ${error.message}`);
    }
  }

  async testAdminFunctions() {
    console.log('👨‍💼 Testing Admin Functions...');
    
    try {
      // Test get admin dashboard
      const dashboardResponse = await this.makeRequest('GET', '/admin/dashboard');
      this.assert(dashboardResponse.success, 'Should get admin dashboard');
      
      // Test get users
      const usersResponse = await this.makeRequest('GET', '/admin/users');
      this.assert(usersResponse.success, 'Should get users list');
      
      // Test get claims
      const claimsResponse = await this.makeRequest('GET', '/admin/claims');
      this.assert(claimsResponse.success, 'Should get claims list');
      
      // Test get merkle trees
      const merkleResponse = await this.makeRequest('GET', '/admin/merkle-trees');
      this.assert(merkleResponse.success, 'Should get merkle trees');
      
      this.recordTest('Admin Functions', true, 'Admin functions work correctly');
      
    } catch (error) {
      this.recordTest('Admin Functions', false, `Admin functions test failed: ${error.message}`);
    }
  }

  async testErrorHandling() {
    console.log('⚠️ Testing Error Handling...');
    
    try {
      // Test invalid endpoint
      const invalidResponse = await this.makeRequest('GET', '/invalid-endpoint');
      this.assert(!invalidResponse.success, 'Invalid endpoint should fail');
      this.assert(invalidResponse.status === 404, 'Should return 404 for invalid endpoint');
      
      // Test invalid data
      const invalidDataResponse = await this.makeRequest('POST', '/auth/wallet', {
        invalidField: 'invalid'
      });
      this.assert(!invalidDataResponse.success, 'Invalid data should fail');
      
      // Test unauthorized access
      const unauthorizedResponse = await this.makeRequest('GET', '/admin/dashboard', null, {
        Authorization: 'Bearer invalid-token'
      });
      this.assert(!unauthorizedResponse.success, 'Unauthorized access should fail');
      
      this.recordTest('Error Handling', true, 'Error handling works correctly');
      
    } catch (error) {
      this.recordTest('Error Handling', false, `Error handling test failed: ${error.message}`);
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  recordTest(testName, passed, message) {
    const result = {
      test: testName,
      passed,
      message,
      timestamp: new Date().toISOString()
    };
    
    this.testResults.push(result);
    
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${testName}: ${message}`);
  }

  generateReport() {
    console.log('\n📊 Test Report Summary:');
    console.log('='.repeat(50));
    
    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    const percentage = ((passed / total) * 100).toFixed(1);
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${total - passed}`);
    console.log(`Success Rate: ${percentage}%`);
    
    console.log('\n📋 Detailed Results:');
    this.testResults.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.test}: ${result.message}`);
    });
    
    // Save report to file
    const report = {
      summary: {
        total: total,
        passed: passed,
        failed: total - passed,
        percentage: parseFloat(percentage)
      },
      results: this.testResults,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync('backend-test-report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Detailed report saved to backend-test-report.json');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new GCTBackendTester();
  tester.runAllTests().catch(console.error);
}

module.exports = GCTBackendTester;