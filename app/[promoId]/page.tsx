"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import supabase from "../supabase";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";

interface PromoDetails {
  id: number;
  event_name: string;
  organiser_name: string;
  reward: string;
  purpose: string;
  expiration_date: string;
  account_id: number;
}

export default function PromoDetailsPage() {
  const { promoId } = useParams();
  const [promo, setPromo] = useState<PromoDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const qrRef = useRef<SVGSVGElement>(null);
  const router = useRouter();

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

        // Check if current user is the owner (optional)
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (user) {
            const { data: accountInfo, error: accountError } = await supabase
              .from("account_info")
              .select("id")
              .eq("user_id", user.id)
              .single();

            if (!accountError) {
              setIsOwner(data.account_id === accountInfo.id);
            }
          }
        } catch (authError) {
          // If there's an authentication error, it's fine - just means no owner check
          console.log("No authenticated user, proceeding with promo details");
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
        {/* Only show Back to Dashboard if user is authenticated and owner */}
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
      </div>
    </div>
  );
}
