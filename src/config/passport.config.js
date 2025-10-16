const GoogleStrategy = require("passport-google-oauth20").Strategy;
const userModel = require("../models/user.model");

module.exports = function (passport) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/api/v1/user/google/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile?.emails?.[0]?.value;
          if (!email)
            return done(
              new Error("Thông tin Google profile không có email"),
              null
            );

          const existingUser = await userModel.findOne({ email });

          if (existingUser) {
            if (existingUser.googleId) {
              return done(null, existingUser);
            } else {
              return done(
                {
                  message: "Email đã tồn tại",
                  code: "EMAIL_EXISTS",
                },
                null
              );
            }
          }

          const newUser = await userModel.create({
            firstName: profile?.name?.familyName || "",
            lastName: profile?.name?.givenName || "",
            email,
            googleId: profile?.id,
            avatarUrl: profile?.photos?.[0]?.value || "",
            isVerified: true,
          });

          return done(null, newUser);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
};
