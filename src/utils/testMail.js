require("dotenv").config();
const sendMail = require("../utils/sendMail.util");

(async () => {
  try {
    await sendMail({
      email: "nbttien2k3@gmail.com",
      subject: "Test gửi email với Brevo API 🚀",
      html: `
        <h2>Xin chào!</h2>
        <p>Email này được gửi qua <b>Brevo API</b> (Sendinblue) bằng Node.js.</p>
        <p>Nếu bạn thấy email này trong Inbox, nghĩa là cấu hình đã thành công ✅</p>
      `,
    });
    console.log("✅ Gửi email thành công!");
  } catch (err) {
    console.error("❌ Lỗi:", err.message);
  }
})();
