import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const emailHost = process.env.EMAIL_HOST || '';
const emailPort = parseInt(process.env.EMAIL_PORT || '587');
const emailUser = process.env.EMAIL_USER || '';
const emailPass = process.env.EMAIL_PASS || '';
const emailFrom = process.env.EMAIL_FROM || '"Bon Appetite Cafe" <reservations@bonappetite.com>';

const isEmailConfigured = !!(emailHost && emailUser && emailPass);

let transporter: nodemailer.Transporter | null = null;

if (isEmailConfigured) {
  transporter = nodemailer.createTransport({
    host: emailHost,
    port: emailPort,
    secure: emailPort === 465, // true for port 465, false for other ports
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });
  console.log('✨ [Email] SMTP Transporter configured.');
} else {
  console.log('ℹ️ [Email] SMTP credentials not set. Emails will be logged to local stdout/logs.');
}

export interface EmailDetails {
  customerName: string;
  email: string;
  reservationId: string;
  date: string;
  time: string;
  guests: number;
  tableNumber: string | null;
}

/**
 * Dispatches a transaction reservation email.
 * Falls back to logging if SMTP is not configured in environment.
 */
export async function sendConfirmationEmail(details: EmailDetails): Promise<boolean> {
  const subject = `Reservation Confirmed - Bon Appetite Cafe and Restro`;
  
  const textContent = `
Dear ${details.customerName},

Thank you for choosing Bon Appetite Cafe and Restro. We are delighted to confirm your gourmet reservation.

Reservation Details:
------------------------------------------
Booking ID: ${details.reservationId}
Date: ${details.date}
Time Slot: ${details.time}
Guests: ${details.guests}
Table Assignment: ${details.tableNumber || 'To be assigned'}
------------------------------------------

If you need to change or cancel your reservation, please use the Reservation Portal on our website.

We look forward to offering you a premium culinary experience.

Warm regards,
Concierge Service
Bon Appetite Cafe and Restro
  `;

  const htmlContent = `
    <div style="background-color: #1C1410; color: #F5EFE6; font-family: 'Playfair Display', Georgia, serif; padding: 40px; border-radius: 8px; max-width: 600px; margin: 0 auto; border: 1px solid #D4AF37;">
      <div style="text-align: center; border-bottom: 1px dashed rgba(212, 175, 55, 0.3); padding-bottom: 20px;">
        <h1 style="color: #D4AF37; margin: 0; font-size: 24px; letter-spacing: 2px; text-transform: uppercase;">Bon Appetite</h1>
        <p style="color: #C5A880; font-style: italic; margin: 5px 0 0 0; font-size: 14px;">Cafe & Restro</p>
      </div>
      
      <div style="padding: 30px 10px; font-family: 'Inter', Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #F5EFE6;">
        <p>Dear ${details.customerName},</p>
        <p>Thank you for choosing <strong>Bon Appetite Cafe and Restro</strong>. We are delighted to confirm your upcoming reservation.</p>
        
        <div style="background-color: rgba(212, 175, 55, 0.05); border: 1px solid rgba(212, 175, 55, 0.2); padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3 style="color: #D4AF37; margin-top: 0; border-bottom: 1px solid rgba(212, 175, 55, 0.1); padding-bottom: 8px; text-transform: uppercase; font-size: 12px; letter-spacing: 1.5px;">Reservation Receipt</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="padding: 5px 0; color: #C5A880;">Booking ID:</td>
              <td style="padding: 5px 0; font-weight: bold; text-align: right;">${details.reservationId}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #C5A880;">Date:</td>
              <td style="padding: 5px 0; text-align: right;">${details.date}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #C5A880;">Time Slot:</td>
              <td style="padding: 5px 0; text-align: right;">${details.time}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #C5A880;">Guests:</td>
              <td style="padding: 5px 0; text-align: right;">${details.guests}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #C5A880;">Table Assignment:</td>
              <td style="padding: 5px 0; text-align: right; color: #D4AF37; font-weight: bold;">${details.tableNumber || 'Assigned on Arrival'}</td>
            </tr>
          </table>
        </div>
        
        <p style="font-style: italic; color: #C5A880; font-size: 13px;">
          Note: If you wish to cancel or modify your reservation, please visit the Customer History portal on our website.
        </p>
      </div>

      <div style="text-align: center; border-t: 1px solid rgba(212, 175, 55, 0.1); pt: 20px; font-size: 11px; color: #C5A880; opacity: 0.7;">
        <p>&copy; ${new Date().getFullYear()} Bon Appetite Cafe and Restro. All Rights Reserved.</p>
        <p>12 Rue de l'Elégance, Gourmet District</p>
      </div>
    </div>
  `;

  if (transporter && isEmailConfigured) {
    try {
      await transporter.sendMail({
        from: emailFrom,
        to: details.email,
        subject: subject,
        text: textContent,
        html: htmlContent,
      });
      console.log(`✉️ [Email] Confirmation successfully sent to: ${details.email}`);
      return true;
    } catch (error) {
      console.error('❌ [Email] Error sending email via SMTP:', error);
      // Fallback log
    }
  }

  // Print email card nicely in console output
  console.log('\n================== [MOCK EMAIL DISPATCHED] ==================');
  console.log(`To: ${details.email}`);
  console.log(`Subject: ${subject}`);
  console.log(textContent);
  console.log('=============================================================\n');
  return true;
}
