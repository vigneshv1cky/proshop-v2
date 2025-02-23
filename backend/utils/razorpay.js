// backend/utils/razorpay.js
import Razorpay from 'razorpay';
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Verify a Razorpay payment.
 * @param {string} paymentId - The Razorpay payment ID.
 * @param {string} orderId - The Razorpay order ID.
 * @param {string} signature - The Razorpay signature.
 * @returns {Promise<Object>} - The payment verification result.
 */
export const verifyRazorpayPayment = async (paymentId, orderId, signature) => {
  try {
    const generatedSignature = razorpay.utils.generateSignature(
      orderId + '|' + paymentId,
      process.env.RAZORPAY_KEY_SECRET
    );

    if (generatedSignature !== signature) {
      throw new Error('Invalid Razorpay signature');
    }

    const payment = await razorpay.payments.fetch(paymentId);
    return {
      verified: payment.status === 'captured',
      amount: payment.amount / 100, // Convert from paise to rupees
    };
  } catch (error) {
    console.error('Error verifying Razorpay payment:', error);
    throw new Error('Payment verification failed');
  }
};
