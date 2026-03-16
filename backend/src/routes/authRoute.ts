import { Router } from "express";
import { z } from "zod";
import { login } from "../services/authService";

export const authRoute = Router();

const loginSchema = z.object({
  username: z.string().min(1, "请输入用户名"),
  password: z.string().min(1, "请输入密码")
});

authRoute.post("/login", async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);
    const data = await login(payload.username, payload.password);
    res.json(data);
  } catch (err) {
    next(err);
  }
});
