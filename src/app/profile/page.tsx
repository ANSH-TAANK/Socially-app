"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

export default function ProfileRedirect() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded && user?.username) {
      router.replace(`/profile/${user.username}`);
    }
  }, [isLoaded, user, router]);

  return null;
}
