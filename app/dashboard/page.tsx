"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import supabase from "../supabase";
import Link from "next/link";

// Define an interface for the promo structure
interface Promo {
  id: number;
  event_name: string;
  organiser_name: string;
  reward: string;
  purpose: string;
  expiration_date: string;
}

export default function DashboardPage() {
  const [accountName, setAccountName] = useState("");
  const [accountId, setAccountId] = useState("");
  const [promos, setPromos] = useState<Promo[]>([]);
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
          .select("id, name")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Error fetching account info:", error);
          setAccountName("N/A");
          setIsLoading(false);
          return;
        } else {
          // Set account name and ID
          setAccountName(data?.name || "N/A");
          setAccountId(data?.id || "");

          // Fetch promos for this account
          const { data: promosData, error: promosError } = await supabase
            .from("promos")
            .select("*")
            .eq("account_id", data.id)
            .order("created_at", { ascending: false });
          if (promosError) {
            console.error("Error fetching promos:", promosError);
          } else {
            setPromos(promosData || []);
          }
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        //setAccountName("N/A");
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

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">Your Promos</h2>

          {promos.length === 0 ? (
            <p className="text-center text-gray-500">No promos created yet</p>
          ) : (
            <div className="space-y-4">
              {promos.map((promo) => (
                <Link
                  href={`/${promo.id}`}
                  key={promo.id}
                  className=" hover:bg-gray-50 transition-colors cursor-pointer "
                >
                  <div className="border border-gray-200 rounded-lg p-4 mb-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">
                        {promo.event_name}
                      </h3>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">
                        Expires:{" "}
                        {new Date(promo.expiration_date).toLocaleDateString()}
                      </span>
                    </div>
                    {/*<div className="space-y-1">
                    <p>
                      <strong>Organiser:</strong> {promo.organiser_name}
                    </p>
                    <p>
                      <strong>Reward:</strong> {promo.reward}
                    </p>
                    <p>
                      <strong>Purpose:</strong>
                      {promo.purpose}
                    </p>
              </div>*/}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <Link
          href="/create"
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
