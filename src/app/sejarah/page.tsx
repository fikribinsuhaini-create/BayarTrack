"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SejarahPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/komitmen?tab=sejarah");
  }, [router]);
  return null;
}
