"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import supabase from "../supabase";

export default function CreatePromoPage() {
  const [organiserId, setOrganiserId] = useState("");
  const [organiserName, setOrganizerName] = useState("");
  const [eventName, setEventName] = useState("");
  const [reward, setReward] = useState("");
  const [purpose, setPurpose] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // New states for AI features
  const [showAIInput, setShowAIInput] = useState(true);
  const [showManualInputs, setShowManualInputs] = useState(false);
  const [aiDescription, setAiDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

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
        setOrganiserId(data?.id || "");
        setOrganizerName(data?.name || "");
      } catch (err) {
        console.error("Unexpected error:", err);
        setError("An unexpected error occurred");
      }
    };

    fetchUserInfo();
  }, [router]);

  // Generate coupon details using OpenAI API
  const generateCouponDetails = async () => {
    if (!aiDescription.trim()) {
      setError("Please provide a description of the coupon you want to create");
      return;
    }

    setIsGenerating(true);
    setError("");

    try {
      const response = await fetch("/api/generate-coupon", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ description: aiDescription, organiserName }),
      });

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }

      const data = await response.json();

      // Update form fields with AI generated content
      setEventName(data.eventName || "");
      setReward(data.reward || "");
      setPurpose(data.purpose || "");

      // Set a default expiration date if not provided (2 weeks from now)
      if (data.expirationDate) {
        setExpirationDate(data.expirationDate);
      } else {
        const twoWeeksFromNow = new Date();
        twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
        setExpirationDate(twoWeeksFromNow.toISOString().split("T")[0]);
      }

      // Show the manual inputs for user to review and edit
      setShowManualInputs(true);
      setShowAIInput(false);
    } catch (err) {
      console.error("Error generating coupon details:", err);
      setError("Failed to generate coupon details. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Reset to AI input
  const resetToAI = () => {
    setShowAIInput(true);
    setShowManualInputs(false);
  };

  const handleCreatePromo = async (e: { preventDefault: () => void }) => {
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
    } catch {
      setError("An unexpected error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-full max-w-md p-8 space-y-6 bg-white">
        <h1 className="text-2xl font-bold text-center">Create Promo</h1>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        {showAIInput && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-2">
                Describe the details of your coupon and our AI will help create
                it. Include information about:
              </p>
              <ul className="text-sm text-gray-600 list-disc pl-5 mb-2">
                <li>What event or promotion this is for</li>
                <li>What reward/discount you're offering</li>
                <li>Why you're running this promotion</li>
                <li>When it should expire (optional)</li>
              </ul>
            </div>

            <textarea
              value={aiDescription}
              onChange={(e) => setAiDescription(e.target.value)}
              placeholder="E.g. I want to create a coupon for our summer sale offering 15% off all products. We're doing this to increase sales during our slow season. It should expire at the end of August."
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-black"
              rows={5}
            />

            <button
              onClick={generateCouponDetails}
              disabled={isGenerating || !aiDescription.trim()}
              className="w-full py-4 px-4 bg-black text-white rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
            >
              {isGenerating ? (
                <div className="flex items-center justify-center">
                  <svg
                    className="animate-spin h-5 w-5 mr-2"
                    viewBox="0 0 24 24"
                  >
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
                  Generating...
                </div>
              ) : (
                "Generate Coupon Details"
              )}
            </button>
          </div>
        )}

        {showManualInputs && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Review & Edit</h2>
              <button
                onClick={resetToAI}
                className="text-sm text-gray-600 hover:text-black"
              >
                Try different description
              </button>
            </div>

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
                    <svg
                      className="animate-spin h-5 w-5 mr-2"
                      viewBox="0 0 24 24"
                    >
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
                  "Create Coupon"
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
