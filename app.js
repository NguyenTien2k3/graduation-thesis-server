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

connectDatabase();

app.use(
  cors({
    origin: [
      process.env.CLIENT_URL,
      "https://tech-zone-mu.vercel.app",
      process.env.ADMIN_URL,
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sessionStore = MongoStore.create({
  mongoUrl: process.env.MONGODB_URI,
  collectionName: "sessions",
});

const isProduction = process.env.NODE_ENV === "production";

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

passportConfig(passport);
app.use(passport.initialize());
app.use(passport.session());

initRoutes(app);

module.exports = app;
