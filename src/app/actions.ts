"use server";

import { getStore, persist } from "@/lib/store";
import { revalidatePath } from "next/cache";
import type { Fault } from "@/lib/types";

export async function reportFault(title: string, description: string, reportedBy: string = "System", severity: Fault["severity"] = "warning") {
  const store = getStore();
  const newFault: Fault = {
    id: `F-${Date.now()}`,
    title,
    description,
    severity,
    status: "pending",
    timestamp: Date.now(),
    reportedBy,
  };
  
  store.faults.unshift(newFault);
  persist();
  revalidatePath("/");
  return newFault;
}

export async function approveFault(id: string) {
  const store = getStore();
  const fault = store.faults.find((f) => f.id === id);
  if (fault && fault.status === "pending") {
    fault.status = "approved";
    persist();
    revalidatePath("/");
  }
}

export async function requestResolveFault(id: string) {
  const store = getStore();
  const fault = store.faults.find((f) => f.id === id);
  if (fault) {
    fault.status = "resolve_requested";
    persist();
    revalidatePath("/");
  }
}

export async function resolveFault(id: string) {
  const store = getStore();
  const fault = store.faults.find((f) => f.id === id);
  if (fault) {
    fault.status = "resolved";
    persist();
    revalidatePath("/");
  }
}

export async function denyResolveFault(id: string) {
  const store = getStore();
  const fault = store.faults.find((f) => f.id === id);
  if (fault) {
    fault.status = "approved"; // back to standard queue
    persist();
    revalidatePath("/");
  }
}
