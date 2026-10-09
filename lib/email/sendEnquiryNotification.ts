
import nodemailer from "nodemailer";

type EnquiryNotification = {
  id: number;
  companyName: string;
  contactName: string;
  email: string;
  telephone: string | null;
  packageName: string;
  totalUsers: number;
  requirements: string | null;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendEnquiryNotification(
  enquiry: EnquiryNotification
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

  const reference = `OIQ-${enquiry.id}`;

  const users =
    enquiry.packageName === "Corporate"
      ? "Bespoke"
      : String(enquiry.totalUsers);

  const company = escapeHtml(enquiry.companyName);
  const contact = escapeHtml(enquiry.contactName);
  const email = escapeHtml(enquiry.email);
  const telephone = escapeHtml(
    enquiry.telephone || "Not provided"
  );
  const packageName = escapeHtml(enquiry.packageName);
  const requirements = escapeHtml(
    enquiry.requirements || "None provided"
  ).replace(/\r?\n/g, "<br>");

  // Only generate a dashboard link when a real URL is configured.
  const baseUrl = process.env.ODINIQ_APP_URL?.trim();
  let enquiryUrl: string | null = null;

  if (baseUrl) {
    try {
      const parsed = new URL(baseUrl);

      if (
        parsed.protocol === "https:" ||
        parsed.protocol === "http:"
      ) {
        enquiryUrl = new URL(
          `/website-enquiries/${enquiry.id}`,
          parsed
        ).toString();
      }
    } catch {
      console.warn("Invalid ODINIQ_APP_URL configuration");
    }
  }

  const dashboardButton = enquiryUrl
    ? `
      <tr>
        <td align="center" style="padding:26px 30px 8px;">
          <a
            href="${escapeHtml(enquiryUrl)}"
            style="display:inline-block;background:#f59e0b;color:#0f172a;
            font-family:Arial,sans-serif;font-size:15px;font-weight:bold;
            text-decoration:none;padding:15px 28px;border-radius:7px;"
          >
            View Enquiry in OdinIQ
          </a>
        </td>
      </tr>
    `
    : "";

  const html = `
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>New OdinIQ Licence Enquiry</title>

  <style>
    @media only screen and (max-width: 600px) {
      .email-outer {
        padding: 12px 6px !important;
      }

      .email-container {
        width: 100% !important;
        max-width: 100% !important;
      }

      .email-padding {
        padding: 20px 18px !important;
      }

      .email-details {
        width: 100% !important;
      }

      .email-details td {
        display: block !important;
        width: auto !important;
        padding: 5px 0 !important;
        overflow-wrap: anywhere !important;
      }

      
.email-details tr {
  display: block !important;
  padding: 3px 0 !important;
}

.email-details td {
  display: block !important;
  width: auto !important;
  padding: 2px 0 !important;
  overflow-wrap: anywhere !important;
  line-height: 1.4 !important;
}

.email-details td[colspan] {
  display: block !important;
  padding: 9px !important;
  font-size: 12px !important;
}


      .email-details td[colspan] {
        display: block !important;
        padding: 12px !important;
      }
    }
  </style>
</head>

<body style="margin:0;padding:0;background:#f1f5f9;">
  <table role="presentation" cellpadding="0" cellspacing="0"
    width="100%" style="background:#f1f5f9;">
    <tr>
      <td align="center" class="email-outer" style="padding:32px 12px;">

        <table role="presentation" cellpadding="0" cellspacing="0"
          width="100%" class="email-container" style="max-width:600px;background:#ffffff;
          border-radius:12px;overflow:hidden;">

          <tr>
            <td class="email-padding" style="background:#0f172a;padding:30px;">
              <div style="font-family:Arial,sans-serif;
                font-size:29px;font-weight:bold;color:#f59e0b;">
                ODIN<span style="color:#ffffff;">IQ</span>
              </div>
              <div style="font-family:Arial,sans-serif;
                font-size:12px;color:#cbd5e1;
                letter-spacing:2px;margin-top:7px;">
                PLATFORM ADMINISTRATION
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:30px 30px 15px;">
              <div style="font-family:Arial,sans-serif;
                font-size:12px;font-weight:bold;
                color:#b45309;letter-spacing:1px;">
                NEW LICENCE ENQUIRY
              </div>

              <h1 style="font-family:Arial,sans-serif;
                font-size:25px;color:#0f172a;
                margin:12px 0 8px;">
                ${company}
              </h1>

              <p style="font-family:Arial,sans-serif;
                font-size:14px;color:#64748b;margin:0;">
                Reference: <strong>${reference}</strong>
              </p>
            </td>
          </tr>

          <tr>
            <td class="email-padding" style="padding:15px 30px;">
              <table role="presentation" width="100%"
                cellpadding="0" cellspacing="0"
                class="email-details" style="border-collapse:collapse;
                font-family:Arial,sans-serif;font-size:14px;">

                <tr>
                  <td colspan="2" style="padding:12px;
                    background:#f8fafc;color:#0f172a;
                    font-weight:bold;">
                    CUSTOMER DETAILS
                  </td>
                </tr>

                <tr>
                  <td style="padding:13px 10px;color:#64748b;">
                    Contact
                  </td>
                  <td style="padding:13px 10px;color:#0f172a;">
                    ${contact}
                  </td>
                </tr>

                <tr>
                  <td style="padding:13px 10px;color:#64748b;">
                    Email
                  </td>
                  <td style="padding:13px 10px;overflow-wrap:anywhere;">
                    <a href="mailto:${email}"
                      style="color:#b45309;">
                      ${email}
                    </a>
                  </td>
                </tr>

                <tr>
                  <td style="padding:13px 10px;color:#64748b;">
                    Telephone
                  </td>
                  <td style="padding:13px 10px;color:#0f172a;">
                    ${telephone}
                  </td>
                </tr>

                <tr>
                  <td colspan="2" style="padding:12px;
                    background:#f8fafc;color:#0f172a;
                    font-weight:bold;">
                    LICENCE REQUIREMENTS
                  </td>
                </tr>

                <tr>
                  <td style="padding:13px 10px;color:#64748b;">
                    Package
                  </td>
                  <td style="padding:13px 10px;color:#0f172a;
                    font-weight:bold;">
                    Odin ${packageName}
                  </td>
                </tr>

                <tr>
                  <td style="padding:13px 10px;color:#64748b;">
                    Users
                  </td>
                  <td style="padding:13px 10px;color:#0f172a;">
                    ${users}
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:10px 30px;">
              <div style="background:#f8fafc;
                border-left:4px solid #f59e0b;
                padding:18px;">

                <div style="font-family:Arial,sans-serif;
                  font-size:12px;font-weight:bold;
                  color:#64748b;margin-bottom:10px;">
                  ADDITIONAL REQUIREMENTS
                </div>

                <div style="font-family:Arial,sans-serif;
                  font-size:14px;line-height:1.7;
                  color:#0f172a;overflow-wrap:anywhere;">
                  ${requirements}
                </div>

              </div>
            </td>
          </tr>

          ${dashboardButton}

          <tr>
            <td style="padding:30px;text-align:center;">
              <p style="font-family:Arial,sans-serif;
                font-size:12px;color:#94a3b8;
                margin:0;">
                Automated notification from OdinIQ
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#0f172a;
              padding:18px;text-align:center;">
              <span style="font-family:Arial,sans-serif;
                font-size:12px;color:#cbd5e1;">
                OdinIQ | Commercial Intelligence Platform
              </span>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  // Plain-text fallback for email clients without HTML support.
  const message = [
    `New OdinIQ Licence Enquiry - ${reference}`,
    "",
    `Company: ${enquiry.companyName}`,
    `Contact: ${enquiry.contactName}`,
    `Email: ${enquiry.email}`,
    `Telephone: ${enquiry.telephone || "Not provided"}`,
    `Package: Odin ${enquiry.packageName}`,
    `Users: ${users}`,
    "",
    "Additional Requirements:",
    enquiry.requirements || "None provided",
    ...(enquiryUrl ? ["", `View Enquiry: ${enquiryUrl}`] : []),
  ].join("\n");

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: process.env.ENQUIRY_NOTIFICATION_EMAIL,
    replyTo: enquiry.email,
    subject: `OdinIQ Enquiry ${reference} - ${enquiry.companyName}`,
    text: message,
    html,
  });
}
