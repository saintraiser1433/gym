"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

export default function ClientCheckinPage() {
  const router = useRouter();
  React.useEffect(() => {
    router.replace("/client/dashboard");
  }, [router]);
  return null;
}

