const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: true,
  auth: {
    user: process.env.EMAIL_NAME,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

const sendMail = async ({ email, html, subject, text, cc, bcc }) => {
  try {
    if (!process.env.EMAIL_NAME || !process.env.EMAIL_APP_PASSWORD) {
      throw new Error(
        "Thiếu biến môi trường EMAIL_NAME hoặc EMAIL_APP_PASSWORD"
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

    const mailOptions = {
      from: `"TechZone" <${process.env.EMAIL_NAME}>`,
      to: email,
      subject,
      html,
      text: text || undefined,
      cc: cc || undefined,
      bcc: bcc || undefined,
    };
    const info = await transporter.sendMail(mailOptions);

    return info;
  } catch (error) {
    console.error(`SendMail error for ${email}:`, error.message);
    throw new Error(`Không thể gửi email: ${error.message}`);
  }
};

module.exports = sendMail;
