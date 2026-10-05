const mongoose = require("mongoose");
// Runs fn(session) in a transaction. Errors with .status are meant for the client.
async function inTransaction(fn) {
  const session = await mongoose.startSession();
  try {
    let out;
    await session.withTransaction(async () => { out = await fn(session); });
    return out;
  } finally {
    await session.endSession();
  }
}
const httpError = (status, message) => Object.assign(new Error(message), { status });
module.exports = { inTransaction, httpError };
