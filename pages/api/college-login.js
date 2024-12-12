import { MongoClient } from "mongodb";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { username, password, key } = req.body;

    const client = new MongoClient(process.env.MONGODB_URI);

    try {
      await client.connect();
      const database = client.db("SIH");
      const collection = database.collection("admins");

      const user = await collection.findOne({ username, password, key });

      if (user) {
        res.status(200).json({ success: true, collegen: user.collegen });
      } else {
        res.status(401).json({ success: false });
      }
    } catch (error) {
      console.error("Error connecting to MongoDB:", error);
      res.status(500).json({ success: false });
    } finally {
      await client.close();
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}