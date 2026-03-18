require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || "http://localhost:5173",
  }),
);
app.use(express.json());

// Routes
app.use("/api/beans", require("./routes/beans"));
app.use("/api/containers", require("./routes/containers"));
app.use("/api/shops", require("./routes/shops"));

// Health check — useful for Docker and debugging
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Bean Tracker API running on port ${PORT}`);
});
