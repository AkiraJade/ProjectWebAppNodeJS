const nodemailer = require('nodemailer');
const fs = require('fs');

const sendEmail = async (options) => {
    const useSMTP = process.env.SMTP_HOST && process.env.SMTP_EMAIL;

    let transporter;
    if (useSMTP) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT, 10), // must be a number, not a string
            secure: false, // STARTTLS — required for port 2525 (Mailtrap sandbox)
            auth: {
                user: process.env.SMTP_EMAIL,
                pass: process.env.SMTP_PASSWORD
            }
        });
    } else {
        console.log(`\n================== [OUTGOING EMAIL LOG] ==================`);
        console.log(`To: ${options.email}`);
        console.log(`Subject: ${options.subject}`);
        console.log(`Body (HTML): ${options.message}`);
        if (options.attachments && options.attachments.length > 0) {
            console.log(`Attachments:`);
            options.attachments.forEach(att => console.log(`  - Name: ${att.filename} | Path: ${att.path}`));
        }
        console.log(`==========================================================\n`);
        
        try {
            const testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
                host: "smtp.ethereal.email",
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass
                }
            });
        } catch (err) {
            console.log("Failed to initialize Ethereal mailer fallback, console logging is complete.");
            return;
        }
    }

    const message = {
        from: `${process.env.SMTP_FROM_NAME || 'Little Mono Shop'} <${process.env.SMTP_FROM_EMAIL || 'shop@littlemono.com'}>`,
        to: options.email,
        subject: options.subject,
        html: options.message,
        attachments: options.attachments || []
    };

    // Log outgoing email details (always, for debugging)
    console.log(`[EMAIL] Sending to: ${message.to} | Subject: ${message.subject}`);
    if (message.attachments.length > 0) {
        message.attachments.forEach(att => {
            const exists = fs.existsSync(att.path);
            const size   = exists ? fs.statSync(att.path).size : 0;
            console.log(`[EMAIL] Attachment: ${att.filename} | Path: ${att.path} | Exists: ${exists} | Size: ${size} bytes`);
        });
    }

    try {
        const info = await transporter.sendMail(message);
        console.log(`[EMAIL] Sent OK. MessageId: ${info.messageId}`);
        if (!useSMTP) {
            console.log(`[EMAIL LOG] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
        }
    } catch (sendErr) {
        console.error("Mail transmission failed:", sendErr);
    }
};

module.exports = sendEmail;

