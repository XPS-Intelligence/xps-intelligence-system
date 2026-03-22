import express from "express";
import cors from "cors";
import { getHealth } from "@xps/shared";

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json(getHealth("api"));
});

app.get("/ready", (_req, res) => {
  res.json({ ok: true, service: "api", ready: true });
});

app.listen(port, () => {
  console.log(pi listening on );
});
