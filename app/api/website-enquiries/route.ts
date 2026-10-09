
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEnquiryNotification } from "@/lib/email/sendEnquiryNotification";
import { sendCustomerEnquiryConfirmation } from "@/lib/email/sendCustomerEnquiryConfirmation";
import { checkWebsiteEnquiryRateLimit } from "@/lib/security/websiteEnquiryRateLimit";

export const runtime = "nodejs";


const packages = {
  Starter: { users: 3, modules: 2, discount: 0 },
  Business: { users: 10, modules: 5, discount: 10 },
  Professional: { users: 25, modules: 9, discount: 20 },
  Enterprise: { users: 50, modules: 12, discount: 30 },
  Corporate: { users: 0, modules: 0, discount: 0 },
} as const;


const availableModules = [
  "Sales Intelligence",
  "Customer Intelligence",
  "Product & Stock",
  "Profit & Margin",
  "Quotes & Opportunities",
  "Warehouse & Dispatch",
  "Commercial Agreements",
  "Purchasing Intelligence",
  "Expenses",
  "People & Leave",
  "Marketing & Investment",
  "Documents & Audit",
];

function validText(
  value: unknown,
  maxLength: number
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= maxLength
  );
}

export async function POST(request: NextRequest) {
  try {
    const visitorIp =
      process.env.NODE_ENV === "development"
        ? "local-development"
        : null;

    if (!visitorIp) {
      return NextResponse.json(
        { error: "Enquiry submissions are temporarily unavailable." },
        { status: 503 }
      );
    }

    const allowed = await checkWebsiteEnquiryRateLimit(visitorIp);

    if (!allowed) {
      return NextResponse.json(
        { error: "Too many enquiries. Please try again later." },
        { status: 429 }
      );
    }


    
const MAX_BODY_BYTES = 10000;

const contentLength = Number(
  request.headers.get("content-length") ?? 0
);

if (
  !Number.isFinite(contentLength) ||
  contentLength < 0 ||
  contentLength > MAX_BODY_BYTES
) {
  return NextResponse.json(
    { error: "Request too large." },
    { status: 413 }
  );
}

const reader = request.body?.getReader();

if (!reader) {
  return NextResponse.json(
    { error: "Invalid request." },
    { status: 400 }
  );
}

const chunks: Uint8Array[] = [];
let totalBytes = 0;

while (true) {
  const { done, value } = await reader.read();

  if (done) break;

  totalBytes += value.byteLength;

  if (totalBytes > MAX_BODY_BYTES) {
    await reader.cancel();

    return NextResponse.json(
      { error: "Request too large." },
      { status: 413 }
    );
  }

  chunks.push(value);
}

const rawBody = Buffer.concat(chunks).toString("utf8");

let body: unknown;

try {
  body = JSON.parse(rawBody);
} catch {
  return NextResponse.json(
    { error: "Invalid JSON request." },
    { status: 400 }
  );
}


    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid request." },
        { status: 400 }
      );
    }
const enquiryBody = body as Record<string, unknown>;

    // Honeypot field: ordinary visitors leave this empty.
    if (enquiryBody.website) {
      return NextResponse.json({ success: true });
    }

    const {
      companyName,
      contactName,
      email,
      telephone,
      requirements,
      packageName,
      totalUsers,
      selectedModules,
    } = enquiryBody;

    if (
      !validText(companyName, 150) ||
      !validText(contactName, 150) ||
      !validText(email, 254)
    ) {
      return NextResponse.json(
        { error: "Please complete the required contact details." },
        { status: 400 }
      );
    }

    const emailAddress = email.trim();
if (
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress) ||
  emailAddress.includes("..")
) {
  return NextResponse.json(
    { error: "Please enter a valid email address." },
    { status: 400 }
  );
}


    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (
      (telephone != null &&
        telephone !== "" &&
        (typeof telephone !== "string" || telephone.length > 40)) ||
      (requirements != null &&
        requirements !== "" &&
        (typeof requirements !== "string" || requirements.length > 2000))
    ) {
      return NextResponse.json(
        { error: "Invalid contact information." },
        { status: 400 }
      );
    }

    if (
      typeof packageName !== "string" ||
      !Object.prototype.hasOwnProperty.call(packages, packageName)
    ) {
      return NextResponse.json(
        { error: "Invalid licence package." },
        { status: 400 }
      );
    }

    const selectedPackage =
      packages[packageName as keyof typeof packages];

    
if (
  typeof totalUsers !== "number" ||
  !Number.isSafeInteger(totalUsers) ||
  totalUsers < (packageName === "Corporate" ? 0 : 1) ||
  totalUsers > 10000 ||
  (packageName === "Corporate" && totalUsers !== 0)
) {
  return NextResponse.json(
    { error: "Invalid user quantity." },
    { status: 400 }
  );
}


    if (
      !Array.isArray(selectedModules) ||
      selectedModules.length > availableModules.length ||
      selectedModules.some(
        (name: unknown) =>
          typeof name !== "string" ||
          !availableModules.includes(name)
      ) ||
      new Set(selectedModules).size !== selectedModules.length
    ) {
      return NextResponse.json(
        { error: "Invalid module selection." },
        { status: 400 }
      );
    }

    const enquiry = await prisma.websiteEnquiry.create({
      data: {
        companyName: companyName.trim(),
        contactName: contactName.trim(),
        email: emailAddress.toLowerCase(),
        telephone: telephone?.trim() || null,
        requirements: requirements?.trim() || null,

        packageName,
        totalUsers,
        includedUsers: selectedPackage.users,
        additionalUsers: Math.max(
          0,
          totalUsers - selectedPackage.users
        ),
        userDiscount: selectedPackage.discount,

        selectedModules: JSON.stringify(selectedModules),
        includedModules: selectedPackage.modules,
        additionalModules: Math.max(
          0,
          selectedModules.length - selectedPackage.modules
        ),
      },
    });

    try {
      await sendEnquiryNotification(enquiry);
    } catch (emailError) {
      console.error(
        `Failed to send notification for OIQ-${enquiry.id}:`,
        emailError
      );
    }

    try {
      await sendCustomerEnquiryConfirmation(enquiry);
    } catch (emailError) {
      console.error(
        `Failed to send customer confirmation for OIQ-${enquiry.id}:`,
        emailError
      );
    }

    return NextResponse.json(
      { success: true, reference: enquiry.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Website enquiry submission failed:", error);

    return NextResponse.json(
      { error: "Unable to submit enquiry. Please try again." },
      { status: 500 }
    );
  }
}
