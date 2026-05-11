import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import "dotenv/config";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust the proxy to get the correct host and protocol
  app.set('trust proxy', true);

  app.use(express.json());

  // Health check/Ping
  app.get("/api/ping", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // EasyPost Embeddable Session Endpoint
  app.get("/api/easypost-embeddables/session", async (req, res) => {
    const timestamp = new Date().toISOString();
    console.log(`[Server] [${timestamp}] Received session request from ${req.ip}`);
    
    // Set response headers to ensure JSON
    res.setHeader('Content-Type', 'application/json');
    
    try {
      const apiKey = process.env.EASYPOST_API_KEY;
      const subAccountId = process.env.EASYPOST_SUB_ACCOUNT_ID;
      
      // Better origin_host detection:
      // 1. Try APP_URL first (provided by platform)
      // 2. Fall back to X-Forwarded-Host (via req.get('host'))
      // 3. Last resort is current directory logic
      let originHost = "";
      const appUrl = process.env.APP_URL;
      
      if (appUrl) {
        try {
          originHost = new URL(appUrl).hostname;
        } catch (e) {
          originHost = appUrl.split('/')[2] || "";
        }
      }
      
      if (!originHost) {
        originHost = req.get('host') || "localhost";
        originHost = originHost.split(':')[0]; // Remove port
      }
      
      console.log("[Server] Context:", { 
        hasApiKey: !!apiKey, 
        hasSubAccountId: !!subAccountId, 
        originHost,
        headers: {
          host: req.get('host'),
          origin: req.get('origin'),
          referer: req.get('referer')
        }
      });

      if (!apiKey || apiKey === "MY_EASYPOST_API_KEY" || apiKey === "") {
        console.warn("[Server] EASYPOST_API_KEY is not configured.");
        return res.status(200).json({ 
          success: false, 
          error: { message: "EasyPost API Key is missing. Please add your Production API Key (EZPT...) to the Secrets panel." } 
        });
      }

      if (apiKey.startsWith('EZTK')) {
        console.warn("[Server] Test API Key detected.");
        return res.status(200).json({
          success: false,
          error: { message: "EasyPost Embeddable Components require a Production API Key (starting with EZPT). Test Keys (starting with EZTK) are not supported for this feature." }
        });
      }

      if (!apiKey.startsWith('EZPT')) {
        console.warn("[Server] Key format doesn't match standard EZPT prefix.");
        // We still attempt to allow it just in case of alternative formats, but keep the warning in logs
      }

      if (!subAccountId || subAccountId === "MY_SUB_ACCOUNT_ID" || subAccountId === "") {
        console.warn("[Server] EASYPOST_SUB_ACCOUNT_ID is not configured.");
        return res.status(200).json({ 
          success: false, 
          error: { message: "EasyPost Sub-account ID is missing. Please add a valid user_... ID to your secrets." } 
        });
      }

      console.log("[Server] Calling EasyPost API...");
      const response = await fetch("https://api.easypost.com/v2/embeddables/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${Buffer.from(apiKey + ":").toString("base64")}`,
          "User-Agent": "ForgeIntegratorDemo/1.0.0 Node.js/Fetch",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          user_id: subAccountId,
          origin_host: originHost,
        }),
      });

      const responseText = await response.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error("[Server] EasyPost returned non-JSON response:", responseText.substring(0, 500));
        return res.status(200).json({ 
          success: false, 
          status: response.status,
          error: { message: "EasyPost API returned an unexpected non-JSON response.", details: responseText.substring(0, 200) } 
        });
      }

      if (!response.ok) {
        console.error(`[Server] EasyPost API error! Status: ${response.status}`, responseData);
        // We return 200 to ensure the JSON body reaches the client without being intercepted by platform proxies
        return res.status(200).json({ 
          success: false, 
          status: response.status,
          error: responseData.error || responseData 
        });
      }

      console.log("[Server] EasyPost session created successfully");
      return res.json({ success: true, ...responseData });
    } catch (error: any) {
      console.error("[Server] Catch-all error:", error);
      return res.status(200).json({ 
        success: false, 
        error: { message: error.message || "An internal error occurred while processing your request." } 
      });
    }
  });

  // Catch-all for other /api routes
  app.all("/api/*", (req, res) => {
    console.warn(`[Server] Unhandled API request: ${req.method} ${req.url}`);
    res.status(404).json({ error: { message: `Route ${req.url} not found on this server.` } });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("[Server] Starting Vite in middleware mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("[Server] Serving static files from dist...");
    const distPath = path.join(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
