// app/api/generate-coupon/route.js
import { NextResponse } from "next/server";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    const { description, organiserName } = await request.json();

    if (!description) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    // Create prompt for OpenAI
    const prompt = `
      You are an AI assistant helping to create a promotional coupon based on a description.
      Extract the following information from the description and format it in JSON:
      - Event name (a catchy name for the promotion or event)
      - Reward (what the customer gets, like a discount or free item)
      - Purpose (why this promotion is happening)
      - Expiration date (in YYYY-MM-DD format, if mentioned)

      Make sure to create clear, concise, and professional content appropriate for a business coupon.
      If the organizer name "${organiserName}" is provided, consider it when creating the event name.
      
      Description: ${description}
      
      Return ONLY a valid JSON object with the following keys: eventName, reward, purpose, expirationDate (optional).
      The response must be parseable by JSON.parse().
    `;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that generates coupon details in JSON format.",
        },
        { role: "user", content: prompt },
      ],
    });

    // Extract the response text
    const responseText = completion.choices[0]?.message?.content?.trim();
    //console.log("OpenAI response:", responseText);

    // Try parsing the JSON response from OpenAI
    let couponData;
    try {
      // Clean up the response to handle potential markdown code blocks
      let cleanedResponse = responseText;

      // Remove markdown code block syntax if present
      cleanedResponse = cleanedResponse
        .replace(/```json\s*/g, "")
        .replace(/```\s*$/g, "");

      // Try to extract just the JSON object if there's text around it
      const jsonMatch = cleanedResponse.match(/{[\s\S]*}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }

      couponData = JSON.parse(cleanedResponse);

      // Validate the required fields
      if (!couponData.eventName || !couponData.reward || !couponData.purpose) {
        throw new Error("Missing required fields in the response");
      }
    } catch (error) {
      console.error(
        "Error parsing AI response:",
        error,
        "Response was:",
        responseText
      );
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    return NextResponse.json(couponData);
  } catch (error) {
    console.error("Error generating coupon:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
