const mongoose = require("mongoose");

const connectDB = async () => {
    if (!process.env.MONGO_URI) {
        console.warn("MONGO_URI is not configured; database-backed routes will be unavailable until it is set.");
        return false;
    }
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected ✅");
        return true;
    } catch (error) {
        console.error("MongoDB Connection Failed ❌");
        console.error(error.message);
        return false;
    }
};

module.exports = connectDB;
