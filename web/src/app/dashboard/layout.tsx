import type { ReactNode } from "react";

import { ConsoleShell } from "@/components/ppc/ConsoleShell";

/**
 * PPC console frame: title, store switcher and section tabs around every
 * /dashboard route. Each page sets its own noindex metadata and <h1>.
 */
export default function ConsoleLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <ConsoleShell>{children}</ConsoleShell>;
}
