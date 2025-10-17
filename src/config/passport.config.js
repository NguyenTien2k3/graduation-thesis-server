const GoogleStrategy = require("passport-google-oauth20").Strategy;
const userModel = require("../models/user.model");

module.exports = function (passport) {
  const callbackURL = `${process.env.URL_SERVER}/api/v1/user/google/callback`;
  console.log("🔗 Google callback URL:", callbackURL); // 👉 log ra để kiểm tra

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL, // dùng biến ở trên
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
            if (existingUser.isVerified && existingUser.googleId) {
              return done(null, existingUser);
            }

            if (!existingUser.isVerified) {
              await userModel.deleteOne({ _id: existingUser._id });
            } else {
              return done(
                { message: "Email đã tồn tại", code: "EMAIL_EXISTS" },
                null
              );
            }
          }

          const newUser = await userModel.create({
            firstName: profile?.name?.familyName || "",
            lastName: profile?.name?.givenName || "",
            fullName: profile?.displayName || "",
            email,
            dateOfBirth: profile?.birthday || "1999-01-01",
            gender: profile?.gender || "other",
            phone: profile?.phone || null,
            googleId: profile?.id,
            avatarUrl: profile?.photos?.[0]?.value || "",
            isVerified: profile?.verified || false,
          });

          return done(null, newUser);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
};
