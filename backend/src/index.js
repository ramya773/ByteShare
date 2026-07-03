import "dotenv/config";

const { setServers } = require('node:dns/promises');
setServers(['1.1.1.1', '8.8.8.8']);


import app from "./app";
import { logger } from "./lib/logger";
import { connectMongoDB } from "./lib/mongodb";

// Use PORT from environment if provided, otherwise default to 5000
const port = Number(process.env.PORT) || 5000;

connectMongoDB()
  .then(() => {
    app.listen(port, () => {
      logger.info({ port }, "Server listening");
    });
  })
  .catch((err) => {
    logger.error({ err }, "Failed to connect to MongoDB");
    process.exit(1);
  });