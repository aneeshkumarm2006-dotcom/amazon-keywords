import { Lock, WifiOff } from "lucide-react";

import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { AddToHomeScreen } from "@/components/pwa/AddToHomeScreen";
import { OfflineLibrary } from "@/components/pwa/OfflineLibrary";
import { Badge } from "@/components/ui/Badge";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Offline",
  description:
    "What PPC Academy has saved to this device, and which pages still open with no connection.",
  path: "/offline",
  noindex: true,
});

export default function OfflinePage() {
  return (
    <>
      <PageHeader
        eyebrow="Offline"
        title="No connection — here is what you still have"
        description="PPC Academy saves every page you open, plus a starter set on your first visit, so a dropped signal on the jeepney or a dead client wifi does not end the session. This page reads your device's own cache and lists exactly what is available right now."
        width="wide"
        breadcrumbs={[{ label: "Offline" }]}
        meta={
          <>
            <Badge tone="warn" variant="soft" icon={WifiOff}>
              Works with no connection
            </Badge>
            <Badge tone="good" variant="soft" icon={Lock}>
              Nothing leaves this device
            </Badge>
          </>
        }
      />

      <Container width="wide" className="py-8 sm:py-10">
        <OfflineLibrary />
        <AddToHomeScreen className="mt-6" />
      </Container>
    </>
  );
}
