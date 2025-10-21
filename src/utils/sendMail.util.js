const sgMail = require("@sendgrid/mail");

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const sendMail = async ({ email, html, subject, text, cc, bcc }) => {
  try {
    if (!process.env.SENDGRID_API_KEY || !process.env.VERIFIED_SENDER_EMAIL) {
      throw new Error(
        "Thiếu biến môi trường SENDGRID_API_KEY hoặc VERIFIED_SENDER_EMAIL"
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== "string" || !emailRegex.test(email)) {
      throw new Error("Địa chỉ email không hợp lệ");
    }

    if (!subject || typeof subject !== "string" || subject.trim() === "") {
      throw new Error("Tiêu đề là bắt buộc và phải là một chuỗi không rỗng");
    }
    if (!html || typeof html !== "string" || html.trim() === "") {
      throw new Error(
        "Nội dung HTML là bắt buộc và phải là một chuỗi không rỗng"
      );
    }

    const msg = {
      to: email,
      from: {
        name: "TechZone",
        email: process.env.VERIFIED_SENDER_EMAIL,
      },
      subject: subject,
      html: html,
      text: text || undefined,
      cc: cc || undefined,
      bcc: bcc || undefined,
    };

    const info = await sgMail.send(msg);

    return info[0];
  } catch (error) {
    console.error(
      `SendGrid error for ${email}:`,
      error.response?.body || error.message
    );
    throw new Error(`Không thể gửi email: ${error.message}`);
  }
};

module.exports = sendMail;
