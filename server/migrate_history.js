
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const migrate = async () => {
  await connectDB();
  
  try {
    const collection = mongoose.connection.collection('watchhistories');
    // Drop the old index
    // The old index name is usually user_1_movieSlug_1
    const indexes = await collection.indexes();
    const oldIndex = indexes.find(idx => idx.key.user === 1 && idx.key.movieSlug === 1 && !idx.key.episodeSlug);
    
    if (oldIndex) {
        console.log(`Dropping old index: ${oldIndex.name}`);
        await collection.dropIndex(oldIndex.name);
        console.log('Old index dropped successfully.');
    } else {
        console.log('Old index not found. It might have consistently been updated or never existed.');
    }

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit();
  }
};

migrate();
