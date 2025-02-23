import express from 'express';
const router = express.Router();
import {
    createPayment,
    singlePayment,
    verifyPayment,
} from '../controllers/razorpayController.js';

router.route('/create-payment').post(createPayment);
router.route('/verify-payment').post(verifyPayment);
router.route('/:id').get(singlePayment);

export default router;