/**
 * Migration: Set approvalStatus for existing users
 *
 * - All existing active users get approvalStatus: 'approved'
 * - Corporate members with companyInfo.approvalStatus keep their existing status synced
 * - New users will default to 'pending' via schema default
 *
 * Run: cd apps/api && npx ts-node ../../scripts/migrate-approval-status.ts
 */

import mongoose from 'mongoose'

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gameup'

async function migrate() {
  await mongoose.connect(MONGO_URI)
  console.log('Connected to MongoDB')

  const User = mongoose.connection.collection('users')

  // 1. Set all existing users without approvalStatus to 'approved'
  //    (they already have access, so they should remain approved)
  const result1 = await User.updateMany(
    { approvalStatus: { $exists: false } },
    { $set: { approvalStatus: 'approved', approvedAt: new Date() } }
  )
  console.log(`Updated ${result1.modifiedCount} users without approvalStatus → approved`)

  // 2. Sync corporate members: if companyInfo.approvalStatus is 'pending', set top-level to 'pending'
  const result2 = await User.updateMany(
    { memberType: 'corporate', 'companyInfo.approvalStatus': 'pending' },
    { $set: { approvalStatus: 'pending' } }
  )
  console.log(`Synced ${result2.modifiedCount} pending corporate members`)

  // 3. Sync corporate members: if companyInfo.approvalStatus is 'rejected', set top-level to 'rejected'
  const result3 = await User.updateMany(
    { memberType: 'corporate', 'companyInfo.approvalStatus': 'rejected' },
    { $set: { approvalStatus: 'rejected' } }
  )
  console.log(`Synced ${result3.modifiedCount} rejected corporate members`)

  console.log('Migration complete!')
  await mongoose.disconnect()
}

migrate().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
