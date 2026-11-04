"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Modal, ModalClose, ModalContent, ModalFooter } from "@/components/velora/animated-modal";

// Small interactive pieces shared by the admin pages.

/** Shows a one-shot flash message and clears its cookie. */
export function FlashMessage({ type, message }: { type: "success" | "error"; message: string }) {
  useEffect(() => {
    document.cookie = "sd_flash=; path=/admin; max-age=0; SameSite=Strict";
  }, [type, message]);

  const ok = type === "success";
  return (
    <div
      className={`mb-4 px-4 py-3 rounded-xl flex items-center gap-3 border ${ok ? "bg-emerald-500/15 border-emerald-500/30" : "bg-red-500/15 border-red-500/30"}`}
      role="alert"
    >
      <svg className={`w-4 h-4 flex-shrink-0 ${ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={
            ok
              ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              : "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          }
        />
      </svg>
      <span className={`font-mono text-sm ${ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>{message}</span>
    </div>
  );
}

function ConfirmDialog({ open, setOpen, message, onConfirm }: { open: boolean; setOpen: (open: boolean) => void; message: string; onConfirm: () => void }) {
  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalContent title="Are you sure?" description={message}>
        <ModalFooter>
          <ModalClose>Cancel</ModalClose>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
            className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg bg-destructive px-4 text-sm font-medium text-foreground hover:opacity-90"
          >
            Confirm
          </button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

/** Button that asks for confirmation in a dialog, then submits its form. */
export function ConfirmButton({ message, className, title, children }: { message: string; className: string; title?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={button} type="button" title={title} aria-label={title} className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      <ConfirmDialog open={open} setOpen={setOpen} message={message} onConfirm={() => button.current?.closest("form")?.requestSubmit()} />
    </>
  );
}

/** Submit button that shows a busy label while its form's action runs. */
export function SubmitButton({ className, children, pending: pendingLabel = "Saving…" }: { className: string; children: ReactNode; pending?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${className} disabled:opacity-60`}>
      {pending ? pendingLabel : children}
    </button>
  );
}

// ── Bulk selection ──
// Row checkboxes carry form={formId}, so they submit with the bulk-delete form even though they sit in the table.

function rowBoxes(formId: string) {
  return Array.from(document.querySelectorAll<HTMLInputElement>(`input[type=checkbox][form="${formId}"][name="ids"]`));
}

export function SelectAll({ formId }: { formId: string }) {
  return (
    <input
      type="checkbox"
      aria-label="Select all"
      className="rounded border-border"
      onChange={(e) => {
        rowBoxes(formId).forEach((b) => (b.checked = e.target.checked));
        document.dispatchEvent(new Event("bulk-change"));
      }}
    />
  );
}

export function RowCheckbox({ formId, value }: { formId: string; value: number }) {
  return (
    <input
      type="checkbox"
      name="ids"
      value={value}
      form={formId}
      aria-label="Select row"
      className="rounded border-border"
      onChange={() => document.dispatchEvent(new Event("bulk-change"))}
    />
  );
}

/** "Delete N Selected" button, hidden until at least one row is ticked. */
export function BulkDeleteButton({ formId, noun }: { formId: string; noun: string }) {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const update = () => setCount(rowBoxes(formId).filter((b) => b.checked).length);
    document.addEventListener("bulk-change", update);
    return () => document.removeEventListener("bulk-change", update);
  }, [formId]);

  if (!count) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="px-4 py-2 text-xs font-mono bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 hover:bg-red-500/20 rounded-lg transition-all">
        Delete {count} Selected
      </button>
      <ConfirmDialog
        open={open}
        setOpen={setOpen}
        message={`Permanently delete ${count} ${noun}?`}
        onConfirm={() => (document.getElementById(formId) as HTMLFormElement | null)?.requestSubmit()}
      />
    </>
  );
}
