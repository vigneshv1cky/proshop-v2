

// app.post('/create-order', async (req, res) => {

import Razorpay from "razorpay";
import asyncHandler from '../middleware/asyncHandler.js';
import Order from "../models/orderModel.js";
// import dotenv from 'dotenv';
// dotenv.config();
// const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, } = process.env;

// console.log(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET);


const createPayment = asyncHandler(async (req, res) => {
    const { amount, currency } = req.body;
    // order_id: req.body.order_id;
    const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    const options = {
        amount,
        currency,
        receipt: "receipt#1",
        payment_capture: 1
    };

    try {
        const payment = await razorpay.orders.create(options);
        res.json({
            order_id: payment.id,
            currency: payment.currency,
            amount: payment.amount
        });

    } catch (error) {
        console.error("Razorpay Order Creation Error:", error); // Log error details
        res.status(500).json({ error: error.message });
    }
});

const verifyPayment = asyncHandler(async (req, res) => {
    const { userEmail,
        razorpay_payment_id,
        orderId,
        amount } = req.body;

    const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    // Check if the transaction has been used before
    const isNewTransaction = await Order.findOne({ "paymentResult.id": razorpay_payment_id });
    if (isNewTransaction) {
        res.status(400);
        throw new Error("Transaction has already been used before");
    }

    const payment = await razorpay.payments.fetch(razorpay_payment_id)

    const order = await Order.findById(orderId)


    if (order) {
        // Check if the correct amount was paid
        if (order.totalPrice !== payment.amount / 100) {
            res.status(400);
            throw new Error("Incorrect amount paid");
        }

        order.isPaid = true;
        order.paidAt = Date.now();
        order.paymentResult = {
            id: razorpay_payment_id,
            status: payment.status,
            update_time: payment.created_at,
            email_address: payment.email,
        };

        // Update order as paid
        // order.isPaid = true;
        // order.paidAt = Date.now();
        // order.paymentResult = {
        //     id: razorpay_payment_id,
        //     status: status,
        //     update_time: new Date(),
        //     amount: amount / 100,
        // };

        const updatedOrder = await order.save();

        res.json({
            message: "Payment verified successfully!",
            order: updatedOrder,
        });
    } else {
        res.status(404);
        throw new Error("Order not found");
    }
});

const singlePayment = asyncHandler(async (req, res) => {
    const { paymentId } = req.params;

    const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    try {
        const payment = await razorpay.payments.fetch(paymentId)

        if (!payment) {
            return res.status(500).json("Error at razorpay loading")
        }

        res.json({
            status: payment.status,
            method: payment.method,
            amount: payment.amount,
            currency: payment.currency
        })
    } catch (error) {
        res.status(500).json("failed to fetch")
    }
});

export {
    createPayment,
    verifyPayment,
    singlePayment,
};