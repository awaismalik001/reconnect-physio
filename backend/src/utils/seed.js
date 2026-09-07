// Run once to create the admin account and default therapy types:
//   node src/utils/seed.js

require('dotenv').config();
const bcrypt      = require('bcryptjs');
const mongoose    = require('mongoose');
const Admin       = require('../models/Admin');
const TherapyType = require('../models/TherapyType');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅  Connected to MongoDB\n🌱  Seeding database...');

  // Admin account
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await Admin.findOneAndUpdate(
    { email: 'admin@reconnect.com' },
    { password: hashedPassword, name: 'Reconnect Admin' },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );
  console.log('✅  Admin created: admin@reconnect.com | Password: admin123');

  // Default therapy types
  const therapyTypes = [
    { name: 'Manual Therapy',      description: 'Hands-on therapy to mobilize joints and soft tissues' },
    { name: 'Dry Needling',        description: 'Needling technique for muscle pain and tension' },
    { name: 'Exercise Therapy',    description: 'Therapeutic exercises for rehabilitation' },
    { name: 'Electrotherapy',      description: 'Electrical stimulation for pain relief and healing' },
    { name: 'Heat Therapy',        description: 'Application of heat to reduce pain and stiffness' },
    { name: 'Cold Therapy',        description: 'Application of cold to reduce inflammation and swelling' },
    { name: 'Ultrasound Therapy',  description: 'Sound waves to promote tissue healing' },
    { name: 'Postural Correction', description: 'Techniques to improve body posture and alignment' },
  ];

  for (const t of therapyTypes) {
    await TherapyType.findOneAndUpdate(
      { name: t.name },
      t,
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
  }
  console.log(`✅  ${therapyTypes.length} therapy types seeded`);

  console.log('\n🎉  Database seeded successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Login credentials:');
  console.log('  Email   : admin@reconnect.com');
  console.log('  Password: admin123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => { console.error('Seed error:', e); process.exit(1); })
  .finally(() => mongoose.disconnect());
