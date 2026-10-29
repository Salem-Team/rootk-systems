"use client";

import { Loader2, Save, UserRound } from "lucide-react";
import { EmployeeWhatsappSettings } from "@/components/employees/employee-whatsapp-settings";
import { FormSkeleton } from "@/components/shared/loading-state";
import { SectionPanel } from "@/components/shared/section-panel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfileForm } from "@/hooks/use-profile-form";
import { useSessionStore } from "@/stores/session-store";

export function ProfileForm() {
  const role = useSessionStore((s) => s.role);
  const {
    t,
    user,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    phone,
    setPhone,
    loading,
    saving,
    department,
    position,
    employee,
    setEmployee,
    handleSave,
  } = useProfileForm();

  if (loading) {
    return <FormSkeleton />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3 pb-20 sm:space-y-4 sm:pb-0">
      <SectionPanel interactive={false} bare>
        <div className="panel-header">
          <div className="flex items-start gap-3">
            <Avatar className="h-11 w-11 shrink-0 ring-1 ring-border sm:h-12 sm:w-12">
              <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                {user.initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="flex items-center gap-2 text-[0.95rem] font-semibold">
                <span className="icon-well hidden h-7 w-7 shrink-0 sm:flex">
                  <UserRound className="h-3.5 w-3.5" aria-hidden />
                </span>
                <span className="truncate">{t("profile.personalInfo")}</span>
              </h3>
              <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground sm:text-sm">
                {t("profile.personalInfoDesc")}
              </p>
              <div className="mt-2 flex max-w-full flex-wrap gap-1.5 overflow-hidden">
                {user.employeeId ? (
                  <Badge variant="info" className="max-w-full truncate">
                    {user.employeeId}
                  </Badge>
                ) : null}
                <Badge variant="secondary">
                  {role === "admin" ? t("roles.admin") : t("roles.employee")}
                </Badge>
                {department ? (
                  <Badge variant="outline" className="max-w-[10rem] truncate">
                    {department}
                  </Badge>
                ) : null}
                {position ? (
                  <Badge variant="outline" className="max-w-[10rem] truncate">
                    {position}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="panel-body grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="profile-first-name">{t("profile.firstName")}</Label>
            <Input
              id="profile-first-name"
              autoComplete="given-name"
              className="min-h-11 touch-manipulation sm:min-h-10"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-last-name">{t("profile.lastName")}</Label>
            <Input
              id="profile-last-name"
              autoComplete="family-name"
              className="min-h-11 touch-manipulation sm:min-h-10"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-email">{t("common.email")}</Label>
            <Input
              id="profile-email"
              value={user.email}
              readOnly
              disabled
              className="min-h-11 sm:min-h-10"
              aria-describedby="profile-email-hint"
            />
            <p id="profile-email-hint" className="text-xs text-muted-foreground">
              {t("profile.emailReadonly")}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-phone">{t("common.phone")}</Label>
            <Input
              id="profile-phone"
              autoComplete="tel"
              inputMode="tel"
              className="min-h-11 touch-manipulation sm:min-h-10"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("profile.phonePlaceholder")}
            />
          </div>
        </div>
      </SectionPanel>

      {employee ? (
        <EmployeeWhatsappSettings
          employee={employee}
          variant="panel"
          onSaved={(next) => setEmployee(next)}
        />
      ) : null}

      <div className="pointer-events-none fixed inset-x-0 bottom-[var(--mobile-action-bottom)] z-30 px-3 sm:static sm:inset-auto sm:z-auto sm:flex sm:justify-end sm:px-0">
        <Button
          size="lg"
          className="pointer-events-auto w-full min-h-12 touch-manipulation shadow-[var(--shadow-float)] sm:w-auto sm:min-h-10 sm:shadow-none"
          onClick={() => void handleSave()}
          disabled={saving || !firstName.trim()}
        >
          {saving ? <Loader2 className="animate-spin" /> : <Save />}
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}
