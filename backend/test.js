import "dotenv/config";
import mongoose from "mongoose";

// console.log(process.env.MONGODB_URI);

try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("✅ Connected Successfully");

    process.exit(0);

} catch (err) {
    console.error(err);

    process.exit(1);
}