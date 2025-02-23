// frontend/src/components/RazorpayPayment.js
import { useEffect } from 'react';
import { toast } from 'react-toastify';
import { loadRazorpay } from '../utils/razorpay';

const RazorpayPayment = ({ amount, onSuccess }) => {
  useEffect(() => {
    const initializeRazorpay = async () => {
      const Razorpay = await loadRazorpay();

      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID,
        amount: amount * 100, // Convert to paise
        currency: 'INR',
        name: 'Your Store',
        description: 'Payment for Order',
        handler: async (response) => {
          onSuccess(
            response.razorpay_payment_id,
            response.razorpay_order_id,
            response.razorpay_signature
          );
        },
        prefill: {
          name: 'Customer Name',
          email: 'customer@example.com',
        },
      };

      const rzp = new Razorpay(options);
      rzp.open();
    };

    initializeRazorpay();
  }, [amount, onSuccess]);

  return null; // No UI, Razorpay handles the modal
};

export default RazorpayPayment;
