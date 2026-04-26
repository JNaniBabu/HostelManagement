import { useEffect, useSyncExternalStore } from "react";
import { useSearchParams } from "react-router-dom";

const STORAGE_KEY = "tenant_phone";
const PHONE_UPDATED_EVENT = "tenant-phone-updated";

function sanitizePhone(rawPhone) {
  const digits = String(rawPhone || "").replace(/\D/g, "");
  if (digits.length < 10) {
    return "";
  }
  return digits.slice(-10);
}

function readStoredPhone() {
  if (typeof window === "undefined") {
    return "";
  }
  return sanitizePhone(window.localStorage.getItem(STORAGE_KEY));
}

function subscribeToPhoneChanges(callback) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener(PHONE_UPDATED_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(PHONE_UPDATED_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function persistTenantPhone(phone) {
  const sanitized = sanitizePhone(phone);
  if (!sanitized || typeof window === "undefined") {
    return "";
  }
  window.localStorage.setItem(STORAGE_KEY, sanitized);
  window.dispatchEvent(new Event(PHONE_UPDATED_EVENT));
  return sanitized;
}

export function useTenantPhone() {
  const [searchParams] = useSearchParams();
  const queryPhone = sanitizePhone(searchParams.get("phone"));
  const storedPhone = useSyncExternalStore(
    subscribeToPhoneChanges,
    readStoredPhone,
    () => ""
  );

  useEffect(() => {
    if (queryPhone && typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, queryPhone);
      window.dispatchEvent(new Event(PHONE_UPDATED_EVENT));
    }
  }, [queryPhone]);

  return queryPhone || storedPhone;
}
