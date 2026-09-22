import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth/requireAuth";
import { switchCompany } from "@/app/actions/switchCompany";

export default async function SelectCompanyPage() {
  const user = await requireAuth();

  const memberships = user.memberships.filter(
    (membership) => membership.active
  );

  if (memberships.length === 0) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f4f6f8",
          padding: "24px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "520px",
            background: "#ffffff",
            border: "1px solid #dddddd",
            borderRadius: "12px",
            padding: "32px",
          }}
        >
          <h1
            style={{
              marginTop: 0,
              marginBottom: "12px",
            }}
          >
            No company access
          </h1>

          <p
            style={{
              margin: 0,
              color: "#555555",
            }}
          >
            Your OdinIQ account does not currently
            have access to an active company.
          </p>
        </div>
      </main>
    );
  }

  /*
   * If there is only one company available,
   * select it automatically.
   */
  if (memberships.length === 1) {
    const formData = new FormData();

    formData.set(
      "companyId",
      String(memberships[0].companyId)
    );

    await switchCompany(formData);

    redirect("/dashboard");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f4f6f8",
        padding: "48px 24px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "760px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: "#d97706",
              marginBottom: "8px",
            }}
          >
            OdinIQ
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "32px",
            }}
          >
            Select company
          </h1>

          <p
            style={{
              color: "#666666",
              marginTop: "10px",
            }}
          >
            Choose the company workspace you want
            to enter.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gap: "16px",
          }}
        >
          {memberships.map((membership) => (
            <form
              key={membership.id}
              action={switchCompany}
            >
              <input
                type="hidden"
                name="companyId"
                value={membership.companyId}
              />

              <button
                type="submit"
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: "#ffffff",
                  border: "1px solid #dddddd",
                  borderRadius: "12px",
                  padding: "22px",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    marginBottom: "6px",
                  }}
                >
                  {membership.company.name}
                </div>

                <div
                  style={{
                    fontSize: "14px",
                    color: "#666666",
                  }}
                >
                  {membership.role?.name ??
                    "Company member"}
                </div>
              </button>
            </form>
          ))}
        </div>
      </div>
    </main>
  );
}