import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

interface VerificationEmailParams {
  to: string;
  schoolName: string;
  adminName: string;
  verificationToken: string;
}

export async function sendTrialVerificationEmail(params: VerificationEmailParams): Promise<boolean> {
  const verificationUrl = `${process.env.NODE_ENV === 'production' ? 'https://' + process.env.REPLIT_DOMAINS : 'http://localhost:5000'}/verify-trial?token=${params.verificationToken}`;
  
  try {
    await mailService.send({
      to: params.to,
      from: {
        email: 'noreply@passpilotsystem.com',
        name: 'PassPilot'
      },
      subject: 'Verify Your PassPilot Trial Account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your PassPilot Trial</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Welcome to PassPilot!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Your 30-day free trial is almost ready</p>
          </div>
          
          <div style="background: white; padding: 40px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">Hi ${params.adminName},</h2>
            
            <p>Thank you for registering <strong>${params.schoolName}</strong> for a PassPilot trial! You're just one step away from accessing our complete student pass management system.</p>
            
            <div style="background: #f8fafc; border-left: 4px solid #667eea; padding: 20px; margin: 25px 0;">
              <h3 style="margin: 0 0 10px 0; color: #333;">Your Trial Includes:</h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li><strong>Unlimited teachers</strong> during your 30-day trial</li>
                <li>Complete student pass tracking system</li>
                <li>Real-time reporting and analytics</li>
                <li>Mobile-friendly interface for classroom use</li>
                <li>Full administrative controls</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 35px 0;">
              <a href="${verificationUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block;">
                Verify Email & Start Trial
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${verificationUrl}" style="color: #667eea; word-break: break-all;">${verificationUrl}</a>
            </p>
            
            <p style="font-size: 14px; color: #666; margin-top: 25px;">
              This verification link will expire in 24 hours. If you didn't request this trial, you can safely ignore this email.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>PassPilot - Professional Student Pass Management<br>
            This email was sent to verify your trial registration.</p>
          </div>
        </body>
        </html>
      `,
      text: `
Hi ${params.adminName},

Thank you for registering ${params.schoolName} for a PassPilot trial!

To complete your registration and start your 30-day free trial, please verify your email by clicking this link:
${verificationUrl}

Your trial includes:
- Unlimited teachers during your 30-day trial
- Complete student pass tracking system
- Real-time reporting and analytics
- Mobile-friendly interface for classroom use
- Full administrative controls

This verification link will expire in 24 hours.

If you didn't request this trial, you can safely ignore this email.

Best regards,
The PassPilot Team
      `
    });
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

export async function sendPasswordResetEmail(email: string, resetToken: string, userName: string): Promise<boolean> {
  const resetUrl = `${process.env.NODE_ENV === 'production' ? 'https://' + process.env.REPLIT_DOMAINS : 'http://localhost:5000'}/reset-password?token=${resetToken}`;
  
  try {
    await mailService.send({
      to: email,
      from: {
        email: 'noreply@passpilotsystem.com',
        name: 'PassPilot'
      },
      subject: 'Reset Your PassPilot Password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your PassPilot Password</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Password Reset</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Reset your PassPilot password</p>
          </div>
          
          <div style="background: white; padding: 40px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">Hi ${userName},</h2>
            
            <p>We received a request to reset your PassPilot password. If you made this request, click the button below to create a new password:</p>
            
            <div style="text-align: center; margin: 35px 0;">
              <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">Reset Password</a>
            </div>
            
            <p style="color: #666; font-size: 14px; border-top: 1px solid #eee; padding-top: 20px;">
              <strong>Security Notice:</strong> This reset link will expire in 1 hour for your security. If you didn't request this reset, please ignore this email - your password will remain unchanged.
            </p>
            
            <p style="color: #888; font-size: 12px; margin-top: 30px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <span style="word-break: break-all;">${resetUrl}</span>
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
Hi ${userName},

We received a request to reset your PassPilot password.

To reset your password, click this link: ${resetUrl}

This reset link will expire in 1 hour for your security.

If you didn't request this reset, please ignore this email - your password will remain unchanged.

Best regards,
The PassPilot Team
      `
    });
    
    console.log('Password reset email sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
}