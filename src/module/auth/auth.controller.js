import { Router } from "express";
import {
  confirmEmail,
  login,
  otpTimeLeft,
  resendConfirmEmailOtp,
  signup,
  signupWithGoogle,
} from "./auth.service.js";
import { successResponse } from "../../common/response/success.response.js";
import validation from "../../middleware/validation.middleware.js";
import {
  confirmEmailSchema,
  loginSchema,
  resendOtpSchema,
  signupSchema,
} from "./auth.validation.js";
const authRouter = Router();

authRouter.post("/signup", validation(signupSchema), async (req, res) => {
  const result = await signup(req.body);

  successResponse({ res, message: "created", data: result, status: 201 });
});

authRouter.post("/login", validation(loginSchema), async (req, res) => {
  console.log({ "req.validateData": req.validateData });

  const result = await login(req.validateData.body);

  successResponse({ res, data: result });
});

authRouter.post(
  "/loginWithGmail",
  // validation(loginSchema),
  async (req, res) => {
  // console.log({ "req.body": req.body });

  const { tokens, statusCode } = await signupWithGoogle(req.body.idToken);
  successResponse({ res, status: statusCode, data: tokens });
  },
);

// POST /auth/confirm-email  { email, otp }
authRouter.post(
  "/confirm-email",
  validation(confirmEmailSchema),
  async (req, res) => {
    const result = await confirmEmail(req.validateData.body);

    successResponse({ res, message: "Email confirmed", data: result });
  },
);

// POST /auth/resend-otp  { email }
authRouter.post(
  "/resend-otp",
  validation(resendOtpSchema),
  async (req, res) => {
    const result = await resendConfirmEmailOtp(req.validateData.body);

    successResponse({ res, message: "OTP sent", data: result });
  },
);

// POST /auth/otp-time-left  { email }  -> seconds left before the OTP expires (Redis TTL)
authRouter.post(
  "/otp-time-left",
  validation(resendOtpSchema),
  async (req, res) => {
    const result = await otpTimeLeft(req.validateData.body);

    successResponse({ res, data: result });
  },
);

export default authRouter;
