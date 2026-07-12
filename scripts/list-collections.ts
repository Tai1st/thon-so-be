import 'dotenv/config';
import mongoose from 'mongoose';
async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const collections = await mongoose.connection.db!.listCollections().toArray();
  console.log(collections.map((c) => c.name).sort().join('\n'));
  await mongoose.disconnect();
}
main();
