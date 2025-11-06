export const uploadImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });
    const url = `/uploads/images/${req.file.filename}`;
    res.json({ url });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
};
