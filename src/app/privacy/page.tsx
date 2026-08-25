import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/legal-page-shell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for the ROOTK mobile and web workplace apps.",
};

export default function PrivacyPage() {
  return (
    <LegalPageShell title="سياسة الخصوصية · Privacy Policy">
      <p>
        تسري هذه السياسة على تطبيق ROOTK للموبايل (Android / iOS) والمنصة الويب على
        <strong> system.rootk-eg.com</strong>. هذه سياسة التطبيق/المنصة وليست صفحة
        الموقع التسويقي.
      </p>
      <p>
        This policy covers the ROOTK mobile apps (Android / iOS) and the web
        workplace at <strong>system.rootk-eg.com</strong>. It is not the marketing
        website privacy notice.
      </p>

      <h2 className="pt-2 text-base font-semibold text-[#0a1220]">1. Controllers</h2>
      <p>
        ROOTK operates the product for employer tenants. Your employer (tenant
        company) is typically the controller of workplace data; ROOTK processes it
        to provide the service.
      </p>

      <h2 className="pt-2 text-base font-semibold text-[#0a1220]">
        2. Data we process
      </h2>
      <ul className="list-disc space-y-2 ps-5">
        <li>
          Account data: work email, name, role/permissions, authentication
          tokens.
        </li>
        <li>
          HR &amp; operations: attendance punches, leave, payroll-related records
          your employer configures, tasks, and CRM leads/activities you enter.
        </li>
        <li>
          Location (when you punch attendance and grant permission): approximate
          or precise device location used to verify office check-in / geofence
          rules. Location is not used for continuous background tracking in the
          current app.
        </li>
        <li>
          Contacts (optional, user-initiated): when you pick a contact to match or
          create a CRM lead. The full address book is not uploaded.
        </li>
        <li>
          Device / diagnostics: basic connectivity and crash-related operational
          logs needed to keep the service available.
        </li>
      </ul>

      <h2 className="pt-2 text-base font-semibold text-[#0a1220]">3. Purposes</h2>
      <p>
        Provide login, HR/CRM workflows, attendance verification, security,
        support, and product improvement for the tenant workspace.
      </p>

      <h2 className="pt-2 text-base font-semibold text-[#0a1220]">4. Sharing</h2>
      <p>
        Data stays within the employer tenant context and ROOTK infrastructure
        needed to run the service. We do not sell personal data. Legal disclosure
        may occur if required by law.
      </p>

      <h2 className="pt-2 text-base font-semibold text-[#0a1220]">5. Retention</h2>
      <p>
        Retention follows the employer’s operational needs and applicable law.
        Authentication sessions expire; employers may request export or deletion
        subject to legal holds.
      </p>

      <h2 className="pt-2 text-base font-semibold text-[#0a1220]">6. Your choices</h2>
      <ul className="list-disc space-y-2 ps-5">
        <li>Deny location or contacts permissions in OS settings (features degrade).</li>
        <li>
          Request account deletion via{" "}
          <a className="font-semibold text-[#082868]" href="/account-deletion">
            /account-deletion
          </a>
          .
        </li>
        <li>
          Contact support:{" "}
          <a
            className="font-semibold text-[#082868]"
            href="mailto:support@rootk-eg.com"
          >
            support@rootk-eg.com
          </a>
          .
        </li>
      </ul>

      <h2 className="pt-2 text-base font-semibold text-[#0a1220]">7. Children</h2>
      <p>
        ROOTK is a workplace product for authorized employees. It is not directed
        to children.
      </p>

      <p className="pt-2 text-xs text-[#5b6b82]">
        Last updated: 25 August 2026
      </p>
    </LegalPageShell>
  );
}
