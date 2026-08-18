const request = require("supertest");
const mongoose = require("mongoose");

let app;

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "test-secret-key-123";
  process.env.MONGODB_URI = "mongodb://localhost:27017/devcollab_test";
  process.env.REDIS_URL = "redis://localhost:6379";

  const express = require("express");
  const cors = require("cors");
  const mongoSanitize = require("express-mongo-sanitize");
  const connectDB = require("../config/db");

  app = express();
  app.use(express.json());
  app.use(cors());
  app.use(mongoSanitize());

  app.use("/api/auth", require("../routes/auth"));
  app.use("/api/projects", require("../routes/projects"));

  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({ success: false, message: err.message });
  });

  await connectDB();
  await mongoose.connection.db.dropDatabase();
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.connection.close();
});

describe("Auth API", () => {
  const user = { name: "Test User", email: "test@devcollab.dev", password: "password123" };
  let token;

  test("POST /api/auth/register — creates a new user", async () => {
    const res = await request(app).post("/api/auth/register").send(user);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(user.email);
    expect(res.body.user.password).toBeUndefined();
  });

  test("POST /api/auth/register — rejects duplicate email", async () => {
    const res = await request(app).post("/api/auth/register").send(user);
    expect(res.status).toBe(409);
  });

  test("POST /api/auth/login — returns token on valid credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: user.email, password: user.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    token = res.body.token;
  });

  test("POST /api/auth/login — rejects invalid credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: user.email, password: "wrongpassword" });
    expect(res.status).toBe(401);
  });

  test("GET /api/auth/me — returns current user with valid token", async () => {
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(user.email);
  });

  test("GET /api/auth/me — rejects unauthenticated request", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});

describe("Projects API", () => {
  let token, projectId;

  beforeAll(async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "test@devcollab.dev", password: "password123" });
    token = res.body.token;
  });

  test("POST /api/projects — creates project", async () => {
    const res = await request(app)
      .post("/api/projects")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Test Project", description: "A test project", icon: "🧪", color: "#6366f1" });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("Test Project");
    projectId = res.body.data._id;
  });

  test("GET /api/projects — lists projects", async () => {
    const res = await request(app).get("/api/projects").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  test("GET /api/projects/:id — gets project details", async () => {
    const res = await request(app).get(`/api/projects/${projectId}`).set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(projectId);
  });

  test("PATCH /api/projects/:id — updates project", async () => {
    const res = await request(app)
      .patch(`/api/projects/${projectId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Updated Project", description: "Updated description" });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Updated Project");
  });
});
