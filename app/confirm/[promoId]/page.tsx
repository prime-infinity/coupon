"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { validatePromoConfirmation } from "../../services/valigen"; // adjust import path as needed
import supabase from "@/app/supabase";

interface PromoDetails {
  id: number;
  event_name: string;
  organiser_name: string;
  reward: string;
  purpose: string;
  expiration_date: string;
  account_id: number;
}

export default function PromoConfirmationPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const [promoDetails, setPromoDetails] = useState<PromoDetails | null>(null);
  const [validationStatus, setValidationStatus] = useState<{
    isValid: boolean;
    isUsed?: boolean;
    message?: string;
  }>({ isValid: false });
  const [isLoading, setIsLoading] = useState(true);
  const qrRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const validatePromo = async () => {
      const promoId = params.promoId as string;
      const userHash = searchParams.get("user");

      if (!promoId || !userHash) {
        setValidationStatus({
          isValid: false,
          message: "Invalid confirmation link",
        });
        setIsLoading(false);
        return;
      }

      try {
        // Validate user's claim
        const validationResult = await validatePromoConfirmation(
          promoId,
          userHash
        );

        if (!validationResult.isValid) {
          setValidationStatus({
            isValid: false,
            message: "You do not have access to this promotion",
          });
          setIsLoading(false);
          return;
        }

        // Fetch promo details
        const { data: promoData, error: promoError } = await supabase
          .from("promos")
          .select("*")
          .eq("id", promoId)
          .single();

        if (promoError) {
          setValidationStatus({
            isValid: false,
            message: "Promo details could not be found",
          });
          setIsLoading(false);
          return;
        }

        // Check if promo is used
        if (validationResult.isUsed) {
          setValidationStatus({
            isValid: true,
            isUsed: true,
            message:
              "This promotion has already been marked as used by the creator",
          });
        } else {
          setValidationStatus({
            isValid: true,
            isUsed: false,
            message:
              "Show this QR code to the promo creator to claim your reward",
          });
        }

        setPromoDetails(promoData);
      } catch (err) {
        console.error("Unexpected error:", err);
        setValidationStatus({
          isValid: false,
          message: "An unexpected error occurred",
        });
      } finally {
        setIsLoading(false);
      }
    };

    validatePromo();
  }, [params.promoId, searchParams]);

  const downloadQRCode = () => {
    if (qrRef.current && promoDetails) {
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
        link.download = `qr_code_${promoDetails.event_name}.jpg`;
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

  return (
    <div className="min-h-screen bg-white p-8 flex items-center justify-center">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-xl p-8 space-y-6 text-center">
        {!validationStatus.isValid ? (
          <div className="text-red-600">{validationStatus.message}</div>
        ) : (
          <>
            {promoDetails && (
              <>
                <h1 className="text-2xl font-bold">
                  Promo Name:
                  {promoDetails.event_name}
                </h1>
                <p className="text-gray-600 mb-4">
                  Promo Organiser:{promoDetails.organiser_name}
                </p>

                {validationStatus.isUsed ? (
                  <div className="text-yellow-600">
                    {validationStatus.message}
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col items-center mt-8 space-y-4">
                      <div className="bg-white p-4 border border-gray-200 rounded-lg">
                        <QRCodeSVG
                          ref={qrRef}
                          value={`https://coupon-inky-one.vercel.app/${promoDetails.id}`}
                          size={256}
                          level={"H"}
                        />
                        <p className="text-center mt-4 text-sm text-gray-500">
                          Show this QR code to claim your promo
                        </p>
                      </div>

                      <button
                        onClick={downloadQRCode}
                        className="py-2 px-4 bg-black text-white rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500"
                      >
                        Download QR Code
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mt-4">
                      {validationStatus.message}
                    </p>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
