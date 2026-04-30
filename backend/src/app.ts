import cors from "cors";
import express from "express";
import authRoutes from "./routes/auth.routes.js";
import invitationRoutes from "./routes/invitation.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/invitations", invitationRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default app;
