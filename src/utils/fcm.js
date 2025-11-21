// src/utils/fcm.js  ← FINAL & SAFE (2025 BEST PRACTICE)
const admin = require('firebase-admin');

// Safe initialization — will NOT crash if env vars missing
let isFcmReady = false;

const initFcm = () => {
  if (admin.apps.length) {
    isFcmReady = true;
    return;
  }

  const { FCM_PROJECT_ID, FCM_PRIVATE_KEY, FCM_CLIENT_EMAIL } = process.env;

  if (!FCM_PROJECT_ID || !FCM_PRIVATE_KEY || !FCM_CLIENT_EMAIL) {
    console.warn('FCM NOT initialized — missing FCM_PROJECT_ID, FCM_PRIVATE_KEY, or FCM_CLIENT_EMAIL in .env');
    console.warn('Push notifications are DISABLED until fixed');
    return;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: FCM_PROJECT_ID,
        privateKey: FCM_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: FCM_CLIENT_EMAIL,
      }),
    });
    isFcmReady = true;
    console.log('FCM Initialized Successfully (Push Notifications ON)');
  } catch (error) {
    console.error('FCM Initialization FAILED:', error.message);
    console.error('Push notifications DISABLED');
    isFcmReady = false;
  }
};

// Run on startup
initFcm();

// Graceful send function
const sendNotification = async (token, title, body, data = {}) => {
  if (!isFcmReady || !token || token === 'null' || token === 'undefined') {
    console.log('FCM Skipped: Not ready or invalid token');
    return false;
  }

  try {
    const message = {
      token,
      notification: { title, body },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default', badge: 1 } } },
    };

    await admin.messaging().send(message);
    console.log(`FCM Sent → ${title}`);
    return true;
  } catch (error) {
    // Handle invalid/expired tokens
    if (error.code === 'messaging/registration-token-not-registered' ||
        error.code === 'messaging/invalid-registration-token') {
      console.log('Invalid FCM token — should be removed from DB:', token);
      // Optional: Delete token from user.fcmToken
    } else {
      console.log('FCM Error:', error.code || error.message);
    }
    return false;
  }
};

module.exports = { sendNotification, isFcmReady };