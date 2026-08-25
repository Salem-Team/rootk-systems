import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/legal-page-shell";

export const metadata: Metadata = {
  title: "Support",
  description: "Support contact for the ROOTK workplace apps.",
};

export default function SupportPage() {
  return (
    <LegalPageShell title="الدعم · Support">
      <p>
        للدعم الفني لتطبيق ROOTK ومنصة system.rootk-eg.com تواصل معنا عبر البريد
        أدناه. يُفضّل استخدام إيميل العمل المسجّل في حسابك.
      </p>
      <p>
        For technical support with the ROOTK app or system.rootk-eg.com, email us
        below. Prefer your registered work email so we can locate your tenant
        account.
      </p>

      <h2 className="pt-2 text-base font-semibold text-[#0a1220]">Contact</h2>
      <p>
        Email:{" "}
        <a
          className="font-semibold text-[#082868]"
          href="mailto:support@rootk-eg.com?subject=ROOTK%20Support"
        >
          support@rootk-eg.com
        </a>
      </p>
      <p>Typical response time: within 1–2 business days.</p>

      <h2 className="pt-2 text-base font-semibold text-[#0a1220]">
        Common requests
      </h2>
      <ul className="list-disc space-y-2 ps-5">
        <li>Login / password reset (employer admin can also reset)</li>
        <li>
          Account deletion — see{" "}
          <a className="font-semibold text-[#082868]" href="/account-deletion">
            /account-deletion
          </a>
        </li>
        <li>Privacy questions — see{" "}
          <a className="font-semibold text-[#082868]" href="/privacy">
            /privacy
          </a>
        </li>
        <li>Mobile app install or update issues</li>
      </ul>

      <h2 className="pt-2 text-base font-semibold text-[#0a1220]">Legal</h2>
      <p>
        <a className="font-semibold text-[#082868]" href="/terms">
          Terms of Use
        </a>{" "}
        ·{" "}
        <a className="font-semibold text-[#082868]" href="/privacy">
          Privacy Policy
        </a>
      </p>
    </LegalPageShell>
  );
}
