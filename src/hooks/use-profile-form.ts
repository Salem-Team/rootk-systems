"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { updateOwnProfile } from "@/services/auth.service";
import { getEmployeeById } from "@/services/employees.service";
import { useTranslation } from "@/hooks/use-translation";
import {
  getWorkEmployeeIdFromUser,
  useSessionStore,
} from "@/stores/session-store";
import type { Employee } from "@/types";

export function useProfileForm() {
  const { t } = useTranslation();
  const user = useSessionStore((s) => s.user);
  const [firstName, setFirstName] = useState(user.firstName || "");
  const [lastName, setLastName] = useState(user.lastName || "");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [employee, setEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    setFirstName(user.firstName || "");
    setLastName(user.lastName || "");
  }, [user.firstName, user.lastName, user.id]);

  useEffect(() => {
    let active = true;
    const employeeId = getWorkEmployeeIdFromUser(user);
    if (!employeeId) {
      setEmployee(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    void getEmployeeById(employeeId).then((res) => {
      if (!active) return;
      if (res.success && res.data) {
        setEmployee(res.data);
        setPhone(res.data.phone ?? "");
        setDepartment(res.data.department ?? "");
        setPosition(res.data.position ?? "");
      } else {
        setEmployee(null);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [user]);

  async function handleSave() {
    if (!firstName.trim()) {
      toast.error(t("profile.firstNameRequired"));
      return;
    }
    setSaving(true);
    const res = await updateOwnProfile({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
    });
    setSaving(false);
    if (!res.success || !res.data) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    setPhone(res.data.phone ?? phone.trim());
    toast.success(t("profile.saved"));
  }

  return {
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
  };
}
