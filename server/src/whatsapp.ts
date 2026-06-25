import https from 'https';
import dotenv from 'dotenv';
import { logger } from './logger';

dotenv.config();

const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID || '';
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN || '';
const twilioFrom = process.env.TWILIO_FROM_WHATSAPP_NUMBER || '';

const isWhatsAppConfigured = !!(twilioAccountSid && twilioAuthToken && twilioFrom);

if (isWhatsAppConfigured) {
  logger.info('[WhatsApp] Twilio WhatsApp API configuration detected.');
} else {
  logger.info('[WhatsApp] Twilio credentials not set. WhatsApp messages will log to local stdout/logs.');
}

export interface WhatsAppDetails {
  customerName: string;
  phone: string;
  reservationId: string;
  date: string;
  time: string;
  guests: number;
  tableNumber: string | null;
}

/**
 * Standard E.164 phone formatting helper
 */
function formatE164(phone: string): string {
  let cleaned = phone.replace(/[\s\-()]/g, '');
  if (!cleaned.startsWith('+')) {
    if (cleaned.length === 10) {
      cleaned = '+91' + cleaned; // default country code for India
    } else {
      cleaned = '+' + cleaned;
    }
  }
  return cleaned;
}

export async function sendConfirmationWhatsApp(details: WhatsAppDetails): Promise<boolean> {
  const formattedPhone = formatE164(details.phone);
  const bodyText = `Dear ${details.customerName},

Thank you for choosing Bon Appetite Cafe and Restro! We are pleased to confirm your reservation.

Booking Details:
----------------------------
Booking ID / Unique Code: ${details.reservationId}
Date: ${details.date}
Time Slot: ${details.time}
Guests: ${details.guests}
Table Assignment: ${details.tableNumber || 'Assigned on arrival'}
----------------------------

We look forward to welcoming you!
Bon Appetite Cafe & Restro`;

  if (isWhatsAppConfigured) {
    return new Promise((resolve) => {
      const postData = new URLSearchParams({
        To: `whatsapp:${formattedPhone}`,
        From: `whatsapp:${twilioFrom}`,
        Body: bodyText,
      }).toString();

      const options = {
        hostname: 'api.twilio.com',
        port: 443, // HTTPS standard port
        path: `/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
          'Authorization': 'Basic ' + Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64'),
        },
      };

      // Create secure request using Node.js built-in https module (avoids npm fetch libraries)
      const req = https.request(
        options,
        (res) => {
          let body = '';
          res.on('data', (chunk) => { body += chunk; });
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              logger.info(`📲 [WhatsApp] Message successfully sent to: ${formattedPhone}`);
              resolve(true);
            } else {
              logger.error(`❌ [WhatsApp] Twilio returned status ${res.statusCode}: ${body}`);
              resolve(false);
            }
          });
        }
      );

      req.on('error', (err) => {
        logger.error(`❌ [WhatsApp] Error contacting Twilio: ${err.message}`);
        resolve(false);
      });

      req.write(postData);
      req.end();
    });
  }

  // Fallback logging output
  console.log('\n================== [MOCK WHATSAPP DISPATCHED] ==================');
  console.log(`To: ${formattedPhone} (whatsapp:${formattedPhone})`);
  console.log(`From: whatsapp:${twilioFrom || '+14155238886 (Twilio Sandbox)'}`);
  console.log('--------------------------------------------------------------');
  console.log(bodyText);
  console.log('================================================================\n');

  logger.info(`📲 [WhatsApp] Mock confirmation printed to terminal logs for: ${formattedPhone}`);
  return true;
}
