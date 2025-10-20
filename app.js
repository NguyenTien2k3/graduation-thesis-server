const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("passport");
const initRoutes = require("./src/routes");
const passportConfig = require("./src/config/passport.config");
const connectDatabase = require("./src/config/connectDatabase.config");

const app = express();

// Kết nối cơ sở dữ liệu MongoDB.
connectDatabase();

// Lọc và lấy các URL được phép kết nối từ biến môi trường.
const allowedOrigins = [process.env.CLIENT_URL, process.env.ADMIN_URL].filter(
  (url) => url
);

// Cấu hình CORS (cho phép truy cập từ Client và Admin URL).
app.use(
  cors({
    // Lọc bỏ URL rỗng nếu biến môi trường thiếu.
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// Middleware cơ bản.
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cấu hình lưu trữ Session trong MongoDB.
const sessionStore = MongoStore.create({
  mongoUrl: process.env.MONGODB_URI,
  collectionName: "sessions",
});

const isProduction = process.env.NODE_ENV === "production";

// Cấu hình Middleware Session
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

// Cấu hình và khởi tạo Passport (Authentication)
passportConfig(passport);
app.use(passport.initialize());
app.use(passport.session()); // Kích hoạt session cho Passport.

// Khởi tạo các Router của ứng dụng.
initRoutes(app);

module.exports = app;
