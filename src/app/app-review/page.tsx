import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/legal-page-shell";

export const metadata: Metadata = {
  title: "App Review Notes",
  description: "Notes for Google Play and App Store reviewers.",
  robots: { index: false, follow: false },
};

export default function AppReviewPage() {
  return (
    <LegalPageShell title="App Review Notes · ملاحظات المراجعة" dir="ltr">
      <p>
        ROOTK is a <strong>B2B workplace</strong> app (HR attendance, CRM, tasks)
        for authorized employees of a tenant company. It is not a consumer social
        app.
      </p>

      <h2 className="pt-2 text-base font-semibold text-[#0a1220]">
        Demo / reviewer access
      </h2>
      <p>
        Provide the reviewer account in App Store Connect / Play Console notes
        (do not hardcode passwords in the binary). Expected flow:
      </p>
      <ol className="list-decimal space-y-2 ps-5">
        <li>Open the app → Sign-in screen loads from https://system.rootk-eg.com</li>
        <li>Sign in with the supplied work email + password</li>
        <li>
          Optional: Attendance → check-in may request location permission (used
          only while punching)
        </li>
        <li>
          Optional: CRM lead create → pick a contact (Contacts permission; single
          contact picker, address book is not uploaded)
        </li>
      </ol>

      <h2 className="pt-2 text-base font-semibold text-[#0a1220]">
        Native capabilities (beyond a plain website)
      </h2>
      <ul className="list-disc space-y-2 ps-5">
        <li>Secure token storage on device</li>
        <li>Native Contacts picker for CRM lead matching</li>
        <li>Location while-in-use for attendance geofence verification</li>
        <li>App resume hooks for post-call CRM feedback</li>
        <li>Branded offline shell when the server is unreachable</li>
      </ul>

      <h2 className="pt-2 text-base font-semibold text-[#0a1220]">Legal</h2>
      <ul className="list-disc space-y-2 ps-5">
        <li>
          Privacy:{" "}
          <a className="font-semibold text-[#082868]" href="/privacy">
            /privacy
          </a>
        </li>
        <li>
          Terms:{" "}
          <a className="font-semibold text-[#082868]" href="/terms">
            /terms
          </a>
        </li>
        <li>
          Account deletion:{" "}
          <a className="font-semibold text-[#082868]" href="/account-deletion">
            /account-deletion
          </a>
        </li>
      </ul>

      <h2 className="pt-2 text-base font-semibold text-[#0a1220]">Support</h2>
      <p>
        <a
          className="font-semibold text-[#082868]"
          href="mailto:support@rootk-eg.com"
        >
          support@rootk-eg.com
        </a>
      </p>
    </LegalPageShell>
  );
}
