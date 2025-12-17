// src/utils/emailRotator.js
// FINAL PRODUCTION EMAIL ROTATOR — DECEMBER 18, 2025

const nodemailer = require('nodemailer');

class EmailRotator {
  constructor() {
    this.accounts = [];
    this.currentIndex = 0;
    this.loadAccounts();
  }

  loadAccounts() {
    // Load up to 10 Gmail accounts from .env
    for (let i = 1; i <= 10; i++) {
      const user = process.env[`EMAIL_USER_${i}`]?.trim();
      const pass = process.env[`EMAIL_PASS_${i}`]?.trim();

      if (user && pass) {
        this.accounts.push({ user, pass });
      }
    }

    if (this.accounts.length > 0) {
      console.log(`Email Rotator Ready → ${this.accounts.length} Gmail account(s) loaded`);
    } else {
      console.warn('No Gmail accounts configured in .env → Falling back to Ethereal (test mode)');
      this.useEtherealFallback();
    }
  }

  async useEtherealFallback() {
    try {
      const testAccount = await nodemailer.createTestAccount();
      this.accounts = [{
        user: testAccount.user,
        pass: testAccount.pass,
        isEthereal: true
      }];
      console.log('Ethereal test account active');
      console.log('Preview emails at: https://ethereal.email');
    } catch (err) {
      console.error('Failed to create Ethereal test account:', err);
    }
  }

  getNextAccount() {
    if (this.accounts.length === 0) {
      throw new Error('No email accounts available');
    }
    const account = this.accounts[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.accounts.length;
    return account;
  }

  async sendMail(mailOptions) {
    const account = this.getNextAccount();

    const transporter = nodemailer.createTransport({
      host: account.isEthereal ? 'smtp.ethereal.email' : 'smtp.gmail.com',
      port: account.isEthereal ? 587 : 587,
      secure: false, // Use STARTTLS
      auth: {
        user: account.user,
        pass: account.pass
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Set sender
    mailOptions.from = mailOptions.from || `"FoodApp" <${account.user}>`;

    try {
      const info = await transporter.sendMail(mailOptions);

      // Log preview URL for Ethereal in development
      if (account.isEthereal && process.env.NODE_ENV === 'development') {
        console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
      }

      console.log(`Email sent successfully via ${account.user}`);
      return info;
    } catch (error) {
      console.error(`Email failed via ${account.user}:`, error.message);

      // If Gmail auth fails, try next account on next call
      if (error.code === 'EAUTH') {
        console.warn(`Account ${account.user} authentication failed — rotating to next`);
      }

      throw error; // Let caller handle retry or fallback
    }
  }
}

// Singleton instance
module.exports = new EmailRotator();