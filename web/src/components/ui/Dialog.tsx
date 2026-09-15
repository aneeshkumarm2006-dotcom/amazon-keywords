"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** Sticky footer row, usually the action buttons. */
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
  children: ReactNode;
}

const SIZES = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
} as const;

/**
 * A modal built on the native `<dialog>` element, so focus trapping, the
 * top layer and Escape-to-close come from the platform. We add: a labelled
 * heading, backdrop-click dismissal, and a body scroll lock.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  footer,
  size = "md",
  className,
  children,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  // A page can mount more than one dialog at once — the dashboard mounts two —
  // so the heading and description ids have to be per-instance or the
  // aria-labelledby on the second one resolves to the first one's heading.
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const descriptionId = `${baseId}-description`;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (open && !node.open) {
      node.showModal();
    } else if (!open && node.open) {
      node.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const handleCancel = useCallback(
    (event: React.SyntheticEvent<HTMLDialogElement>) => {
      event.preventDefault();
      onClose();
    },
    [onClose],
  );

  const handleBackdropClick = useCallback(
    (event: React.MouseEvent<HTMLDialogElement>) => {
      if (event.target === ref.current) onClose();
    },
    [onClose],
  );

  return (
    <dialog
      ref={ref}
      onCancel={handleCancel}
      onClose={() => {
        if (open) onClose();
      }}
      onClick={handleBackdropClick}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={cn(
        "m-auto w-[calc(100vw-2rem)] rounded-2xl border border-hairline bg-surface p-0 text-ink shadow-card",
        "backdrop:bg-scrim backdrop:backdrop-blur-[2px]",
        SIZES[size],
        className,
      )}
    >
      <div className="flex max-h-[85vh] flex-col">
        <div className="flex items-start gap-4 border-b border-hairline px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="font-display text-lg leading-snug font-semibold">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1 text-sm text-muted">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="-mr-1 flex size-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand [@media(pointer:coarse)]:size-11"
          >
            <X className="size-[1.125rem]" aria-hidden="true" />
          </button>
        </div>

        <div className="scroll-well min-h-0 flex-1 overflow-y-auto px-5 py-4 text-sm leading-relaxed">
          {children}
        </div>

        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-hairline px-5 py-3.5">
            {footer}
          </div>
        ) : null}
      </div>
    </dialog>
  );
}
