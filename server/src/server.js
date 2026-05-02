import "dotenv/config";
import app from "./app.js";
import { connectDatabase } from "./db.js";

const port = process.env.PORT || 5000;

connectDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`FLAMES AI API running on ${port}`);
    });
  })
  .catch((error) => {
    console.error("Database connection failed", error.message);
    process.exit(1);
  });

export default app;
