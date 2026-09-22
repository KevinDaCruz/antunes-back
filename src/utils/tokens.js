import jwt from "jsonwebtoken";

export function signAuthToken(user) {
  return jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

export function serializeUser(user) {
  return {
    id: user._id,
    pseudo: user.pseudo,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    address: user.address,
  };
}
