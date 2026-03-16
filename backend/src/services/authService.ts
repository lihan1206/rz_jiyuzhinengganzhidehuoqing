import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { HttpError } from "../utils/httpError";

export async function login(username: string, password: string) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    throw new HttpError(401, "用户名或密码错误");
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new HttpError(401, "用户名或密码错误");
  }

  const token = jwt.sign(
    {
      sub: user.id,
      username: user.username,
      role: user.role
    },
    config.jwtSecret,
    { expiresIn: "12h" }
  );

  return {
    token,
    user: {
      username: user.username,
      role: user.role
    }
  };
}
