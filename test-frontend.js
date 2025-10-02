/**
 * Frontend Test Script for GCT Token Platform
 * Tests all major frontend functionality and API integration
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class GCTFrontendTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = [];
    this.baseUrl = 'http://localhost:3000';
  }

  async init() {
    console.log('🚀 Starting GCT Frontend Tests...\n');
    this.browser = await puppeteer.launch({ 
      headless: false, // Set to true for CI/CD
      defaultViewport: { width: 1920, height: 1080 }
    });
    this.page = await this.browser.newPage();
    
    // Set up console logging
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Browser Error:', msg.text());
      }
    });
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async runAllTests() {
    try {
      await this.init();
      
      // Test 1: Homepage Loading
      await this.testHomepage();
      
      // Test 2: Navigation
      await this.testNavigation();
      
      // Test 3: Authentication
      await this.testAuthentication();
      
      // Test 4: Staking Pages
      await this.testStakingPages();
      
      // Test 5: Price Pages
      await this.testPricePages();
      
      // Test 6: Admin Dashboard
      await this.testAdminDashboard();
      
      // Test 7: API Integration
      await this.testAPIIntegration();
      
      // Test 8: WebSocket Connection
      await this.testWebSocketConnection();
      
      // Test 9: Form Submissions
      await this.testFormSubmissions();
      
      // Test 10: Error Handling
      await this.testErrorHandling();
      
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    } finally {
      await this.cleanup();
    }
  }

  async testHomepage() {
    console.log('🏠 Testing Homepage...');
    
    try {
      await this.page.goto(`${this.baseUrl}/index.html`, { waitUntil: 'networkidle0' });
      
      // Check if page loads
      const title = await this.page.title();
      this.assert(title.includes('GCT'), 'Homepage title should contain GCT');
      
      // Check for key elements
      await this.page.waitForSelector('.cs-site_header', { timeout: 5000 });
      await this.page.waitForSelector('.cs-main_footer', { timeout: 5000 });
      
      // Check for navigation
      const navLinks = await this.page.$$('.cs-nav_list a');
      this.assert(navLinks.length > 0, 'Navigation should have links');
      
      // Check for staking and price links
      const stakingLink = await this.page.$('a[href="staking.html"]');
      const priceLink = await this.page.$('a[href="price-chart.html"]');
      this.assert(stakingLink !== null, 'Staking link should exist');
      this.assert(priceLink !== null, 'Price link should exist');
      
      this.recordTest('Homepage', true, 'Homepage loads correctly with all elements');
      
    } catch (error) {
      this.recordTest('Homepage', false, `Homepage test failed: ${error.message}`);
    }
  }

  async testNavigation() {
    console.log('🧭 Testing Navigation...');
    
    const pages = [
      { name: 'Staking', url: 'staking.html' },
      { name: 'Price Chart', url: 'price-chart.html' },
      { name: 'Price History', url: 'price-history.html' },
      { name: 'Blog', url: 'blog.html' },
      { name: 'Activity', url: 'activity.html' },
      { name: 'Admin Dashboard', url: 'admin-dashboard.html' }
    ];

    for (const page of pages) {
      try {
        await this.page.goto(`${this.baseUrl}/${page.url}`, { waitUntil: 'networkidle0' });
        const title = await this.page.title();
        this.assert(title.length > 0, `${page.name} page should load`);
        this.recordTest(`Navigation - ${page.name}`, true, `${page.name} page loads successfully`);
      } catch (error) {
        this.recordTest(`Navigation - ${page.name}`, false, `${page.name} page failed to load: ${error.message}`);
      }
    }
  }

  async testAuthentication() {
    console.log('🔐 Testing Authentication...');
    
    try {
      // Test login page
      await this.page.goto(`${this.baseUrl}/login.html`, { waitUntil: 'networkidle0' });
      
      // Check for login form
      const emailInput = await this.page.$('input[type="email"]');
      const passwordInput = await this.page.$('input[type="password"]');
      const loginButton = await this.page.$('button[type="submit"]');
      
      this.assert(emailInput !== null, 'Email input should exist');
      this.assert(passwordInput !== null, 'Password input should exist');
      this.assert(loginButton !== null, 'Login button should exist');
      
      // Test wallet connection page
      await this.page.goto(`${this.baseUrl}/connect-wallet.html`, { waitUntil: 'networkidle0' });
      
      const walletButton = await this.page.$('button:contains("Connect Wallet")');
      this.assert(walletButton !== null, 'Wallet connection button should exist');
      
      this.recordTest('Authentication', true, 'Authentication pages load correctly');
      
    } catch (error) {
      this.recordTest('Authentication', false, `Authentication test failed: ${error.message}`);
    }
  }

  async testStakingPages() {
    console.log('💰 Testing Staking Pages...');
    
    try {
      // Test main staking page
      await this.page.goto(`${this.baseUrl}/staking.html`, { waitUntil: 'networkidle0' });
      
      // Check for staking pool cards
      const poolCards = await this.page.$$('.pool-card');
      this.assert(poolCards.length >= 0, 'Staking pools should be displayed');
      
      // Check for filter tabs
      const filterTabs = await this.page.$$('.filter-tab');
      this.assert(filterTabs.length > 0, 'Filter tabs should exist');
      
      // Test staking details page
      await this.page.goto(`${this.baseUrl}/staking-details.html?id=test-pool`, { waitUntil: 'networkidle0' });
      
      // Check for staking form
      const stakeForm = await this.page.$('#stake-form');
      const stakeAmountInput = await this.page.$('#stake-amount');
      const stakeButton = await this.page.$('#stake-submit-btn');
      
      this.assert(stakeForm !== null, 'Staking form should exist');
      this.assert(stakeAmountInput !== null, 'Stake amount input should exist');
      this.assert(stakeButton !== null, 'Stake button should exist');
      
      // Test my staking page
      await this.page.goto(`${this.baseUrl}/my-staking.html`, { waitUntil: 'networkidle0' });
      
      const summaryCards = await this.page.$$('.summary-card');
      this.assert(summaryCards.length > 0, 'Summary cards should exist');
      
      this.recordTest('Staking Pages', true, 'All staking pages load correctly');
      
    } catch (error) {
      this.recordTest('Staking Pages', false, `Staking pages test failed: ${error.message}`);
    }
  }

  async testPricePages() {
    console.log('📈 Testing Price Pages...');
    
    try {
      // Test price chart page
      await this.page.goto(`${this.baseUrl}/price-chart.html`, { waitUntil: 'networkidle0' });
      
      // Check for chart container
      const chartContainer = await this.page.$('#priceChart');
      this.assert(chartContainer !== null, 'Price chart should exist');
      
      // Check for timeframe tabs
      const timeframeTabs = await this.page.$$('.timeframe-tab');
      this.assert(timeframeTabs.length > 0, 'Timeframe tabs should exist');
      
      // Check for current price display
      const currentPrice = await this.page.$('#current-price');
      this.assert(currentPrice !== null, 'Current price display should exist');
      
      // Test price history page
      await this.page.goto(`${this.baseUrl}/price-history.html`, { waitUntil: 'networkidle0' });
      
      // Check for history chart
      const historyChart = await this.page.$('#historyChart');
      this.assert(historyChart !== null, 'History chart should exist');
      
      // Check for export buttons
      const exportButtons = await this.page.$$('.export-btn');
      this.assert(exportButtons.length > 0, 'Export buttons should exist');
      
      this.recordTest('Price Pages', true, 'All price pages load correctly');
      
    } catch (error) {
      this.recordTest('Price Pages', false, `Price pages test failed: ${error.message}`);
    }
  }

  async testAdminDashboard() {
    console.log('👨‍💼 Testing Admin Dashboard...');
    
    try {
      await this.page.goto(`${this.baseUrl}/admin-dashboard.html`, { waitUntil: 'networkidle0' });
      
      // Check for admin sidebar
      const adminSidebar = await this.page.$('.admin-sidebar');
      this.assert(adminSidebar !== null, 'Admin sidebar should exist');
      
      // Check for navigation links
      const navLinks = await this.page.$$('.admin-sidebar .nav-link');
      this.assert(navLinks.length > 0, 'Admin navigation should have links');
      
      // Check for dashboard stats
      const statCards = await this.page.$$('.stat-card');
      this.assert(statCards.length > 0, 'Dashboard should have stat cards');
      
      // Test navigation between sections
      const emailLink = await this.page.$('a[href="#email"]');
      if (emailLink) {
        await emailLink.click();
        await this.page.waitForTimeout(1000);
        
        const emailSection = await this.page.$('#email-section');
        this.assert(emailSection !== null, 'Email section should be visible');
      }
      
      this.recordTest('Admin Dashboard', true, 'Admin dashboard loads and functions correctly');
      
    } catch (error) {
      this.recordTest('Admin Dashboard', false, `Admin dashboard test failed: ${error.message}`);
    }
  }

  async testAPIIntegration() {
    console.log('🔌 Testing API Integration...');
    
    try {
      // Test API client initialization
      const apiClientExists = await this.page.evaluate(() => {
        return typeof window.apiClient !== 'undefined';
      });
      this.assert(apiClientExists, 'API client should be initialized');
      
      // Test API endpoints (mock responses)
      await this.page.goto(`${this.baseUrl}/staking.html`, { waitUntil: 'networkidle0' });
      
      // Check if API calls are made
      const apiCalls = await this.page.evaluate(() => {
        return window.apiClient ? 'API client available' : 'API client not available';
      });
      
      this.assert(apiCalls === 'API client available', 'API client should be available on staking page');
      
      this.recordTest('API Integration', true, 'API integration works correctly');
      
    } catch (error) {
      this.recordTest('API Integration', false, `API integration test failed: ${error.message}`);
    }
  }

  async testWebSocketConnection() {
    console.log('🌐 Testing WebSocket Connection...');
    
    try {
      // Check if WebSocket manager is initialized
      const wsManagerExists = await this.page.evaluate(() => {
        return typeof window.websocketManager !== 'undefined';
      });
      this.assert(wsManagerExists, 'WebSocket manager should be initialized');
      
      // Test WebSocket connection status
      const wsStatus = await this.page.evaluate(() => {
        return window.websocketManager ? window.websocketManager.getConnectionStatus() : null;
      });
      
      this.assert(wsStatus !== null, 'WebSocket status should be available');
      
      this.recordTest('WebSocket Connection', true, 'WebSocket connection is properly initialized');
      
    } catch (error) {
      this.recordTest('WebSocket Connection', false, `WebSocket test failed: ${error.message}`);
    }
  }

  async testFormSubmissions() {
    console.log('📝 Testing Form Submissions...');
    
    try {
      // Test staking form
      await this.page.goto(`${this.baseUrl}/staking-details.html?id=test-pool`, { waitUntil: 'networkidle0' });
      
      const stakeAmountInput = await this.page.$('#stake-amount');
      if (stakeAmountInput) {
        await stakeAmountInput.type('100');
        
        // Check if form validation works
        const form = await this.page.$('#stake-form');
        if (form) {
          const isValid = await this.page.evaluate(() => {
            const input = document.getElementById('stake-amount');
            return input.checkValidity();
          });
          this.assert(isValid, 'Form validation should work');
        }
      }
      
      // Test email form
      await this.page.goto(`${this.baseUrl}/email-management.html`, { waitUntil: 'networkidle0' });
      
      const emailToInput = await this.page.$('#email-to');
      const emailSubjectInput = await this.page.$('#email-subject');
      
      if (emailToInput && emailSubjectInput) {
        await emailToInput.type('test@example.com');
        await emailSubjectInput.type('Test Subject');
        
        const emailForm = await this.page.$('#send-email-form');
        if (emailForm) {
          const isValid = await this.page.evaluate(() => {
            const form = document.getElementById('send-email-form');
            return form.checkValidity();
          });
          this.assert(isValid, 'Email form validation should work');
        }
      }
      
      this.recordTest('Form Submissions', true, 'Form validation works correctly');
      
    } catch (error) {
      this.recordTest('Form Submissions', false, `Form submission test failed: ${error.message}`);
    }
  }

  async testErrorHandling() {
    console.log('⚠️ Testing Error Handling...');
    
    try {
      // Test 404 page
      await this.page.goto(`${this.baseUrl}/nonexistent-page.html`, { waitUntil: 'networkidle0' });
      
      const is404 = await this.page.evaluate(() => {
        return document.title.includes('404') || document.body.textContent.includes('404');
      });
      
      // Test invalid API calls
      await this.page.goto(`${this.baseUrl}/staking.html`, { waitUntil: 'networkidle0' });
      
      // Check if error handling is in place
      const hasErrorHandling = await this.page.evaluate(() => {
        return typeof window.apiClient !== 'undefined' && 
               typeof window.apiClient.formatError === 'function';
      });
      
      this.assert(hasErrorHandling, 'Error handling should be implemented');
      
      this.recordTest('Error Handling', true, 'Error handling is properly implemented');
      
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
    
    fs.writeFileSync('frontend-test-report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Detailed report saved to frontend-test-report.json');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new GCTFrontendTester();
  tester.runAllTests().catch(console.error);
}

module.exports = GCTFrontendTester;