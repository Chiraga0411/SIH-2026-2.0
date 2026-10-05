// Seed scripts wipe or rewrite data, so they never run in production.
module.exports = function refuseInProduction() {
  if (process.env.NODE_ENV === "production") {
    console.error("Seed scripts refuse to run when NODE_ENV is production.");
    process.exit(1);
  }
};
