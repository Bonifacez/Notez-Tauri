import express from "express";
import apiRoutes from "./routes/api";

const app = express();
const PORT = process.env.PORT || 18321;

app.get("/", (req, res) => {
    res.json({ message: "Hello, World!" });
});

app.use(express.json());
app.use("/api", apiRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
