const express = require("express");
const cors = require("cors");
const { generateTop5Recommendations } = require("./generate_recom.js");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/generate", async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "userId required" });
  }
  try {
    const result = await generateTop5Recommendations(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3100;
app.listen(PORT, () => {
  console.log(`Recommendation API running at http://localhost:${PORT}`);
});
