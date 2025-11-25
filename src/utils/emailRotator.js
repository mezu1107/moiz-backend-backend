// src/utils/emailRotator.js
const nodemailer = require('nodemailer');

class EmailRotator {
  constructor() {
    this.accounts = [];
    this.currentIndex = 0;
    this.loadAccounts();
  }

  loadAccounts() {
    for (let i = 1; i <= 10; i++) {
      const user = process.env[`EMAIL_USER_${i}`];
      const pass = process.env[`EMAIL_PASS_${i}`];
      if (user && pass) {
        this.accounts.push({ user, pass });
      }
    }

    if (this.accounts.length === 0) {
      console.warn('No Gmail accounts found in .env → Switching to Ethereal (test mode)');
      this.useEthereal();
    } else {
      console.log(`Email Rotator Ready → ${this.accounts.length} Gmail account(s) loaded`);
    }
  }

  async useEthereal() {
    const testAccount = await nodemailer.createTestAccount();
    this.accounts = [{
      user: testAccount.user,
      pass: testAccount.pass
    }];
    console.log('Ethereal Test Email Active → Check:', nodemailer.getTestMessageUrl);
  }

  getNextAccount() {
    if (this.accounts.length === 0) return null;
    const account = this.accounts[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.accounts.length;
    return account;
  }

  async sendMail(mailOptions) {
    const account = this.getNextAccount();
    if (!account) throw new Error('No email account available');

    // FIXED: createTransport (not createTransporter!)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: account.user,
        pass: account.pass
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    mailOptions.from = `"FoodApp" <${account.user}>`;

    const info = await transporter.sendMail(mailOptions);

    // Only show Ethereal URL in dev
    if (process.env.NODE_ENV === 'development' && info.messageId.includes('ethereal')) {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }

    return info;
  }
}

module.exports = new EmailRotator();