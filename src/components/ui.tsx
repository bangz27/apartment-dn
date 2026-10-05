import { cva, type VariantProps } from "class-variance-authority";
import { Check, X } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-4 text-sm font-medium transition-opacity duration-150 disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-fg",
        ghost: "border border-line bg-surface text-fg",
        quiet: "bg-transparent text-fg",
        danger: "border border-danger bg-surface text-danger",
      },
    },
    defaultVariants: { variant: "primary" },
  },
);

export function Button({
  variant,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return <button type={type} className={cn(buttonVariants({ variant }), className)} {...props} />;
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "min-h-11 w-full rounded-control border border-line bg-surface px-3 text-base text-fg outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "min-h-11 w-full rounded-control border border-line bg-surface px-3 text-base text-fg outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        className,
      )}
      {...props}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

export function Card({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("rounded-card border border-line bg-surface p-4", className)} {...props} />;
}

export function Badge({
  tone,
  children,
}: {
  tone: "due" | "paid" | "cancelled" | "neutral";
  children: ReactNode;
}) {
  const toneClass = {
    due: "border border-due text-due",
    paid: "border border-ok text-ok",
    cancelled: "border border-line text-muted",
    neutral: "border border-line text-muted",
  }[tone];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-control px-2 py-0.5 text-xs font-medium", toneClass)}>
      {tone === "paid" ? <Check className="size-3.5" aria-hidden="true" /> : null}
      {tone === "due" ? <X className="size-3.5" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <h2 className="text-base font-medium">{title}</h2>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </Card>
  );
}
