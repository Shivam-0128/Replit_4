import express, { type Express, type ErrorRequestHandler } from "express";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(express.json({ limit: "32kb" }));
app.use(cookieParser());
app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.get("origin");
    if (origin) {
      const host = req.get("x-forwarded-host")?.split(",")[0]?.trim() || req.get("host");
      try {
        if (new URL(origin).host !== host) {
          res.status(403).json({ error: "Cross-site requests are not allowed." }); return;
        }
      } catch { res.status(403).json({ error: "Invalid request origin." }); return; }
    }
    if (!req.is("application/json") && req.path !== "/auth/signout") {
      res.status(415).json({ error: "Send JSON requests." }); return;
    }
  }
  next();
});

app.use("/api", router);
const handleError: ErrorRequestHandler = (err, req, res, _next) => {
  req.log.error({ err }, "Request failed");
  res.status(err.status === 400 ? 400 : 500).json({ error: err.status === 400 ? "Invalid request." : "Something went wrong. Please try again." });
};
app.use(handleError);

export default app;
