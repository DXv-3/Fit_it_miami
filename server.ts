import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import twilio from "twilio";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

// In-memory store for OTPs (in production, use Redis)
const otpStore = new Map<string, { code: string; expiresAt: number; attempts: number }>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Twilio Client
  let twilioClient: twilio.Twilio | null = null;
  const getTwilioClient = () => {
    if (!twilioClient) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      if (!accountSid || !authToken) {
        throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required");
      }
      twilioClient = twilio(accountSid, authToken);
    }
    return twilioClient;
  };

  // API Routes
  app.post("/api/verify/send", async (req, res) => {
    try {
      const { phone } = req.body;
      if (!phone) {
        return res.status(400).json({ error: "Phone number is required" });
      }

      // Generate a 4-digit code
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      
      // Store code with 5-minute expiration
      otpStore.set(phone, {
        code,
        expiresAt: Date.now() + 5 * 60 * 1000,
        attempts: 0
      });

      // Send SMS via Twilio
      const client = getTwilioClient();
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;
      
      if (!fromNumber) {
        throw new Error("TWILIO_PHONE_NUMBER is required");
      }

      await client.messages.create({
        body: `Your FixIt Miami confirmation code is: ${code}. This code will expire in 5 minutes.`,
        from: fromNumber,
        to: phone
      });

      res.json({ success: true, message: "OTP sent" });
    } catch (error) {
      console.error("Error sending OTP:", error);
      // For development/demo purposes, if Twilio is not configured, we'll still succeed
      // but log the error so the UI flow can be tested.
      if (error instanceof Error && error.message.includes("TWILIO")) {
        console.warn("Twilio not configured. Pretending OTP was sent.");
        res.json({ success: true, message: "OTP sent (simulated)" });
      } else {
        res.status(500).json({ error: "Failed to send OTP" });
      }
    }
  });

  app.post("/api/verify/confirm", async (req, res) => {
    const { phone, code, leadData } = req.body;
    
    if (!phone || !code) {
      return res.status(400).json({ error: "Phone and code are required" });
    }

    const storedOtp = otpStore.get(phone);

    if (!storedOtp) {
      return res.status(400).json({ error: "Code expired or invalid" });
    }

    if (Date.now() > storedOtp.expiresAt) {
      otpStore.delete(phone);
      return res.status(400).json({ error: "Code expired" });
    }

    if (storedOtp.code !== code) {
      storedOtp.attempts += 1;
      if (storedOtp.attempts >= 3) {
        otpStore.delete(phone);
        return res.status(400).json({ error: "Too many failed attempts. Please request a new code." });
      }
      return res.status(400).json({ error: "Invalid code" });
    }

    // Success!
    otpStore.delete(phone);

    // Send to Make.com Webhook
    if (process.env.MAKE_WEBHOOK_URL && leadData) {
      try {
        await fetch(process.env.MAKE_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(leadData)
        });
        console.log("Lead successfully sent to Make.com webhook");
      } catch (error) {
        console.error("Error sending lead to Make.com:", error);
        // We don't fail the user verification if the webhook fails, 
        // as the data is still saved to Firebase.
      }
    }

    res.json({ success: true, message: "Phone verified successfully" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
