"use client";

import { Loader2, Save, UserRound } from "lucide-react";
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
    handleSave,
  } = useProfileForm();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <section className="surface-panel overflow-hidden">
        <div className="panel-header">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12 ring-1 ring-border">
              <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                {user.initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h3 className="flex items-center gap-2 text-[0.95rem] font-semibold">
                <UserRound className="h-3.5 w-3.5 text-primary" aria-hidden />
                {t("profile.personalInfo")}
              </h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {t("profile.personalInfoDesc")}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="info">{user.employeeId}</Badge>
                <Badge variant="secondary">
                  {role === "admin" ? t("roles.admin") : t("roles.employee")}
                </Badge>
                {department ? (
                  <Badge variant="outline">{department}</Badge>
                ) : null}
                {position ? <Badge variant="outline">{position}</Badge> : null}
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
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-last-name">{t("profile.lastName")}</Label>
            <Input
              id="profile-last-name"
              autoComplete="family-name"
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
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("profile.phonePlaceholder")}
            />
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Button
          size="lg"
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
