import { createDoc, findOneDoc } from "../../DB/db.repo.js";
import userModel from "../../DB/model/user.model.js";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "../../common/exceptions/app.exceptions.js";
import { ProviderEnum } from "../../common/enum/user.enum.js";
import { compareHash, hashValue } from "../../common/security/hash.js";
import { encryptValue } from "../../common/security/encryption.js";
import { HashToolEnum } from "../../common/enum/hash.enum.js";
import { createLoginTokens } from "../../common/security/token.security.js";

import { OAuth2Client } from "google-auth-library";
import { GOOGLE_CLIENT_IDS, OTP_EXPIRES_IN } from "../../config/config.js";

import { deleteKey, getTTL, getValue, setValue } from "../../DB/redis.repo.js";
import { generateOtp } from "../../common/security/otp.js";
import { sendEmail } from "../../common/email/send.email.js";
import { otpTemplate } from "../../common/email/otp.template.js";

const client = new OAuth2Client();

async function verify(token) {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: GOOGLE_CLIENT_IDS,
  });

  return ticket.getPayload();
}

export async function signupWithGoogle(idToken) {
  const result = await verify(idToken);

  if (!result.email_verified) {
    throw BadRequestException({ errMsg: "Please verify your email first" });
  }

  const userData = await findOneDoc({
    model: userModel,
    filter: { email: result.email },
  });

  if (userData) {
    if (userData.provider === ProviderEnum.SYSTEM) {
      throw BadRequestException({
        errMsg:
          "You can't login with Google, you need to login with your password",
      });
    }
    if (userData.provider === ProviderEnum.GOOGLE) {
      return { statusCode: 200, tokens: createLoginTokens({ user: userData }) };
    }
  }

  const [newUser] = await createDoc({
    model: userModel,
    insertedData: {
      username: `${result.given_name} ${result.family_name}`,
      email: result.email,
      provider: ProviderEnum.GOOGLE,
      confirmEmail: true,
      profilePicPath: result.picture,
    },
  });

  return { statusCode: 201, tokens: createLoginTokens({ user: newUser }) };
}

export async function signup(userData) {
  const { email } = userData;

  const userEmail = await findOneDoc({ model: userModel, filter: { email } });

  if (userEmail) {
    throw ConflictException({ errMsg: "Email Already Exists" });
  }

  userData.password = await hashValue({ value: userData.password, tool: HashToolEnum.ARGON });

  userData.phone = encryptValue({ value: userData.phone });
  const newUser = await createDoc({ model: userModel, insertedData: userData });

  try {
    await sendConfirmEmailOtp(email);
  } catch (error) {
    console.error("Could not send confirm-email OTP:", error.message);
  }

  return newUser;
}

//--------------------------- OTP (email confirmation)

const confirmEmailKey = (email) => `otp:confirmEmail:${email}`;

// Create a 6-digit OTP, store its hash in Redis with a TTL, and email it.
async function sendConfirmEmailOtp(email) {
  const otp = generateOtp();

  await setValue({
    key: confirmEmailKey(email),
    value: await hashValue({ value: otp }),
    ttl: OTP_EXPIRES_IN,
  });

  await sendEmail({
    to: email,
    subject: "Confirm your email",
    html: otpTemplate({ otp, minutes: OTP_EXPIRES_IN / 60 }),
  });

  return { expiresIn: OTP_EXPIRES_IN };
}

export async function confirmEmail({ email, otp }) {
  const user = await findOneDoc({ model: userModel, filter: { email } });

  if (!user) {
    throw NotFoundException({ errMsg: "User not found" });
  }

  if (user.confirmEmail) {
    throw BadRequestException({ errMsg: "Email already confirmed" });
  }

  const hashedOtp = await getValue({ key: confirmEmailKey(email) });

  if (!hashedOtp) {
    throw BadRequestException({ errMsg: "OTP expired or not found, request a new one" });
  }

  const isMatch = await compareHash({ value: otp, hash: hashedOtp });

  if (!isMatch) {
    throw BadRequestException({ errMsg: "Invalid OTP" });
  }

  user.confirmEmail = true;
  await user.save();

  await deleteKey({ key: confirmEmailKey(email) });

  return { email, confirmEmail: true };
}

export async function resendConfirmEmailOtp({ email }) {
  const user = await findOneDoc({ model: userModel, filter: { email } });

  if (!user) {
    throw NotFoundException({ errMsg: "User not found" });
  }

  if (user.confirmEmail) {
    throw BadRequestException({ errMsg: "Email already confirmed" });
  }

  return await sendConfirmEmailOtp(email);
}

// How many seconds are left before the OTP expires (shows the Redis TTL).
export async function otpTimeLeft({ email }) {
  const secondsLeft = await getTTL({ key: confirmEmailKey(email) });

  return { email, secondsLeft: secondsLeft > 0 ? secondsLeft : 0 };
}

export async function login(userData) {
  const { email, password } = userData;

  const user = await findOneDoc({ model: userModel, filter: { email } });

  if (!user) {
    throw NotFoundException({ errMsg: "Invalid Email or Password" });
  }

  const isMatch = await compareHash({ value: password, hash: user.password });

  if (!isMatch) {
    throw NotFoundException({ errMsg: "Invalid Email or Password" });
  }

  return createLoginTokens({ user });
}
