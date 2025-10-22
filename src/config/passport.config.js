const GoogleStrategy = require("passport-google-oauth20").Strategy;
const userModel = require("../models/user.model");

module.exports = function (passport) {
  const callbackURL = `${process.env.PUBLIC_BASE_URL}/api/v1/user/google/callback`;

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL,
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
