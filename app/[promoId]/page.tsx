"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import supabase from "../supabase";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";
import { generateConfirmationUrl } from "../services/valigen"; // adjust import path as needed

interface PromoDetails {
  id: number;
  event_name: string;
  organiser_name: string;
  reward: string;
  purpose: string;
  expiration_date: string;
  account_id: number;
}

interface PromotedUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  is_used: boolean;
}

interface ClaimFormState {
  name: string;
  email: string;
  phone: string;
}

export default function PromoDetailsPage() {
  const { promoId } = useParams();
  const [promo, setPromo] = useState<PromoDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const qrRef = useRef<SVGSVGElement>(null);
  const router = useRouter();

  // Promoted users state
  const [promotedUsers, setPromotedUsers] = useState<PromotedUser[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);

  // Claim form state
  const [claimForm, setClaimForm] = useState<ClaimFormState>({
    name: "",
    email: "",
    phone: "",
  });
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [confirmationUrl, setConfirmationUrl] = useState<string | null>(null);
  const [isClaimLoading, setIsClaimLoading] = useState(false);

  useEffect(() => {
    const fetchPromoDetails = async () => {
      try {
        // Fetch promo details
        const { data, error } = await supabase
          .from("promos")
          .select("*")
          .eq("id", promoId)
          .single();

        if (error) {
          console.error("Error fetching promo details:", error);
          router.push("/dashboard");
          return;
        }

        // Check if current user is the owner
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: accountInfo, error: accountError } = await supabase
            .from("account_info")
            .select("id")
            .eq("user_id", user.id)
            .single();

          if (accountError) {
            console.error("Error fetching account info:", accountError);
            setIsOwner(false);
          } else {
            setIsOwner(data.account_id === accountInfo.id);
            // If owner, fetch promoted users
            if (data.account_id === accountInfo.id) {
              await fetchPromotedUsers();
            }
          }
        }

        setPromo(data);
      } catch (err) {
        console.error("Unexpected error:", err);
        router.push("/dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    if (promoId) {
      fetchPromoDetails();
    }
  }, [promoId, router]);

  const fetchPromotedUsers = async () => {
    setIsUsersLoading(true);
    try {
      const { data, error } = await supabase
        .from("promoted")
        .select("*")
        .eq("promo_id", promoId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching promoted users:", error);
        return;
      }

      setPromotedUsers(data || []);
    } catch (err) {
      console.error("Unexpected error fetching promoted users:", err);
    } finally {
      setIsUsersLoading(false);
    }
  };

  const handleMarkPromoUsed = async (
    userId: number,
    currentUsedState: boolean
  ) => {
    try {
      const { error } = await supabase
        .from("promoted")
        .update({ is_used: !currentUsedState })
        .eq("id", userId);

      if (error) {
        console.error("Error updating promo used status:", error);
        return;
      }

      // Update local state
      setPromotedUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, is_used: !currentUsedState } : user
        )
      );
    } catch (err) {
      console.error("Unexpected error marking promo as used:", err);
    }
  };

  const handleClaimFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setClaimForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear any previous error when user starts typing
    setClaimError(null);
  };

  const handleClaimPromo = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!claimForm.name.trim()) {
      setClaimError("Name is required");
      return;
    }

    if (!claimForm.email.trim() && !claimForm.phone.trim()) {
      setClaimError("Either email or phone number is required");
      return;
    }

    setIsClaimLoading(true);
    setClaimError(null);
    setConfirmationUrl(null);

    try {
      // Check if user has already claimed this promo using email OR phone
      const { data: existingClaims, error: checkError } = await supabase
        .from("promoted")
        .select("*")
        .eq("promo_id", promoId)
        .or(
          `email.eq.${claimForm.email.trim()},` +
            `phone.eq.${claimForm.phone.trim()}`
        );

      if (checkError) {
        console.error("Error checking existing claims:", checkError);
        setClaimError("An error occurred. Please try again.");
        setIsClaimLoading(false);
        return;
      }

      if (existingClaims && existingClaims.length > 0) {
        // If already claimed, generate and show the existing confirmation URL
        const existingClaim = existingClaims[0];
        const url = generateConfirmationUrl(
          window.location.origin,
          promoId as string,
          existingClaim.email || undefined,
          existingClaim.phone || undefined
        );

        setClaimError("You have already claimed this promo.");
        setConfirmationUrl(url);
        setIsClaimLoading(false);
        return;
      }

      // Insert claim
      const { error } = await supabase.from("promoted").insert({
        name: claimForm.name.trim(),
        email: claimForm.email.trim(),
        phone: claimForm.phone.trim(),
        promo_id: promoId,
      });

      if (error) {
        console.error("Error claiming promo:", error);
        setClaimError("Failed to claim promo. Please try again.");
        setIsClaimLoading(false);
        return;
      }

      // Generate confirmation URL for the new claim
      const url = generateConfirmationUrl(
        window.location.origin,
        promoId as string,
        claimForm.email.trim() || undefined,
        claimForm.phone.trim() || undefined
      );

      // Success
      setClaimSuccess(true);
      setConfirmationUrl(url);

      // Reset form and clear details
      setClaimForm({
        name: "",
        email: "",
        phone: "",
      });

      // Reset form after 3 seconds
      setTimeout(() => {
        setClaimSuccess(false);
        setConfirmationUrl(null);
        setIsClaimLoading(false);
      }, 5000);
    } catch (err) {
      console.error("Unexpected error:", err);
      setClaimError("An unexpected error occurred.");
      setIsClaimLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (qrRef.current && promo) {
      // Create a canvas element
      const canvas = document.createElement("canvas");
      const svg = qrRef.current;
      const ctx = canvas.getContext("2d");

      // Convert SVG to image
      const svgData = new XMLSerializer().serializeToString(svg);
      const img = new Image();
      img.onload = () => {
        // Set canvas size to match QR code
        canvas.width = img.width;
        canvas.height = img.height;

        // Fill with white background
        if (ctx) {
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Draw the QR code image on top of white background
          ctx.drawImage(img, 0, 0);
        }

        // Convert to data URL and trigger download (with JPEG)
        const dataURL = canvas.toDataURL("image/jpeg", 1.0);
        const link = document.createElement("a");
        link.download = `qr_code_${promo.event_name}.jpg`;
        link.href = dataURL;
        link.click();
      };
      img.src = "data:image/svg+xml;base64," + btoa(svgData);
    }
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

  if (!promo) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        Promo not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-xl p-8 space-y-6">
        {isOwner && (
          <Link
            href="/dashboard"
            className="inline-block mb-4 py-2 px-4 bg-black text-white rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Back to Dashboard
          </Link>
        )}

        <div className="space-y-4">
          <h1 className="text-2xl font-bold">{promo.event_name}</h1>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-semibold">Organiser Name</p>
              <p>{promo.organiser_name}</p>
            </div>
            <div>
              <p className="font-semibold">Expiration Date</p>
              <p>{new Date(promo.expiration_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="font-semibold">Reward</p>
              <p>{promo.reward}</p>
            </div>
          </div>

          <div>
            <p className="font-semibold">Purpose</p>
            <p>{promo.purpose}</p>
          </div>
        </div>

        {/* Promoted Users Section for Owners */}
        {isOwner && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Claimed Promos</h2>

            {isUsersLoading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin h-8 w-8" viewBox="0 0 24 24">
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
              </div>
            ) : promotedUsers.length === 0 ? (
              <p className="text-gray-500 text-center">
                No one has claimed this promo yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-3 text-left">Name</th>
                      <th className="p-3 text-left">Email</th>
                      <th className="p-3 text-left">Phone</th>
                      <th className="p-3 text-center">Used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promotedUsers.map((user) => (
                      <tr
                        key={user.id}
                        className={`border-b ${
                          user.is_used ? "bg-green-50" : "hover:bg-gray-50"
                        }`}
                      >
                        <td className="p-3">{user.name}</td>
                        <td className="p-3">{user.email || "N/A"}</td>
                        <td className="p-3">{user.phone || "N/A"}</td>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={user.is_used}
                            onChange={() =>
                              handleMarkPromoUsed(user.id, user.is_used)
                            }
                            className="form-checkbox h-5 w-5 text-black rounded focus:ring-black"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* QR Code section only for owner */}
        {isOwner && (
          <div className="flex flex-col items-center mt-8 space-y-4">
            <div className="bg-white p-4 border border-gray-200 rounded-lg">
              <QRCodeSVG
                ref={qrRef}
                value={`https://coupon-inky-one.vercel.app/${promo.id}`}
                size={256}
                level={"H"}
              />
              <p className="text-center mt-4 text-sm text-gray-500">
                Scan to view promo details
              </p>
            </div>

            <button
              onClick={downloadQRCode}
              className="py-2 px-4 bg-black text-white rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Download QR Code
            </button>
          </div>
        )}

        {/* Claim Form for non-owners */}
        {!isOwner && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">
              Input Your Details to Claim Promo
            </h2>
            <form onSubmit={handleClaimPromo} className="space-y-4">
              <div>
                <label htmlFor="name" className="block mb-2 font-medium">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={claimForm.name}
                  onChange={handleClaimFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block mb-2 font-medium">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={claimForm.email}
                  onChange={handleClaimFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="Enter your email (optional)"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block mb-2 font-medium">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={claimForm.phone}
                  onChange={handleClaimFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="Enter your phone number (optional)"
                />
              </div>

              {claimError && (
                <div
                  className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
                  role="alert"
                >
                  {claimError}
                  {confirmationUrl && (
                    <div className="mt-2">
                      <p className="font-semibold">Confirmation URL:</p>
                      <a
                        href={confirmationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline break-all"
                      >
                        {confirmationUrl}
                      </a>
                    </div>
                  )}
                </div>
              )}

              {claimSuccess && confirmationUrl && (
                <div
                  className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative"
                  role="alert"
                >
                  <p>Promo claimed successfully!</p>
                  <p className="mt-2">
                    <span className="font-semibold">Confirmation URL:</span>
                    <a
                      href={confirmationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline break-all ml-2"
                    >
                      {confirmationUrl}
                    </a>
                  </p>
                  <p className="mt-2 text-sm">
                    Show this URL to the promo creator to claim your reward.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isClaimLoading}
                className="w-full py-2 px-4 bg-black text-white rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isClaimLoading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 mr-3"
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
                    Claiming...
                  </>
                ) : (
                  "Claim Promo"
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
