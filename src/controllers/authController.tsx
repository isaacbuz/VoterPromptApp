import { Request, Response, NextFunction } from "express";

// Extend Express Request type to include auth-related properties
declare module "express-serve-static-core" {
  interface Request {
    user?: any;
    isAuthenticated?(): boolean;
    logout?(callback?: (err?: any) => void): void; // Define logout signature compatible with passport
    session?: any;
  }
}

// Fix missing `getProviderConfig` error
export function getProviderConfig(provider: string) {
  return {
    provider,
    entryPoint: `https://example-${provider}.com/sso`,
    issuer: `${provider}-app`,
    callbackUrl: `http://localhost:3001/login/callback/${provider}`,
  };
}

// Fix Express request properties not being recognized
export const dashboardHandler = (req: Request, res: Response) => {
  if (req.isAuthenticated && typeof req.isAuthenticated === "function" && req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
};

// Fix Express logout issue
export const logoutHandler = (req: Request, res: Response) => {
  if (req.logout && typeof req.logout === "function") {
    req.logout((err?: any) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Logout failed" });
      }
      // Destroy session to ensure complete logout
      if (req.session) {
        req.session.destroy((err: any) => {
          if (err) {
            console.error("Session destroy error:", err);
            return res.status(500).json({ error: "Session destroy failed" });
          }
          // Set X-Logout header to notify frontend
          res.set("X-Logout", "true");
          res.json({ message: "Logged out successfully" });
        });
      } else {
        res.set("X-Logout", "true");
        res.json({ message: "Logged out successfully" });
      }
    });
  } else {
    res.status(500).json({ error: "Logout function is missing" });
  }
};

// Fix error handler function
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("Server error:", err.stack || err.message);
  res.status(500).json({ error: "Internal Server Error" });
};