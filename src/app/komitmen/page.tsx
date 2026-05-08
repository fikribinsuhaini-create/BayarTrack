import { Suspense } from "react";
import { KomitmenClient } from "@/app/komitmen/ui";

export default function KomitmenPage() {
  return (
    <Suspense fallback={null}>
      <KomitmenClient />
    </Suspense>
  );
}

