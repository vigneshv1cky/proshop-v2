import { useState } from 'react';
import { Form, Button } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import FormContainer from '../components/FormContainer';
import CheckoutSteps from '../components/CheckoutSteps';
import { savePaymentMethod } from '../slices/cartSlice';

const PaymentScreen = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const cart = useSelector((state) => state.cart);
  const { shippingAddress } = cart;

  const [paymentMethod, setPaymentMethod] = useState('PayPal'); // Default to PayPal

  // Redirect if no shipping address
  if (!shippingAddress.address) {
    navigate('/shipping');
  }

  // Handle form submission
  const submitHandler = (e) => {
    e.preventDefault();
    dispatch(savePaymentMethod(paymentMethod)); // Save payment method to Redux store
    navigate('/placeorder'); // Redirect to place order screen
  };

  return (
    <FormContainer>
      <CheckoutSteps step1 step2 step3 />
      <h1>Payment Method</h1>
      <Form onSubmit={submitHandler}>
        {/* PayPal option */}
        <Form.Check
          type='radio'
          label='PayPal or Credit Card'
          id='PayPal'
          name='paymentMethod'
          value='PayPal'
          checked={paymentMethod === 'PayPal'}
          onChange={(e) => setPaymentMethod(e.target.value)}
        />

        {/* Razorpay option */}
        <Form.Check
          type='radio'
          label='Razorpay'
          id='Razorpay'
          name='paymentMethod'
          value='Razorpay'
          checked={paymentMethod === 'Razorpay'}
          onChange={(e) => setPaymentMethod(e.target.value)}
        />

        {/* Continue button */}
        <Button type='submit' variant='primary'>
          Continue
        </Button>
      </Form>
    </FormContainer>
  );
};

export default PaymentScreen;
