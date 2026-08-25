import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/legal-page-shell";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms of use for the ROOTK workplace apps.",
};

export default function TermsPage() {
  return (
    <LegalPageShell title="شروط الاستخدام · Terms of Use">
      <p>
        باستخدام تطبيق ROOTK أو المنصة على system.rootk-eg.com فأنت توافق على هذه
        الشروط بصفتك مستخدمًا مخوّلًا من جهة عملك.
      </p>
      <p>
        By using the ROOTK app or system.rootk-eg.com you agree to these terms as
        an authorized workplace user of your employer tenant.
      </p>

      <h2 className="pt-2 text-base font-semibold text-[#0a1220]">1. License</h2>
      <p>
        ROOTK grants a limited, non-exclusive, non-transferable right to use the
        product for legitimate employer business purposes.
      </p>

      <h2 className="pt-2 text-base font-semibold text-[#0a1220]">2. Accounts</h2>
      <p>
        Keep credentials confidential. Employer admins manage access. You must not
        attempt to access other tenants’ data.
      </p>

      <h2 className="pt-2 text-base font-semibold text-[#0a1220]">3. Acceptable use</h2>
      <ul className="list-disc space-y-2 ps-5">
        <li>No unlawful, abusive, or deceptive activity.</li>
        <li>No reverse engineering or security probing without written approval.</li>
        <li>No uploading malware or infringing content.</li>
      </ul>

      <h2 className="pt-2 text-base font-semibold text-[#0a1220]">4. Data</h2>
      <p>
        Workplace data remains subject to your employer’s policies and the{" "}
        <a className="font-semibold text-[#082868]" href="/privacy">
          Privacy Policy
        </a>
        .
      </p>

      <h2 className="pt-2 text-base font-semibold text-[#0a1220]">5. Availability</h2>
      <p>
        We aim for reliable service but do not guarantee uninterrupted
        availability. Offline or connectivity errors may occur.
      </p>

      <h2 className="pt-2 text-base font-semibold text-[#0a1220]">6. Contact</h2>
      <p>
        <a
          className="font-semibold text-[#082868]"
          href="mailto:support@rootk-eg.com"
        >
          support@rootk-eg.com
        </a>
      </p>

      <p className="pt-2 text-xs text-[#5b6b82]">Last updated: 25 August 2026</p>
    </LegalPageShell>
  );
}
