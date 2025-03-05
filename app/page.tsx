"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import supabase from "../app/supabase";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // If user is logged in, redirect to dashboard
        router.push("/dashboard");
      } else {
        // If no user, redirect to signin
        router.push("/signin");
      }
    };

    checkUser();
  }, [router]);

  return null;
}
