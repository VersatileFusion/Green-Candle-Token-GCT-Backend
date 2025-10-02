/**
 * Master Test Runner for GCT Token Platform
 * Runs all test suites and generates comprehensive reports
 */

const GCTFrontendTester = require('./test-frontend');
const GCTBackendTester = require('./test-backend');
const GCTIntegrationTester = require('./test-integration');
const fs = require('fs');

class GCTTestRunner {
  constructor() {
    this.allResults = [];
    this.startTime = null;
    this.endTime = null;
  }

  async runAllTests() {
    console.log('🚀 Starting GCT Token Platform Test Suite...\n');
    console.log('='.repeat(60));
    
    this.startTime = new Date();
    
    try {
      // Run Backend Tests
      console.log('\n🔧 Running Backend Tests...');
      console.log('-'.repeat(40));
      const backendTester = new GCTBackendTester();
      await backendTester.runAllTests();
      this.allResults.push({
        suite: 'Backend',
        results: backendTester.testResults,
        summary: this.calculateSummary(backendTester.testResults)
      });
      
      // Run Frontend Tests
      console.log('\n🎨 Running Frontend Tests...');
      console.log('-'.repeat(40));
      const frontendTester = new GCTFrontendTester();
      await frontendTester.runAllTests();
      this.allResults.push({
        suite: 'Frontend',
        results: frontendTester.testResults,
        summary: this.calculateSummary(frontendTester.testResults)
      });
      
      // Run Integration Tests
      console.log('\n🔗 Running Integration Tests...');
      console.log('-'.repeat(40));
      const integrationTester = new GCTIntegrationTester();
      await integrationTester.runAllTests();
      this.allResults.push({
        suite: 'Integration',
        results: integrationTester.testResults,
        summary: this.calculateSummary(integrationTester.testResults)
      });
      
      this.endTime = new Date();
      this.generateMasterReport();
      
    } catch (error) {
      console.error('❌ Test suite execution failed:', error);
    }
  }

  calculateSummary(testResults) {
    const total = testResults.length;
    const passed = testResults.filter(r => r.passed).length;
    const failed = total - passed;
    const percentage = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;
    
    return {
      total,
      passed,
      failed,
      percentage: parseFloat(percentage)
    };
  }

  generateMasterReport() {
    console.log('\n📊 MASTER TEST REPORT');
    console.log('='.repeat(60));
    
    const totalTests = this.allResults.reduce((sum, suite) => sum + suite.summary.total, 0);
    const totalPassed = this.allResults.reduce((sum, suite) => sum + suite.summary.passed, 0);
    const totalFailed = this.allResults.reduce((sum, suite) => sum + suite.summary.failed, 0);
    const overallPercentage = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0;
    
    console.log(`\n📈 Overall Statistics:`);
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${totalPassed}`);
    console.log(`Failed: ${totalFailed}`);
    console.log(`Success Rate: ${overallPercentage}%`);
    
    console.log(`\n⏱️ Execution Time: ${this.getExecutionTime()}`);
    
    console.log(`\n📋 Suite Breakdown:`);
    this.allResults.forEach(suite => {
      const status = suite.summary.percentage >= 80 ? '✅' : suite.summary.percentage >= 60 ? '⚠️' : '❌';
      console.log(`${status} ${suite.suite}: ${suite.summary.passed}/${suite.summary.total} (${suite.summary.percentage}%)`);
    });
    
    // Generate detailed report
    const masterReport = {
      summary: {
        totalTests,
        totalPassed,
        totalFailed,
        overallPercentage: parseFloat(overallPercentage),
        executionTime: this.getExecutionTime(),
        timestamp: new Date().toISOString()
      },
      suites: this.allResults.map(suite => ({
        name: suite.suite,
        summary: suite.summary,
        results: suite.results
      })),
      recommendations: this.generateRecommendations()
    };
    
    // Save master report
    fs.writeFileSync('master-test-report.json', JSON.stringify(masterReport, null, 2));
    console.log('\n📄 Master report saved to master-test-report.json');
    
    // Generate HTML report
    this.generateHTMLReport(masterReport);
    
    // Print recommendations
    console.log('\n💡 Recommendations:');
    masterReport.recommendations.forEach(rec => {
      console.log(`• ${rec}`);
    });
  }

  generateRecommendations() {
    const recommendations = [];
    
    this.allResults.forEach(suite => {
      if (suite.summary.percentage < 80) {
        recommendations.push(`Focus on improving ${suite.suite} test coverage and fix failing tests`);
      }
    });
    
    if (this.allResults.some(suite => suite.summary.failed > 0)) {
      recommendations.push('Review and fix all failing tests before deployment');
    }
    
    if (this.allResults.every(suite => suite.summary.percentage >= 90)) {
      recommendations.push('Excellent test coverage! Consider adding performance tests');
    }
    
    recommendations.push('Run tests regularly in CI/CD pipeline');
    recommendations.push('Monitor test execution time and optimize slow tests');
    
    return recommendations;
  }

  generateHTMLReport(report) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GCT Token Platform - Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .summary-card h3 { margin: 0 0 10px 0; color: #333; }
        .summary-card .value { font-size: 2em; font-weight: bold; margin: 10px 0; }
        .success { color: #28a745; }
        .warning { color: #ffc107; }
        .danger { color: #dc3545; }
        .suite { margin-bottom: 30px; }
        .suite-header { background: #007bff; color: white; padding: 15px; border-radius: 8px 8px 0 0; }
        .suite-content { border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px; }
        .test-item { padding: 10px 15px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
        .test-item:last-child { border-bottom: none; }
        .test-name { font-weight: bold; }
        .test-status { padding: 4px 8px; border-radius: 4px; font-size: 0.9em; }
        .test-passed { background: #d4edda; color: #155724; }
        .test-failed { background: #f8d7da; color: #721c24; }
        .recommendations { background: #e9ecef; padding: 20px; border-radius: 8px; margin-top: 30px; }
        .recommendations h3 { margin-top: 0; }
        .recommendations ul { margin: 0; padding-left: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 GCT Token Platform - Test Report</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <h3>Total Tests</h3>
                <div class="value">${report.summary.totalTests}</div>
            </div>
            <div class="summary-card">
                <h3>Passed</h3>
                <div class="value success">${report.summary.totalPassed}</div>
            </div>
            <div class="summary-card">
                <h3>Failed</h3>
                <div class="value danger">${report.summary.totalFailed}</div>
            </div>
            <div class="summary-card">
                <h3>Success Rate</h3>
                <div class="value ${report.summary.overallPercentage >= 80 ? 'success' : report.summary.overallPercentage >= 60 ? 'warning' : 'danger'}">${report.summary.overallPercentage}%</div>
            </div>
        </div>
        
        ${report.suites.map(suite => `
        <div class="suite">
            <div class="suite-header">
                <h2>${suite.name} Tests (${suite.summary.passed}/${suite.summary.total} - ${suite.summary.percentage}%)</h2>
            </div>
            <div class="suite-content">
                ${suite.results.map(test => `
                <div class="test-item">
                    <div class="test-name">${test.test}</div>
                    <div class="test-status ${test.passed ? 'test-passed' : 'test-failed'}">
                        ${test.passed ? '✅ PASSED' : '❌ FAILED'}
                    </div>
                </div>
                `).join('')}
            </div>
        </div>
        `).join('')}
        
        <div class="recommendations">
            <h3>💡 Recommendations</h3>
            <ul>
                ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
    </div>
</body>
</html>`;
    
    fs.writeFileSync('test-report.html', html);
    console.log('📄 HTML report saved to test-report.html');
  }

  getExecutionTime() {
    if (!this.startTime || !this.endTime) return 'N/A';
    const duration = this.endTime - this.startTime;
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
}

// Run all tests if this file is executed directly
if (require.main === module) {
  const runner = new GCTTestRunner();
  runner.runAllTests().catch(console.error);
}

module.exports = GCTTestRunner;