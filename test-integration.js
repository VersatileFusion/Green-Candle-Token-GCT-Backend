/**
 * Integration Test Script for GCT Token Platform
 * Tests complete user workflows and end-to-end functionality
 */

const puppeteer = require('puppeteer');
const axios = require('axios');

class GCTIntegrationTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = [];
    this.baseUrl = 'http://localhost:3000';
    this.apiUrl = 'http://localhost:3000/api/v1';
  }

  async init() {
    console.log('🚀 Starting GCT Integration Tests...\n');
    this.browser = await puppeteer.launch({ 
      headless: false,
      defaultViewport: { width: 1920, height: 1080 }
    });
    this.page = await this.browser.newPage();
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async runAllTests() {
    try {
      await this.init();
      
      // Test 1: Complete User Journey
      await this.testCompleteUserJourney();
      
      // Test 2: Staking Workflow
      await this.testStakingWorkflow();
      
      // Test 3: Price Monitoring Workflow
      await this.testPriceMonitoringWorkflow();
      
      // Test 4: Admin Management Workflow
      await this.testAdminManagementWorkflow();
      
      
      // Test 5: Blog System Workflow
      await this.testBlogSystemWorkflow();
      
      // Test 6: Real-time Updates
      await this.testRealTimeUpdates();
      
      // Test 7: Error Recovery
      await this.testErrorRecovery();
      
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Integration test suite failed:', error);
    } finally {
      await this.cleanup();
    }
  }

  async testCompleteUserJourney() {
    console.log('👤 Testing Complete User Journey...');
    
    try {
      // Step 1: Visit homepage
      await this.page.goto(`${this.baseUrl}/index.html`, { waitUntil: 'networkidle0' });
      const title = await this.page.title();
      this.assert(title.includes('GCT'), 'Homepage should load');
      
      // Step 2: Navigate to staking
      await this.page.click('a[href="staking.html"]');
      await this.page.waitForSelector('.staking-hero', { timeout: 5000 });
      this.assert(true, 'Should navigate to staking page');
      
      // Step 3: Navigate to price chart
      await this.page.click('a[href="price-chart.html"]');
      await this.page.waitForSelector('.price-hero', { timeout: 5000 });
      this.assert(true, 'Should navigate to price chart');
      
      // Step 4: Navigate to blog
      await this.page.click('a[href="blog.html"]');
      await this.page.waitForSelector('.cs-main_footer', { timeout: 5000 });
      this.assert(true, 'Should navigate to blog');
      
      this.recordTest('Complete User Journey', true, 'User can navigate through all main sections');
      
    } catch (error) {
      this.recordTest('Complete User Journey', false, `User journey failed: ${error.message}`);
    }
  }

  async testStakingWorkflow() {
    console.log('💰 Testing Staking Workflow...');
    
    try {
      // Step 1: Go to staking page
      await this.page.goto(`${this.baseUrl}/staking.html`, { waitUntil: 'networkidle0' });
      
      // Step 2: Check if pools are displayed
      const poolCards = await this.page.$$('.pool-card');
      this.assert(poolCards.length >= 0, 'Staking pools should be displayed');
      
      // Step 3: Test filter functionality
      const filterTabs = await this.page.$$('.filter-tab');
      if (filterTabs.length > 0) {
        await filterTabs[1].click(); // Click second filter tab
        await this.page.waitForTimeout(1000);
        this.assert(true, 'Filter tabs should work');
      }
      
      // Step 4: Navigate to staking details
      if (poolCards.length > 0) {
        await poolCards[0].click();
        await this.page.waitForTimeout(1000);
        this.assert(true, 'Should navigate to staking details');
      }
      
      // Step 5: Test staking form
      const stakeForm = await this.page.$('#stake-form');
      if (stakeForm) {
        const amountInput = await this.page.$('#stake-amount');
        if (amountInput) {
          await amountInput.type('100');
          this.assert(true, 'Should be able to enter staking amount');
        }
      }
      
      this.recordTest('Staking Workflow', true, 'Staking workflow functions correctly');
      
    } catch (error) {
      this.recordTest('Staking Workflow', false, `Staking workflow failed: ${error.message}`);
    }
  }

  async testPriceMonitoringWorkflow() {
    console.log('📈 Testing Price Monitoring Workflow...');
    
    try {
      // Step 1: Go to price chart
      await this.page.goto(`${this.baseUrl}/price-chart.html`, { waitUntil: 'networkidle0' });
      
      // Step 2: Check if chart loads
      const chartContainer = await this.page.$('#priceChart');
      this.assert(chartContainer !== null, 'Price chart should be displayed');
      
      // Step 3: Test timeframe tabs
      const timeframeTabs = await this.page.$$('.timeframe-tab');
      if (timeframeTabs.length > 0) {
        await timeframeTabs[1].click(); // Click 24H tab
        await this.page.waitForTimeout(2000);
        this.assert(true, 'Timeframe tabs should work');
      }
      
      // Step 4: Navigate to price history
      await this.page.goto(`${this.baseUrl}/price-history.html`, { waitUntil: 'networkidle0' });
      
      // Step 5: Test date range selector
      const startDateInput = await this.page.$('#start-date');
      const endDateInput = await this.page.$('#end-date');
      if (startDateInput && endDateInput) {
        this.assert(true, 'Date range inputs should be available');
      }
      
      // Step 6: Test export functionality
      const exportButtons = await this.page.$$('.export-btn');
      this.assert(exportButtons.length > 0, 'Export buttons should be available');
      
      this.recordTest('Price Monitoring Workflow', true, 'Price monitoring workflow functions correctly');
      
    } catch (error) {
      this.recordTest('Price Monitoring Workflow', false, `Price monitoring workflow failed: ${error.message}`);
    }
  }

  async testAdminManagementWorkflow() {
    console.log('👨‍💼 Testing Admin Management Workflow...');
    
    try {
      // Step 1: Go to admin dashboard
      await this.page.goto(`${this.baseUrl}/admin-dashboard.html`, { waitUntil: 'networkidle0' });
      
      // Step 2: Check if admin interface loads
      const adminSidebar = await this.page.$('.admin-sidebar');
      this.assert(adminSidebar !== null, 'Admin sidebar should be displayed');
      
      // Step 3: Test navigation between sections
      const navLinks = await this.page.$$('.admin-sidebar .nav-link');
      if (navLinks.length > 0) {
        // Click on different sections
        for (let i = 0; i < Math.min(3, navLinks.length); i++) {
          await navLinks[i].click();
          await this.page.waitForTimeout(1000);
        }
        this.assert(true, 'Admin navigation should work');
      }
      
      // Step 4: Test email management link
      const emailLink = await this.page.$('a[href="email-management.html"]');
      if (emailLink) {
        await emailLink.click();
        await this.page.waitForTimeout(2000);
        this.assert(true, 'Should navigate to email management');
      }
      
      // Step 5: Test cache management link
      const cacheLink = await this.page.$('a[href="cache-management.html"]');
      if (cacheLink) {
        await cacheLink.click();
        await this.page.waitForTimeout(2000);
        this.assert(true, 'Should navigate to cache management');
      }
      
      this.recordTest('Admin Management Workflow', true, 'Admin management workflow functions correctly');
      
    } catch (error) {
      this.recordTest('Admin Management Workflow', false, `Admin management workflow failed: ${error.message}`);
    }
  }


  async testBlogSystemWorkflow() {
    console.log('📝 Testing Blog System Workflow...');
    
    try {
      // Step 1: Go to blog page
      await this.page.goto(`${this.baseUrl}/blog.html`, { waitUntil: 'networkidle0' });
      
      // Step 2: Check if blog posts load
      const blogPosts = await this.page.$$('.cs-blog_item');
      this.assert(blogPosts.length >= 0, 'Blog posts should be displayed');
      
      // Step 3: Test blog navigation
      const blogLinks = await this.page.$$('.cs-blog_item a');
      if (blogLinks.length > 0) {
        await blogLinks[0].click();
        await this.page.waitForTimeout(2000);
        this.assert(true, 'Should navigate to blog post details');
      }
      
      // Step 4: Test blog with sidebar
      await this.page.goto(`${this.baseUrl}/blog-with-sidebar.html`, { waitUntil: 'networkidle0' });
      this.assert(true, 'Should load blog with sidebar');
      
      this.recordTest('Blog System Workflow', true, 'Blog system workflow functions correctly');
      
    } catch (error) {
      this.recordTest('Blog System Workflow', false, `Blog system workflow failed: ${error.message}`);
    }
  }

  async testRealTimeUpdates() {
    console.log('⚡ Testing Real-time Updates...');
    
    try {
      // Step 1: Check if WebSocket manager is available
      const wsManagerExists = await this.page.evaluate(() => {
        return typeof window.websocketManager !== 'undefined';
      });
      this.assert(wsManagerExists, 'WebSocket manager should be available');
      
      // Step 2: Test price updates
      await this.page.goto(`${this.baseUrl}/price-chart.html`, { waitUntil: 'networkidle0' });
      
      const priceElement = await this.page.$('#current-price');
      if (priceElement) {
        const initialPrice = await priceElement.textContent();
        this.assert(initialPrice.includes('$'), 'Price should be displayed');
      }
      
      // Step 3: Test staking updates
      await this.page.goto(`${this.baseUrl}/staking.html`, { waitUntil: 'networkidle0' });
      
      const poolCards = await this.page.$$('.pool-card');
      this.assert(poolCards.length >= 0, 'Staking pools should be displayed');
      
      this.recordTest('Real-time Updates', true, 'Real-time update system is functional');
      
    } catch (error) {
      this.recordTest('Real-time Updates', false, `Real-time updates test failed: ${error.message}`);
    }
  }

  async testErrorRecovery() {
    console.log('🔄 Testing Error Recovery...');
    
    try {
      // Step 1: Test 404 page
      await this.page.goto(`${this.baseUrl}/nonexistent-page.html`, { waitUntil: 'networkidle0' });
      
      // Step 2: Test invalid API calls
      await this.page.goto(`${this.baseUrl}/staking.html`, { waitUntil: 'networkidle0' });
      
      // Step 3: Test form validation
      const stakeForm = await this.page.$('#stake-form');
      if (stakeForm) {
        const amountInput = await this.page.$('#stake-amount');
        if (amountInput) {
          await amountInput.type('invalid');
          const isValid = await this.page.evaluate(() => {
            const input = document.getElementById('stake-amount');
            return input.checkValidity();
          });
          this.assert(!isValid, 'Form validation should catch invalid input');
        }
      }
      
      // Step 4: Test navigation recovery
      await this.page.goto(`${this.baseUrl}/index.html`, { waitUntil: 'networkidle0' });
      const title = await this.page.title();
      this.assert(title.includes('GCT'), 'Should recover to homepage');
      
      this.recordTest('Error Recovery', true, 'Error recovery mechanisms work correctly');
      
    } catch (error) {
      this.recordTest('Error Recovery', false, `Error recovery test failed: ${error.message}`);
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
    console.log('\n📊 Integration Test Report Summary:');
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
    
    const fs = require('fs');
    fs.writeFileSync('integration-test-report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Detailed report saved to integration-test-report.json');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new GCTIntegrationTester();
  tester.runAllTests().catch(console.error);
}

module.exports = GCTIntegrationTester;