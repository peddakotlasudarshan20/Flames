import "dotenv/config";
import app from "./app.js";
import { connectDatabase } from "./db.js";

const port = process.env.PORT || 5000;

connectDatabase()
  .catch((error) => {
    console.error("Database connection failed", error.message);
  })
  .finally(() => {
    app.listen(port, () => {
      console.log(`FLAMES compatibility API running on ${port}`);
    });
  });

export default app;
