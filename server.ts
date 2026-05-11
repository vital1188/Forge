import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import "dotenv/config";

async function startServer() {
  const app = express();
  const PORT = 3000;

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
      
      // Determine origin_host from request or environment
      let originHost = req.get('host') || "localhost";
      originHost = originHost.split(':')[0]; // Remove port if present
      
      console.log("[Server] Context:", { 
        hasApiKey: !!apiKey, 
        hasSubAccountId: !!subAccountId, 
        originHost 
      });

      if (!apiKey || !subAccountId) {
        console.error("[Server] Missing configuration (API Key or Sub-account ID)");
        return res.status(200).json({ 
          success: false, 
          error: { message: "EasyPost credentials are not fully configured. Please add EASYPOST_API_KEY and EASYPOST_SUB_ACCOUNT_ID to your secrets." } 
        });
      }

      if (apiKey.startsWith('EZTK')) {
        console.warn("[Server] Test API Key detected. EasyPost requires a Production Key for Embeddables.");
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
