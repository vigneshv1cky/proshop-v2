import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// Function to generate invoice PDF
const generateInvoicePDF = async (order) => {
  return new Promise((resolve, reject) => {
    const pdfPath = path.join(__dirname, `invoice-${order._id}.pdf`);
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(pdfPath);

    doc.pipe(stream);

    // Invoice Header
    doc.fontSize(20).text('Order Invoice', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Order ID: ${order._id}`);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleString()}`);
    doc.text(`Customer Email: ${order.user.email}`);
    doc.moveDown();

    // Shipping Address
    doc.fontSize(16).text('Shipping Address:', { underline: true });
    doc
      .fontSize(12)
      .text(
        `${order.shippingAddress.address}, ${order.shippingAddress.city}, ${order.shippingAddress.postalCode}, ${order.shippingAddress.country}`
      );
    doc.moveDown();

    // Order Items Table
    doc.fontSize(16).text('Order Items:', { underline: true });
    doc.moveDown();
    order.orderItems.forEach((item, index) => {
      doc
        .fontSize(12)
        .text(
          `${index + 1}. ${item.name} - Qty: ${
            item.qty
          } x $${item.price.toFixed(2)} = $${(item.qty * item.price).toFixed(
            2
          )}`
        );
    });

    doc.moveDown();
    doc.fontSize(14).text(`Subtotal: $${order.itemsPrice.toFixed(2)}`);
    doc.text(`Tax: $${order.taxPrice.toFixed(2)}`);
    doc.text(`Shipping: $${order.shippingPrice.toFixed(2)}`);
    doc.text(`Total: $${order.totalPrice.toFixed(2)}`, { bold: true });
    doc.moveDown();

    doc.text('Thank you for shopping with us!', { align: 'center' });

    doc.end();
    stream.on('finish', () => resolve(pdfPath));
    stream.on('error', (err) => reject(err));
  });
};

// Function to send order confirmation email with PDF invoice
const sendOrderEmail = async (email, order) => {
  try {
    const pdfPath = await generateInvoicePDF(order);

    const transporter = nodemailer.createTransport({
      service: 'Gmail', // Use your email provider
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const orderItemsHtml = order.orderItems
      .map(
        (item) =>
          `<tr>
            <td>${item.name}</td>
            <td>${item.qty}</td>
            <td>$${item.price.toFixed(2)}</td>
            <td>$${(item.qty * item.price).toFixed(2)}</td>
          </tr>`
      )
      .join('');

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Order Confirmation - ${order._id}`,
      html: `
        <h2>Thank you for your order!</h2>
        <p>Order ID: ${order._id}</p>
        <p><strong>Shipping Address:</strong></p>
        <p>${order.shippingAddress.address}, ${order.shippingAddress.city}, ${
        order.shippingAddress.postalCode
      }, ${order.shippingAddress.country}</p>
        <h3>Order Details:</h3>
        <table border="1" cellspacing="0" cellpadding="5">
          <tr>
            <th>Product</th>
            <th>Quantity</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
          ${orderItemsHtml}
        </table>
        <h3>Total: $${order.totalPrice.toFixed(2)}</h3>
        <p>Payment Method: ${order.paymentMethod}</p>
        <p>We will notify you when your order is shipped.</p>
        <p>Best Regards,<br>Your Store Team</p>
      `,
      attachments: [
        {
          filename: `invoice-${order._id}.pdf`,
          path: pdfPath,
          contentType: 'application/pdf',
        },
      ],
    };

    await transporter.sendMail(mailOptions);

    // Cleanup the PDF file after sending
    fs.unlink(pdfPath, (err) => {
      if (err) console.error('Error deleting PDF:', err);
    });
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

export default sendOrderEmail;
