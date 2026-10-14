export function otpTemplate({ otp, minutes } = {}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 420px; margin: auto; text-align: center;">
      <h2>Saraha App</h2>
      <p>Use this code to confirm your email:</p>
      <h1 style="letter-spacing: 8px; background: #f2f2f2; padding: 12px; border-radius: 8px;">${otp}</h1>
      <p>This code expires in <b>${minutes} minutes</b>.</p>
      <p style="color: #888; font-size: 12px;">If you didn't create an account, ignore this email.</p>
    </div>
  `;
}
