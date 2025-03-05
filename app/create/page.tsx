"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import supabase from "../supabase";

export default function CreatePromoPage() {
  const [accountName, setAccountName] = useState("");
  const [organiserId, setOrganiserId] = useState("");
  const [organiserName, setOrganizerName] = useState("");
  const [eventName, setEventName] = useState("");
  const [reward, setReward] = useState("");
  const [purpose, setPurpose] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        // Get the current user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          // Redirect to signin if no user is logged in
          router.push("/signin");
          return;
        }

        // Fetch the account info
        const { data, error } = await supabase
          .from("account_info")
          .select("id, name")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Error fetching account info:", error);
          setError("Could not fetch account information");
          return;
        }

        // Set default organizer name and ID
        setAccountName(data?.name || "N/A");
        setOrganiserId(data?.id || "");
        setOrganizerName(data?.name || "");
      } catch (err) {
        console.error("Unexpected error:", err);
        setError("An unexpected error occurred");
      }
    };

    fetchUserInfo();
  }, [router]);

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Validate inputs
      if (!eventName || !reward || !purpose || !expirationDate) {
        setError("Please fill in all required fields");
        setIsLoading(false);
        return;
      }

      // Insert promo and get the inserted promo
      const { data, error: insertError } = await supabase
        .from("promos")
        .insert([
          {
            organiser_name: organiserName,
            event_name: eventName,
            reward,
            purpose,
            expiration_date: expirationDate,
            account_id: organiserId,
          },
        ])
        .select();

      if (insertError) {
        setError(insertError.message);
        setIsLoading(false);
        return;
      }

      // Redirect to the newly created promo's details page
      if (data && data.length > 0) {
        router.push(`/${data[0].id}`);
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError("An unexpected error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-full max-w-md p-8 space-y-6 bg-white">
        <h1 className="text-2xl font-bold text-center">Create Promo</h1>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <form onSubmit={handleCreatePromo} className="space-y-4">
          <div>
            <label
              htmlFor="organisername"
              className="block text-sm font-medium text-gray-700"
            >
              Organiser Name
            </label>
            <input
              type="text"
              id="organisername"
              value={organiserName}
              onChange={(e) => setOrganizerName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label
              htmlFor="eventname"
              className="block text-sm font-medium text-gray-700"
            >
              Event Name
            </label>
            <input
              type="text"
              id="eventname"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label
              htmlFor="reward"
              className="block text-sm font-medium text-gray-700"
            >
              Reward
            </label>
            <input
              type="text"
              id="reward"
              value={reward}
              onChange={(e) => setReward(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label
              htmlFor="purpose"
              className="block text-sm font-medium text-gray-700"
            >
              Why Are We Doing This
            </label>
            <textarea
              id="purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-black"
              rows={3}
            />
          </div>

          <div>
            <label
              htmlFor="expirationdate"
              className="block text-sm font-medium text-gray-700"
            >
              Expiration Date
            </label>
            <input
              type="date"
              id="expirationdate"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 px-4 bg-black text-white rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
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
                Creating Promo...
              </div>
            ) : (
              "Create"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
