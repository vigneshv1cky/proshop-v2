import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Row, Col, ListGroup, Image, Card, Button } from 'react-bootstrap';
import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import Message from '../components/Message';
import Loader from '../components/Loader';
import {
  useDeliverOrderMutation,
  useGetOrderDetailsQuery,
  useGetPaypalClientIdQuery,
  usePayOrderMutation,
} from '../slices/ordersApiSlice';
import { useState } from 'react';
import axios from 'axios';
import { RAZORPAY_URL } from '../constants';

const OrderScreen = () => {
  const { id: orderId } = useParams();
  const [loadingPayRazorpay, setIsDelivered] = useState(false);
  const [responseId, setResponseId] = useState("");

  const {
    data: order,
    refetch,
    isLoading,
    error,
  } = useGetOrderDetailsQuery(orderId);

  const paymentMethod = order?.paymentMethod;
  const totalPrice = Number(order?.totalPrice);
  const userEmail = order?.user.email;
  const razorpay_Key = "rzp_test_Em6p4dlBEli9T5"

  const [payOrder, { isLoading: loadingPay }] = usePayOrderMutation();

  const [deliverOrder, { isLoading: loadingDeliver }] =
    useDeliverOrderMutation();

  const { userInfo } = useSelector((state) => state.auth);

  const [{ isPending }, paypalDispatch] = usePayPalScriptReducer();

  const {
    data: paypal,
    isLoading: loadingPayPal,
    error: errorPayPal,
  } = useGetPaypalClientIdQuery();

  useEffect(() => {
    if (!errorPayPal && !loadingPayPal && paypal.clientId) {
      const loadPaypalScript = async () => {
        paypalDispatch({
          type: 'resetOptions',
          value: {
            'client-id': paypal.clientId,
            currency: 'USD',
          },
        });
        paypalDispatch({ type: 'setLoadingStatus', value: 'pending' });
      };
      if (order && !order.isPaid) {
        if (!window.paypal) {
          loadPaypalScript();
        }
      }
    }
  }, [errorPayPal, loadingPayPal, order, paypal, paypalDispatch]);

  function onApprove(data, actions) {
    return actions.order.capture().then(async function (details) {
      try {
        await payOrder({ orderId, details });
        refetch();
        toast.success('Order is paid');
      } catch (err) {
        toast.error(err?.data?.message || err.error);
      }
    });
  }

  function onError(err) {
    toast.error(err.message);
  }

  function createOrder(data, actions) {
    return actions.order
      .create({
        purchase_units: [
          {
            amount: { value: order.totalPrice },
          },
        ],
      })
      .then((orderID) => {
        return orderID;
      });
  }

  const deliverHandler = async () => {
    await deliverOrder(orderId);
    refetch();
  };

  const loadScript = (src) => {
    return new Promise((resolve) => {
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve(true);
            return;
        }

        const script = document.createElement("script");
        script.src = src;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

  const handleRazorpayPayment = async () => {
    try {
      const { data } = await axios.post(`${RAZORPAY_URL}/create-payment`, {
      // const { data } = await axios.post(`http://localhost:5000/api/razorpay/create-payment`, {
          amount: totalPrice * 100,
          currency: "INR",
      }, {
          headers: { 'Content-Type': 'application/json' }
      });

      handleRazorpayScreen(data.amount
      );
  } catch (error) {
      console.error("Error creating order:", error);
  }
  }


const handleRazorpayScreen = async (amount) => {
  console.log("amount", amount);
  
  const res = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
  if (!res) {
      alert("Failed to load Razorpay SDK");
      return;
  }

  const options = {
      key: 'rzp_test_Em6p4dlBEli9T5',
      amount,
      currency: "INR",
      name: "Papaya Coders",
      description: "Payment to Papaya Coders",
      image: "https://papayacoders.com/demo.png",
      handler: async function (response) {
          setResponseId(response.razorpay_payment_id);
          try {
              // const saveResponse = await axios.post(`http://localhost:5000/api/razorpay/verify-payment`, {
              const saveResponse = await axios.post(`${RAZORPAY_URL}/verify-payment`, {
                userEmail: userEmail,
                orderId: orderId,
                razorpay_payment_id: response.razorpay_payment_id,
                amount: amount / 100,
              }, {
                  headers: { 'Content-Type': 'application/json' }
              });

              console.log("Payment Verified and Saved:", saveResponse.data);
          } catch (error) {
              console.error("Error saving payment details:", error);
          }

          refetch();
      },
      prefill: {
          name: "ProShop",
          email: userEmail,
      },
      theme: { color: "#F4C430" },
  };

  const paymentObject = new window.Razorpay(options);
  paymentObject.open();
};

  return isLoading ? (
    <Loader />
  ) : error ? (
    <Message variant='danger'>{error.data.message}</Message>
  ) : (
    <>
      <h1>Order {order._id}</h1>
      <Row>
        <Col md={8}>
          <ListGroup variant='flush'>
            <ListGroup.Item>
              <h2>Shipping</h2>
              <p>
                <strong>Name: </strong> {order.user.name}
              </p>
              <p>
                <strong>Email: </strong>{' '}
                <a href={`mailto:${order.user.email}`}>{order.user.email}</a>
              </p>
              <p>
                <strong>Address:</strong>
                {order.shippingAddress.address}, {order.shippingAddress.city}{' '}
                {order.shippingAddress.postalCode},{' '}
                {order.shippingAddress.country}
              </p>
              {order.isDelivered ? (
                <Message variant='success'>
                  Delivered on {order.deliveredAt}
                </Message>
              ) : (
                <Message variant='danger'>Not Delivered</Message>
              )}
            </ListGroup.Item>

            <ListGroup.Item>
              <h2>Payment Method</h2>
              <p>
                <strong>Method: </strong>
                {order.paymentMethod}
              </p>
              {order.isPaid ? (
                <Message variant='success'>Paid on {order.paidAt}</Message>
              ) : (
                <Message variant='danger'>Not Paid</Message>
              )}
            </ListGroup.Item>

            <ListGroup.Item>
              <h2>Order Items</h2>
              {order.orderItems.length === 0 ? (
                <Message>Order is empty</Message>
              ) : (
                <ListGroup variant='flush'>
                  {order.orderItems.map((item, index) => (
                    <ListGroup.Item key={index}>
                      <Row>
                        <Col md={1}>
                          <Image
                            src={item.image}
                            alt={item.name}
                            fluid
                            rounded
                          />
                        </Col>
                        <Col>
                          <Link to={`/product/${item.product}`}>
                            {item.name}
                          </Link>
                        </Col>
                        <Col md={4}>
                          {item.qty} x ₹{item.price} = ₹{item.qty * item.price}
                        </Col>
                      </Row>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </ListGroup.Item>
          </ListGroup>
        </Col>
        <Col md={4}>
          <Card>
            <ListGroup variant='flush'>
              <ListGroup.Item>
                <h2>Order Summary</h2>
              </ListGroup.Item>
              <ListGroup.Item>
                <Row>
                  <Col>Items</Col>
                  <Col>₹{order.itemsPrice}</Col>
                </Row>
              </ListGroup.Item>
              <ListGroup.Item>
                <Row>
                  <Col>Shipping</Col>
                  <Col>₹{order.shippingPrice}</Col>
                </Row>
              </ListGroup.Item>
              <ListGroup.Item>
                <Row>
                  <Col>Tax</Col>
                  <Col>₹{order.taxPrice}</Col>
                </Row>
              </ListGroup.Item>

              <ListGroup.Item>
                <Row>
                  <Col>Total</Col>
                  <Col>₹{order.totalPrice}</Col>
                </Row>
              </ListGroup.Item>

              {!order.isPaid && (
  <ListGroup.Item>
    {loadingPay || loadingPayRazorpay ? <Loader /> : (
      <div>
        {paymentMethod === 'PayPal' ? (
          <PayPalButtons createOrder={createOrder} onApprove={onApprove} onError={onError} />
        ) : paymentMethod === 'Razorpay' ? (
          <Button onClick={() => handleRazorpayPayment()}>Pay with Razorpay</Button>
        ) : (
          <Message variant="danger">Invalid Payment Method</Message>
        )}
      </div>
    )}
  </ListGroup.Item>
)}
               {/* {!order.isPaid && (
                <ListGroup.Item>
                  {loadingPay && <Loader />}

                  {isPending ? (
                    <Loader />
                  ) : (
                    <div>
                      

                      <div>
                        <PayPalButtons
                          createOrder={createOrder}
                          onApprove={onApprove}
                          onError={onError}
                        ></PayPalButtons>
                      </div>
                    </div>
                  )}
                </ListGroup.Item>
              )}  */}

              {loadingDeliver && <Loader />}

              {userInfo &&
                userInfo.isAdmin &&
                order.isPaid &&
                !order.isDelivered && (
                  <ListGroup.Item>
                    <Button
                      type='button'
                      className='btn btn-block'
                      onClick={deliverHandler}
                    >
                      Mark As Delivered
                    </Button>
                  </ListGroup.Item>
                )}
            </ListGroup>
          </Card>
        </Col>  
      </Row>
    </>
  );
};

export default OrderScreen;


// import { useEffect } from 'react';
// import { Link, useParams } from 'react-router-dom';
// import { Row, Col, ListGroup, Image, Card, Button } from 'react-bootstrap';
// import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
// import { useSelector } from 'react-redux';
// import { toast } from 'react-toastify';
// import Message from '../components/Message';
// import Loader from '../components/Loader';
// import {
//   useDeliverOrderMutation,
//   useGetOrderDetailsQuery,
//   useGetPaypalClientIdQuery,
//   usePayOrderMutation,
// } from '../slices/ordersApiSlice';

// const OrderScreen = () => {
//   const { id: orderId } = useParams();

//   const {
//     data: order,
//     refetch,
//     isLoading,
//     error,
//   } = useGetOrderDetailsQuery(orderId);

//   const paymentMethod = order?.paymentMethod;

//   console.log("paymentMethod",paymentMethod);
  
  

//   const [payOrder, { isLoading: loadingPay }] = usePayOrderMutation();

//   const [deliverOrder, { isLoading: loadingDeliver }] =
//     useDeliverOrderMutation();

//   const { userInfo } = useSelector((state) => state.auth);

//   const [{ isPending }, paypalDispatch] = usePayPalScriptReducer();

//   const {
//     data: paypal,
//     isLoading: loadingPayPal,
//     error: errorPayPal,
//   } = useGetPaypalClientIdQuery();

//   useEffect(() => {
//     if (!errorPayPal && !loadingPayPal && paypal.clientId) {
//       const loadPaypalScript = async () => {
//         paypalDispatch({
//           type: 'resetOptions',
//           value: {
//             'client-id': paypal.clientId,
//             currency: 'USD',
//           },
//         });
//         paypalDispatch({ type: 'setLoadingStatus', value: 'pending' });
//       };
//       if (order && !order.isPaid) {
//         if (!window.paypal) {
//           loadPaypalScript();
//         }
//       }
//     }
//   }, [errorPayPal, loadingPayPal, order, paypal, paypalDispatch]);

//   function onApprove(data, actions) {
//     return actions.order.capture().then(async function (details) {
//       try {
//         await payOrder({ orderId, details });
//         refetch();
//         toast.success('Order is paid');
//       } catch (err) {
//         toast.error(err?.data?.message || err.error);
//       }
//     });
//   }

//   // TESTING ONLY! REMOVE BEFORE PRODUCTION
//   // async function onApproveTest() {
//   //   await payOrder({ orderId, details: { payer: {} } });
//   //   refetch();

//   //   toast.success('Order is paid');
//   // }

//   function onError(err) {
//     toast.error(err.message);
//   }

//   function createOrder(data, actions) {
//     return actions.order
//       .create({
//         purchase_units: [
//           {
//             amount: { value: order.totalPrice },
//           },
//         ],
//       })
//       .then((orderID) => {
//         return orderID;
//       });
//   }

//   const deliverHandler = async () => {
//     await deliverOrder(orderId);
//     refetch();
//   };

//   return isLoading ? (
//     <Loader />
//   ) : error ? (
//     <Message variant='danger'>{error.data.message}</Message>
//   ) : (
//     <>
//       <h1>Order {order._id}</h1>
//       <Row>
//         <Col md={8}>
//           <ListGroup variant='flush'>
//             <ListGroup.Item>
//               <h2>Shipping</h2>
//               <p>
//                 <strong>Name: </strong> {order.user.name}
//               </p>
//               <p>
//                 <strong>Email: </strong>{' '}
//                 <a href={`mailto:${order.user.email}`}>{order.user.email}</a>
//               </p>
//               <p>
//                 <strong>Address:</strong>
//                 {order.shippingAddress.address}, {order.shippingAddress.city}{' '}
//                 {order.shippingAddress.postalCode},{' '}
//                 {order.shippingAddress.country}
//               </p>
//               {order.isDelivered ? (
//                 <Message variant='success'>
//                   Delivered on {order.deliveredAt}
//                 </Message>
//               ) : (
//                 <Message variant='danger'>Not Delivered</Message>
//               )}
//             </ListGroup.Item>

//             <ListGroup.Item>
//               <h2>Payment Method</h2>
//               <p>
//                 <strong>Method: </strong>
//                 {order.paymentMethod}
//               </p>
//               {order.isPaid ? (
//                 <Message variant='success'>Paid on {order.paidAt}</Message>
//               ) : (
//                 <Message variant='danger'>Not Paid</Message>
//               )}
//             </ListGroup.Item>

//             <ListGroup.Item>
//               <h2>Order Items</h2>
//               {order.orderItems.length === 0 ? (
//                 <Message>Order is empty</Message>
//               ) : (
//                 <ListGroup variant='flush'>
//                   {order.orderItems.map((item, index) => (
//                     <ListGroup.Item key={index}>
//                       <Row>
//                         <Col md={1}>
//                           <Image
//                             src={item.image}
//                             alt={item.name}
//                             fluid
//                             rounded
//                           />
//                         </Col>
//                         <Col>
//                           <Link to={`/product/${item.product}`}>
//                             {item.name}
//                           </Link>
//                         </Col>
//                         <Col md={4}>
//                           {item.qty} x ₹{item.price} = ₹{item.qty * item.price}
//                         </Col>
//                       </Row>
//                     </ListGroup.Item>
//                   ))}
//                 </ListGroup>
//               )}
//             </ListGroup.Item>
//           </ListGroup>
//         </Col>
//         <Col md={4}>
//           <Card>
//             <ListGroup variant='flush'>
//               <ListGroup.Item>
//                 <h2>Order Summary</h2>
//               </ListGroup.Item>
//               <ListGroup.Item>
//                 <Row>
//                   <Col>Items</Col>
//                   <Col>₹{order.itemsPrice}</Col>
//                 </Row>
//               </ListGroup.Item>
//               <ListGroup.Item>
//                 <Row>
//                   <Col>Shipping</Col>
//                   <Col>₹{order.shippingPrice}</Col>
//                 </Row>
//               </ListGroup.Item>
//               <ListGroup.Item>
//                 <Row>
//                   <Col>Tax</Col>
//                   <Col>₹{order.taxPrice}</Col>
//                 </Row>
//               </ListGroup.Item>
//               <ListGroup.Item>
//                 <Row>
//                   <Col>Total</Col>
//                   <Col>₹{order.totalPrice}</Col>
//                 </Row>
//               </ListGroup.Item>
//               {!order.isPaid && (
//                 <ListGroup.Item>
//                   {loadingPay && <Loader />}

//                   {isPending ? (
//                     <Loader />
//                   ) : (
//                     <div>
//                       {/* THIS BUTTON IS FOR TESTING! REMOVE BEFORE PRODUCTION! */}
//                       {/* <Button
//                         style={{ marginBottom: '10px' }}
//                         onClick={onApproveTest}
//                       >
//                         Test Pay Order
//                       </Button> */}

//                       <div>
//                         <PayPalButtons
//                           createOrder={createOrder}
//                           onApprove={onApprove}
//                           onError={onError}
//                         ></PayPalButtons>
//                       </div>
//                     </div>
//                   )}
//                 </ListGroup.Item>
//               )}

//               {loadingDeliver && <Loader />}

//               {userInfo &&
//                 userInfo.isAdmin &&
//                 order.isPaid &&
//                 !order.isDelivered && (
//                   <ListGroup.Item>
//                     <Button
//                       type='button'
//                       className='btn btn-block'
//                       onClick={deliverHandler}
//                     >
//                       Mark As Delivered
//                     </Button>
//                   </ListGroup.Item>
//                 )}
//             </ListGroup>
//           </Card>
//         </Col>
        
        
//       </Row>
//     </>
//   );
// };

// export default OrderScreen;
