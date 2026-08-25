import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/legal-page-shell";

export const metadata: Metadata = {
  title: "Account deletion",
  description: "How to request deletion of a ROOTK workplace account.",
};

export default function AccountDeletionPage() {
  return (
    <LegalPageShell title="حذف الحساب · Account deletion">
      <p>
        وفق متطلبات متاجر التطبيقات، يمكن طلب حذف حساب ROOTK المرتبط ببريد العمل.
      </p>
      <p>
        Per app-store requirements, you can request deletion of your ROOTK
        workplace account tied to your work email.
      </p>

      <h2 className="pt-2 text-base font-semibold text-[#0a1220]">How to request</h2>
      <ol className="list-decimal space-y-2 ps-5">
        <li>Sign in (if you still can) and open Settings → My account.</li>
        <li>
          Or email{" "}
          <a
            className="font-semibold text-[#082868]"
            href="mailto:support@rootk-eg.com?subject=ROOTK%20Account%20Deletion%20Request"
          >
            support@rootk-eg.com
          </a>{" "}
          from your work email with subject “Account Deletion Request”.
        </li>
        <li>
          Include: full name, work email, company/tenant name, and whether you
          also want related HR records removed (subject to employer legal
          retention).
        </li>
      </ol>

      <h2 className="pt-2 text-base font-semibold text-[#0a1220]">Timing</h2>
      <p>
        We typically process verified requests within 30 days, unless your
        employer must retain records for legal/payroll obligations. Access is
        revoked first; residual backups expire on the normal rotation schedule.
      </p>

      <h2 className="pt-2 text-base font-semibold text-[#0a1220]">Employer-managed accounts</h2>
      <p>
        If your employer owns the tenant, an admin may also deactivate or delete
        your login from the control center. Employer retention policies may
        override full erasure of payroll/attendance archives.
      </p>

      <p className="pt-2 text-xs text-[#5b6b82]">Last updated: 25 August 2026</p>
    </LegalPageShell>
  );
}
