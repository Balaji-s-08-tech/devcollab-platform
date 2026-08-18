const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const GitHubStrategy = require("passport-github2").Strategy;
const User = require("../models/User");

const unique = (values) => [...new Set(values.filter(Boolean))];

const findOrCreateOAuthUser = async ({ provider, providerId, email, name, avatarUrl, profile }) => {
  const providerIdField = provider === "google" ? "googleId" : "githubId";
  const providerProfileField = provider === "google" ? "googleProfile" : "githubProfile";
  const fallbackEmail = `${provider}-${providerId}@oauth.devcollab.local`;

  let user = await User.findOne({ [providerIdField]: providerId });
  if (!user && email) {
    user = await User.findOne({ email: email.toLowerCase() });
  }

  if (!user) {
    user = await User.create({
      name: name || profile?.displayName || `${provider} user`,
      email: (email || fallbackEmail).toLowerCase(),
      [providerIdField]: providerId,
      [providerProfileField]: profile,
      avatar: avatarUrl || null,
      authProviders: [provider],
    });
    return user;
  }

  user[providerIdField] = providerId;
  user[providerProfileField] = profile;
  user.avatar = user.avatar || avatarUrl || null;
  user.authProviders = unique([...(user.authProviders || []), provider]);
  await user.save({ validateBeforeSave: false });

  return user;
};

const configurePassport = () => {
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL:
            process.env.GOOGLE_CALLBACK_URL ||
            "http://localhost:3443/api/auth/oauth/google/callback",
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            const avatarUrl = profile.photos?.[0]?.value;
            const user = await findOrCreateOAuthUser({
              provider: "google",
              providerId: profile.id,
              email,
              name: profile.displayName,
              avatarUrl,
              profile: {
                email,
                avatarUrl,
                name: profile.displayName,
              },
            });
            return done(null, user);
          } catch (err) {
            return done(err);
          }
        }
      )
    );
  }

  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          callbackURL:
            process.env.AUTH_GITHUB_CALLBACK_URL ||
            "http://localhost:3443/api/auth/oauth/github/callback",
          scope: ["user:email"],
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            const avatarUrl = profile.photos?.[0]?.value;
            const user = await findOrCreateOAuthUser({
              provider: "github",
              providerId: String(profile.id),
              email,
              name: profile.displayName || profile.username,
              avatarUrl,
              profile: {
                login: profile.username,
                avatarUrl,
                htmlUrl: profile.profileUrl,
                name: profile.displayName || profile.username,
              },
            });
            return done(null, user);
          } catch (err) {
            return done(err);
          }
        }
      )
    );
  }
};

module.exports = configurePassport;
