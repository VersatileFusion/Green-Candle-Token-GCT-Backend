/**
 * Email Service for GCT Token Platform
 * Handles email notifications, verification, and communications
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.templates = new Map();
    this.initialized = false;
    
    this.initialize();
  }

  async initialize() {
    try {
      // Create transporter
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Verify connection
      await this.transporter.verify();
      
      // Load email templates
      await this.loadTemplates();
      
      this.initialized = true;
      logger.info('Email service initialized successfully');
      
    } catch (error) {
      logger.error('Email service initialization failed', error);
      this.initialized = false;
    }
  }

  async loadTemplates() {
    const templatesDir = path.join(__dirname, '../templates/email');
    
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
      this.createDefaultTemplates(templatesDir);
    }
    
    const templateFiles = fs.readdirSync(templatesDir);
    
    for (const file of templateFiles) {
      if (file.endsWith('.hbs')) {
        const templateName = path.basename(file, '.hbs');
        const templatePath = path.join(templatesDir, file);
        const templateContent = fs.readFileSync(templatePath, 'utf8');
        
        this.templates.set(templateName, handlebars.compile(templateContent));
      }
    }
    
    logger.info(`Loaded ${this.templates.size} email templates`);
  }

  createDefaultTemplates(templatesDir) {
    // Welcome email template
    const welcomeTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to GCT Token Platform</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #00ff00, #28a745); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to GCT Token Platform!</h1>
      <p>Building a Sustainable Future for Energy & Water</p>
    </div>
    <div class="content">
      <h2>Hello {{name}},</h2>
      <p>Welcome to the Green Candle Token (GCT) platform! We're excited to have you join our community of sustainable energy and water enthusiasts.</p>
      
      <p>Your account has been successfully created with the wallet address: <strong>{{walletAddress}}</strong></p>
      
      <h3>What's Next?</h3>
      <ul>
        <li>Connect your wallet to start claiming tokens</li>
        <li>Explore our renewable energy projects</li>
        <li>Participate in our community governance</li>
        <li>Track your token rewards and staking</li>
      </ul>
      
      <a href="{{platformUrl}}" class="button">Get Started</a>
      
      <p>If you have any questions, feel free to reach out to our support team.</p>
      
      <p>Best regards,<br>The GCT Team</p>
    </div>
    <div class="footer">
      <p>© 2024 Green Candle Token Platform. All rights reserved.</p>
      <p>This email was sent to {{email}}. If you didn't create an account, please ignore this email.</p>
    </div>
  </div>
</body>
</html>`;

    // Claim notification template
    const claimTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Claim {{status}} - GCT Token</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #00ff00, #28a745); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
    .status { padding: 10px 20px; border-radius: 5px; font-weight: bold; text-align: center; margin: 20px 0; }
    .status.completed { background: #d4edda; color: #155724; }
    .status.failed { background: #f8d7da; color: #721c24; }
    .status.pending { background: #fff3cd; color: #856404; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Claim {{status}} - GCT Token</h1>
    </div>
    <div class="content">
      <h2>Hello {{name}},</h2>
      
      <div class="status {{status}}">
        Your claim has been {{status}}!
      </div>
      
      <p><strong>Claim Details:</strong></p>
      <ul>
        <li>Amount: {{amount}} GCT</li>
        <li>Status: {{status}}</li>
        <li>Transaction Hash: {{transactionHash}}</li>
        <li>Date: {{date}}</li>
      </ul>
      
      {{#if failureReason}}
      <p><strong>Reason:</strong> {{failureReason}}</p>
      {{/if}}
      
      <p>You can view more details in your dashboard.</p>
      
      <p>Best regards,<br>The GCT Team</p>
    </div>
    <div class="footer">
      <p>© 2024 Green Candle Token Platform. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

    // Password reset template
    const resetTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Password Reset - GCT Token</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #00ff00, #28a745); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Reset Request</h1>
    </div>
    <div class="content">
      <h2>Hello {{name}},</h2>
      
      <p>We received a request to reset your password for your GCT Token account.</p>
      
      <p>Click the button below to reset your password:</p>
      
      <a href="{{resetUrl}}" class="button">Reset Password</a>
      
      <p>This link will expire in {{expiryHours}} hours for security reasons.</p>
      
      <p>If you didn't request this password reset, please ignore this email.</p>
      
      <p>Best regards,<br>The GCT Team</p>
    </div>
    <div class="footer">
      <p>© 2024 Green Candle Token Platform. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

    // Save templates
    fs.writeFileSync(path.join(templatesDir, 'welcome.hbs'), welcomeTemplate);
    fs.writeFileSync(path.join(templatesDir, 'claim.hbs'), claimTemplate);
    fs.writeFileSync(path.join(templatesDir, 'reset.hbs'), resetTemplate);
    
    logger.info('Created default email templates');
  }

  async sendEmail(to, subject, templateName, data = {}) {
    if (!this.initialized) {
      throw new Error('Email service not initialized');
    }

    try {
      const template = this.templates.get(templateName);
      if (!template) {
        throw new Error(`Email template '${templateName}' not found`);
      }

      const html = template({
        ...data,
        platformUrl: process.env.PLATFORM_URL || 'http://localhost:3000',
        supportEmail: process.env.SUPPORT_EMAIL || 'support@gct-token.com',
        currentYear: new Date().getFullYear()
      });

      const mailOptions = {
        from: {
          name: 'GCT Token Platform',
          address: process.env.SMTP_FROM || process.env.SMTP_USER
        },
        to: to,
        subject: subject,
        html: html
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logger.info('Email sent successfully', {
        to: to,
        subject: subject,
        template: templateName,
        messageId: result.messageId
      });

      return {
        success: true,
        messageId: result.messageId
      };

    } catch (error) {
      logger.error('Email send failed', {
        to: to,
        subject: subject,
        template: templateName,
        error: error.message
      });

      throw error;
    }
  }

  // Specific email methods
  async sendWelcomeEmail(user) {
    return this.sendEmail(
      user.email,
      'Welcome to GCT Token Platform!',
      'welcome',
      {
        name: user.name || 'User',
        email: user.email,
        walletAddress: user.walletAddress
      }
    );
  }

  async sendClaimNotification(user, claim) {
    const statusMap = {
      'completed': 'completed',
      'failed': 'failed',
      'pending': 'pending'
    };

    return this.sendEmail(
      user.email,
      `Claim ${statusMap[claim.status]} - GCT Token`,
      'claim',
      {
        name: user.name || 'User',
        amount: this.formatAmount(claim.amount),
        status: claim.status,
        transactionHash: claim.transactionHash || 'N/A',
        date: new Date(claim.updatedAt || claim.createdAt).toLocaleString(),
        failureReason: claim.failureReason
      }
    );
  }

  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${process.env.PLATFORM_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    return this.sendEmail(
      user.email,
      'Password Reset - GCT Token',
      'reset',
      {
        name: user.name || 'User',
        resetUrl: resetUrl,
        expiryHours: 24
      }
    );
  }

  async sendAdminNotification(admin, notification) {
    return this.sendEmail(
      admin.email,
      notification.subject || 'GCT Platform Notification',
      'admin_notification',
      {
        name: admin.name,
        ...notification
      }
    );
  }

  async sendBulkEmail(recipients, subject, templateName, data = {}) {
    const results = [];
    
    for (const recipient of recipients) {
      try {
        const result = await this.sendEmail(recipient.email, subject, templateName, {
          ...data,
          name: recipient.name || 'User',
          email: recipient.email
        });
        results.push({ email: recipient.email, success: true, result });
      } catch (error) {
        results.push({ email: recipient.email, success: false, error: error.message });
      }
    }
    
    return results;
  }

  formatAmount(amount) {
    if (!amount) return '0';
    const divisor = BigInt('1000000000000000000');
    const value = BigInt(amount);
    const formatted = value / divisor;
    const remainder = value % divisor;
    
    if (remainder === 0n) {
      return formatted.toString();
    }
    
    const remainderStr = remainder.toString().padStart(18, '0');
    const trimmed = remainderStr.replace(/0+$/, '');
    
    if (trimmed === '') {
      return formatted.toString();
    }
    
    return `${formatted}.${trimmed}`;
  }

  // Test email functionality
  async testConnection() {
    try {
      await this.transporter.verify();
      return { success: true, message: 'Email service is working' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get email statistics
  getStats() {
    return {
      initialized: this.initialized,
      templatesLoaded: this.templates.size,
      availableTemplates: Array.from(this.templates.keys())
    };
  }
}

module.exports = new EmailService();