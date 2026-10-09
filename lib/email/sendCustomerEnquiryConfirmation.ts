
import nodemailer from "nodemailer";

type CustomerEnquiry = {
  id: number;
  contactName: string;
  email: string;
  packageName: string;
  totalUsers: number;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}

export async function sendCustomerEnquiryConfirmation(
  enquiry: CustomerEnquiry
) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const name = escapeHtml(enquiry.contactName);
  const packageName = escapeHtml(enquiry.packageName);
  const reference = `OIQ-${enquiry.id}`;

  await transporter.sendMail({
    from: `"OdinIQ" <${process.env.SMTP_FROM}>`,
    to: enquiry.email,
    replyTo: "hello@odiniq.co.uk",
    subject: `OdinIQ | We've received your enquiry (${reference})`,
    text: [
      `Hi ${enquiry.contactName},`,
      "",
      "Thank you for your interest in OdinIQ.",
      "We've received your licence enquiry and will review your requirements.",
      "",
      `Your reference: ${reference}`,
      `Selected package: Odin ${enquiry.packageName}`,
      `Number of users: ${enquiry.totalUsers}`,
      "",
      "A member of our team will be in touch to discuss your requirements.",
      "",
      "If you have any questions, simply reply to this email.",
      "",
      "Kind regards,",
      "The OdinIQ Team",
      "hello@odiniq.co.uk",
    ].join("\n"),
    html: `
      <div style="margin:0;padding:30px 12px;background:#f1f5f9;font-family:Arial,sans-serif;">
        <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:12px;overflow:hidden;">
          <div style="background:#0f172a;padding:28px;">
            <div style="font-size:30px;font-weight:bold;color:#f59e0b;">
              ODIN<span style="color:#ffffff;">IQ</span>
            </div>
            <div style="color:#cbd5e1;font-size:11px;letter-spacing:2px;margin-top:5px;">
              COMMERCIAL INTELLIGENCE PLATFORM
            </div>
          </div>

          <div style="padding:30px;color:#334155;font-size:15px;line-height:1.7;">
            <h2 style="color:#0f172a;margin-top:0;">
              Thank you for your enquiry
            </h2>

            <p>Hi ${name},</p>

            <p>
              Thank you for your interest in OdinIQ.
              We've received your licence enquiry and
              will review your requirements.
            </p>

            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:25px 0;">
              <div><strong>Reference:</strong> ${reference}</div>
              <div><strong>Package:</strong> Odin ${packageName}</div>
              <div><strong>Users:</strong> ${enquiry.totalUsers}</div>
            </div>

            <p>
              A member of our team will be in touch to
              discuss your requirements and prepare
              a tailored proposal.
            </p>

            <p>
              If you have any questions in the meantime,
              simply reply to this email.
            </p>

            <p>
              Kind regards,<br/>
              <strong>The OdinIQ Team</strong><br/>
              hello@odiniq.co.uk
            </p>
          </div>

          <div style="background:#0f172a;padding:20px;text-align:center;color:#cbd5e1;font-size:12px;">
            OdinIQ | Commercial Intelligence Platform
          </div>
        </div>
      </div>
    `,
  });
}
