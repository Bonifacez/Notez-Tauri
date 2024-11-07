import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
    res.json({ message: "Hello, World!" });
});

router.get("/users", (req, res) => {
    res.json([
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
    ]);
});

export default router;
