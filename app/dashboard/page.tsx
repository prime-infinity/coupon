"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import supabase from "../supabase";
import Link from "next/link";

export default function DashboardPage() {
  const [accountName, setAccountName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        // First, get the current user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          // Redirect to signin if no user is logged in
          router.push("/signin");
          return;
        }

        // Fetch the account name from account_info table
        const { data, error } = await supabase
          .from("account_info")
          .select("name")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Error fetching account info:", error);
          setAccountName("N/A");
        } else {
          setAccountName(data?.name || "N/A");
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setAccountName("N/A");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserInfo();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/signin");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex items-center">
          <svg className="animate-spin h-10 w-10 mr-3" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center">
      <div className="w-full max-w-md p-8 space-y-6 bg-white">
        <h1 className="text-2xl font-bold text-center">Dashboard</h1>
        <p className="text-center">
          Logged in as: <span className="font-semibold">{accountName}</span>
        </p>

        <Link
          href="/create-promo"
          className="w-full block text-center py-4 px-4 bg-black text-white rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Start Promo
        </Link>

        <button
          onClick={handleSignOut}
          className="w-full py-4 px-4 bg-black text-white rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
