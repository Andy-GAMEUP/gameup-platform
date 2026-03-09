/**
 * GAMEUP MySQL → MongoDB Migration Script
 *
 * Migrates data from the legacy Spring Boot MySQL database
 * to the new Express + MongoDB backend.
 *
 * Usage:
 *   npx tsx scripts/migrate-mysql-to-mongodb.ts
 *   npx tsx scripts/migrate-mysql-to-mongodb.ts --dry-run
 *
 * Environment variables:
 *   MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE
 *   MONGODB_URI
 */

import mysql from 'mysql2/promise'
import mongoose from 'mongoose'
import { Types } from 'mongoose'

const BATCH_SIZE = 100

const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST ?? 'localhost',
  port: Number(process.env.MYSQL_PORT ?? 3306),
  user: process.env.MYSQL_USER ?? 'root',
  password: process.env.MYSQL_PASSWORD ?? '',
  database: process.env.MYSQL_DATABASE ?? 'gameup',
}

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/gameup'

const isDryRun = process.argv.includes('--dry-run')

type IdMap = Map<number, Types.ObjectId>

const idMaps: Record<string, IdMap> = {
  users: new Map(),
  games: new Map(),
  posts: new Map(),
  comments: new Map(),
  partners: new Map(),
  announcements: new Map(),
}

function log(message: string): void {
  console.log(`[${new Date().toISOString()}] ${message}`)
}

function logError(context: string, error: unknown): void {
  const msg = error instanceof Error ? error.message : String(error)
  console.error(`[ERROR] ${context}: ${msg}`)
}

async function getTableCount(conn: mysql.Connection, table: string): Promise<number> {
  const [rows] = await conn.query<mysql.RowDataPacket[]>(`SELECT COUNT(*) AS cnt FROM \`${table}\``)
  return (rows[0] as { cnt: number }).cnt
}

async function fetchBatch(
  conn: mysql.Connection,
  table: string,
  offset: number,
): Promise<mysql.RowDataPacket[]> {
  const [rows] = await conn.query<mysql.RowDataPacket[]>(
    `SELECT * FROM \`${table}\` LIMIT ${BATCH_SIZE} OFFSET ${offset}`,
  )
  return rows
}

function toObjectId(mysqlId: number, map: IdMap): Types.ObjectId {
  if (!map.has(mysqlId)) {
    map.set(mysqlId, new Types.ObjectId())
  }
  return map.get(mysqlId)!
}

async function migrateUsers(
  conn: mysql.Connection,
  db: mongoose.mongo.Db,
): Promise<void> {
  const collection = db.collection('users')
  const total = await getTableCount(conn, 'users')
  log(`Migrating users: 0/${total}...`)

  let offset = 0
  let migrated = 0

  while (offset < total) {
    const rows = await fetchBatch(conn, 'users', offset)

    const docs = rows.map((row) => {
      const _id = toObjectId(row.id as number, idMaps.users)
      return {
        _id,
        email: row.email ?? '',
        username: row.nickname ?? row.email ?? '',
        password: row.password ?? undefined,
        role: (row.role === 'ADMIN' ? 'admin' : row.role === 'DEVELOPER' ? 'developer' : 'player') as
          | 'admin'
          | 'developer'
          | 'player',
        isActive: Boolean(row.is_active ?? true),
        memberType: (row.member_type === 'CORPORATE' ? 'corporate' : 'individual') as
          | 'individual'
          | 'corporate',
        bio: row.bio ?? '',
        profileImage: row.profile_image ?? undefined,
        level: row.level ?? 1,
        activityScore: row.activity_score ?? 0,
        points: row.points ?? 0,
        companyInfo:
          row.company_name
            ? {
                companyName: row.company_name ?? undefined,
                phone: row.company_phone ?? undefined,
                companyEmail: row.company_email ?? undefined,
                employeeCount: row.employee_count ?? undefined,
                businessNumber: row.business_number ?? undefined,
                companyLogo: row.company_logo ?? undefined,
                businessLicense: row.business_license ?? undefined,
                companyType: row.company_type ? [row.company_type] : [],
                homepageUrl: row.homepage_url ?? undefined,
                isApproved: Boolean(row.is_approved ?? false),
                description: row.company_description ?? undefined,
              }
            : undefined,
        bannedUntil: row.banned_until ? new Date(row.banned_until as string) : undefined,
        banReason: row.ban_reason ?? undefined,
        lastLoginAt: row.last_login_at ? new Date(row.last_login_at as string) : undefined,
        createdAt: row.created_at ? new Date(row.created_at as string) : new Date(),
        updatedAt: row.updated_at ? new Date(row.updated_at as string) : new Date(),
      }
    })

    if (!isDryRun && docs.length > 0) {
      try {
        await collection.insertMany(docs, { ordered: false })
      } catch (err) {
        logError('users batch insert', err)
      }
    }

    migrated += rows.length
    offset += BATCH_SIZE
    log(`Migrating users: ${migrated}/${total}...`)
  }

  log(`Users migration complete: ${migrated} records`)
}

async function migratePosts(
  conn: mysql.Connection,
  db: mongoose.mongo.Db,
): Promise<void> {
  const collection = db.collection('posts')
  const total = await getTableCount(conn, 'posts')
  log(`Migrating posts: 0/${total}...`)

  let offset = 0
  let migrated = 0

  const channelMap: Record<string, string> = {
    NOTICE: 'notice',
    GENERAL: 'general',
    DEV: 'dev',
    DAILY: 'daily',
    GAME_TALK: 'game-talk',
    INFO_SHARE: 'info-share',
    NEW_GAME: 'new-game',
  }

  while (offset < total) {
    const rows = await fetchBatch(conn, 'posts', offset)

    const docs = rows.map((row) => {
      const _id = toObjectId(row.id as number, idMaps.posts)
      const authorId = idMaps.users.get(row.user_id as number) ?? new Types.ObjectId()
      const rawChannel = String(row.channel ?? 'GENERAL').toUpperCase()

      return {
        _id,
        title: row.title ?? '',
        content: row.content ?? '',
        author: authorId,
        channel: channelMap[rawChannel] ?? 'general',
        images: [],
        links: [],
        tags: row.tags ? String(row.tags).split(',').map((t: string) => t.trim()) : [],
        likes: [],
        bookmarks: [],
        views: row.views ?? 0,
        commentCount: row.comment_count ?? 0,
        status: (row.status === 'HIDDEN' ? 'hidden' : row.status === 'DELETED' ? 'deleted' : 'active') as
          | 'active'
          | 'hidden'
          | 'deleted',
        isPinned: Boolean(row.is_pinned ?? false),
        isHot: Boolean(row.is_hot ?? false),
        hotScore: row.hot_score ?? 0,
        isTempSave: false,
        reportCount: 0,
        reports: [],
        createdAt: row.created_at ? new Date(row.created_at as string) : new Date(),
        updatedAt: row.updated_at ? new Date(row.updated_at as string) : new Date(),
      }
    })

    if (!isDryRun && docs.length > 0) {
      try {
        await collection.insertMany(docs, { ordered: false })
      } catch (err) {
        logError('posts batch insert', err)
      }
    }

    migrated += rows.length
    offset += BATCH_SIZE
    log(`Migrating posts: ${migrated}/${total}...`)
  }

  log(`Posts migration complete: ${migrated} records`)
}

async function migrateComments(
  conn: mysql.Connection,
  db: mongoose.mongo.Db,
): Promise<void> {
  const collection = db.collection('comments')
  const total = await getTableCount(conn, 'comments')
  log(`Migrating comments: 0/${total}...`)

  let offset = 0
  let migrated = 0

  while (offset < total) {
    const rows = await fetchBatch(conn, 'comments', offset)

    const docs = rows.map((row) => {
      const _id = toObjectId(row.id as number, idMaps.comments)
      const authorId = idMaps.users.get(row.user_id as number) ?? new Types.ObjectId()
      const postId = idMaps.posts.get(row.post_id as number) ?? new Types.ObjectId()

      return {
        _id,
        content: row.content ?? '',
        author: authorId,
        postId,
        parentId: row.parent_id ? idMaps.comments.get(row.parent_id as number) ?? null : null,
        likes: [],
        reportCount: 0,
        reports: [],
        isDeleted: Boolean(row.is_deleted ?? false),
        createdAt: row.created_at ? new Date(row.created_at as string) : new Date(),
        updatedAt: row.updated_at ? new Date(row.updated_at as string) : new Date(),
      }
    })

    if (!isDryRun && docs.length > 0) {
      try {
        await collection.insertMany(docs, { ordered: false })
      } catch (err) {
        logError('comments batch insert', err)
      }
    }

    migrated += rows.length
    offset += BATCH_SIZE
    log(`Migrating comments: ${migrated}/${total}...`)
  }

  log(`Comments migration complete: ${migrated} records`)
}

async function migrateGames(
  conn: mysql.Connection,
  db: mongoose.mongo.Db,
): Promise<void> {
  const collection = db.collection('games')
  const total = await getTableCount(conn, 'games')
  log(`Migrating games: 0/${total}...`)

  let offset = 0
  let migrated = 0

  while (offset < total) {
    const rows = await fetchBatch(conn, 'games', offset)

    const docs = rows.map((row) => {
      const _id = toObjectId(row.id as number, idMaps.games)
      const developerId = idMaps.users.get(row.developer_id as number) ?? new Types.ObjectId()

      return {
        _id,
        title: row.title ?? '',
        description: row.description ?? '',
        genre: row.genre ?? '',
        developerId,
        thumbnail: row.thumbnail ?? undefined,
        gameFile: row.game_file ?? '',
        price: row.price ?? 0,
        isPaid: Boolean(row.is_paid ?? false),
        playCount: row.play_count ?? 0,
        rating: row.rating ?? 0,
        status: (['draft', 'beta', 'published', 'archived'].includes(String(row.status).toLowerCase())
          ? String(row.status).toLowerCase()
          : 'draft') as 'draft' | 'beta' | 'published' | 'archived',
        approvalStatus: (['pending', 'review', 'approved', 'rejected'].includes(
          String(row.approval_status).toLowerCase(),
        )
          ? String(row.approval_status).toLowerCase()
          : 'pending') as 'pending' | 'review' | 'approved' | 'rejected',
        serviceType: (row.service_type === 'live' ? 'live' : 'beta') as 'beta' | 'live',
        monetization: (['free', 'ad', 'paid'].includes(String(row.monetization).toLowerCase())
          ? String(row.monetization).toLowerCase()
          : 'free') as 'free' | 'ad' | 'paid',
        testers: row.testers ?? 0,
        feedbackCount: row.feedback_count ?? 0,
        tags: row.tags ? String(row.tags).split(',').map((t: string) => t.trim()) : [],
        createdAt: row.created_at ? new Date(row.created_at as string) : new Date(),
        updatedAt: row.updated_at ? new Date(row.updated_at as string) : new Date(),
      }
    })

    if (!isDryRun && docs.length > 0) {
      try {
        await collection.insertMany(docs, { ordered: false })
      } catch (err) {
        logError('games batch insert', err)
      }
    }

    migrated += rows.length
    offset += BATCH_SIZE
    log(`Migrating games: ${migrated}/${total}...`)
  }

  log(`Games migration complete: ${migrated} records`)
}

async function migrateReviews(
  conn: mysql.Connection,
  db: mongoose.mongo.Db,
): Promise<void> {
  const collection = db.collection('reviews')
  const total = await getTableCount(conn, 'reviews')
  log(`Migrating reviews: 0/${total}...`)

  let offset = 0
  let migrated = 0

  while (offset < total) {
    const rows = await fetchBatch(conn, 'reviews', offset)

    const docs = rows.map((row) => {
      const authorId = idMaps.users.get(row.user_id as number) ?? new Types.ObjectId()
      const gameId = idMaps.games.get(row.game_id as number) ?? new Types.ObjectId()

      return {
        _id: new Types.ObjectId(),
        content: row.content ?? '',
        rating: row.rating ?? 0,
        author: authorId,
        gameId,
        likes: [],
        isDeleted: Boolean(row.is_deleted ?? false),
        createdAt: row.created_at ? new Date(row.created_at as string) : new Date(),
        updatedAt: row.updated_at ? new Date(row.updated_at as string) : new Date(),
      }
    })

    if (!isDryRun && docs.length > 0) {
      try {
        await collection.insertMany(docs, { ordered: false })
      } catch (err) {
        logError('reviews batch insert', err)
      }
    }

    migrated += rows.length
    offset += BATCH_SIZE
    log(`Migrating reviews: ${migrated}/${total}...`)
  }

  log(`Reviews migration complete: ${migrated} records`)
}

async function migrateScraps(
  conn: mysql.Connection,
  db: mongoose.mongo.Db,
): Promise<void> {
  const collection = db.collection('scraps')
  const total = await getTableCount(conn, 'scraps')
  log(`Migrating scraps: 0/${total}...`)

  let offset = 0
  let migrated = 0

  while (offset < total) {
    const rows = await fetchBatch(conn, 'scraps', offset)

    const docs = rows.map((row) => {
      const userId = idMaps.users.get(row.user_id as number) ?? new Types.ObjectId()

      return {
        _id: new Types.ObjectId(),
        userId,
        targetType: String(row.target_type ?? 'post').toLowerCase(),
        targetId: row.post_id
          ? idMaps.posts.get(row.post_id as number) ?? new Types.ObjectId()
          : new Types.ObjectId(),
        createdAt: row.created_at ? new Date(row.created_at as string) : new Date(),
      }
    })

    if (!isDryRun && docs.length > 0) {
      try {
        await collection.insertMany(docs, { ordered: false })
      } catch (err) {
        logError('scraps batch insert', err)
      }
    }

    migrated += rows.length
    offset += BATCH_SIZE
    log(`Migrating scraps: ${migrated}/${total}...`)
  }

  log(`Scraps migration complete: ${migrated} records`)
}

async function migrateFollows(
  conn: mysql.Connection,
  db: mongoose.mongo.Db,
): Promise<void> {
  const collection = db.collection('follows')
  const total = await getTableCount(conn, 'follows')
  log(`Migrating follows: 0/${total}...`)

  let offset = 0
  let migrated = 0

  while (offset < total) {
    const rows = await fetchBatch(conn, 'follows', offset)

    const docs = rows.map((row) => {
      const followerId = idMaps.users.get(row.follower_id as number) ?? new Types.ObjectId()
      const followingId = idMaps.users.get(row.following_id as number) ?? new Types.ObjectId()

      return {
        _id: new Types.ObjectId(),
        follower: followerId,
        following: followingId,
        createdAt: row.created_at ? new Date(row.created_at as string) : new Date(),
      }
    })

    if (!isDryRun && docs.length > 0) {
      try {
        await collection.insertMany(docs, { ordered: false })
      } catch (err) {
        logError('follows batch insert', err)
      }
    }

    migrated += rows.length
    offset += BATCH_SIZE
    log(`Migrating follows: ${migrated}/${total}...`)
  }

  log(`Follows migration complete: ${migrated} records`)
}

async function migratePartners(
  conn: mysql.Connection,
  db: mongoose.mongo.Db,
): Promise<void> {
  const collection = db.collection('partners')
  const total = await getTableCount(conn, 'partners')
  log(`Migrating partners: 0/${total}...`)

  let offset = 0
  let migrated = 0

  while (offset < total) {
    const rows = await fetchBatch(conn, 'partners', offset)

    const docs = rows.map((row) => {
      const _id = toObjectId(row.id as number, idMaps.partners)
      const userId = idMaps.users.get(row.user_id as number) ?? new Types.ObjectId()
      const rawStatus = String(row.status ?? 'PENDING').toUpperCase()
      const statusMap: Record<string, string> = {
        PENDING: 'pending',
        APPROVED: 'approved',
        SUSPENDED: 'suspended',
        REJECTED: 'rejected',
      }

      return {
        _id,
        userId,
        status: (statusMap[rawStatus] ?? 'pending') as
          | 'pending'
          | 'approved'
          | 'suspended'
          | 'rejected',
        slogan: row.slogan ?? '',
        introduction: row.introduction ?? '',
        activityPlan: row.activity_plan ?? '',
        externalUrl: row.external_url ?? '',
        selectedTopics: row.selected_topics
          ? String(row.selected_topics).split(',').map((t: string) => t.trim())
          : [],
        profileImage: row.profile_image ?? '',
        postCount: row.post_count ?? 0,
        approvedAt: row.approved_at ? new Date(row.approved_at as string) : undefined,
        rejectedReason: row.rejected_reason ?? '',
        createdAt: row.created_at ? new Date(row.created_at as string) : new Date(),
        updatedAt: row.updated_at ? new Date(row.updated_at as string) : new Date(),
      }
    })

    if (!isDryRun && docs.length > 0) {
      try {
        await collection.insertMany(docs, { ordered: false })
      } catch (err) {
        logError('partners batch insert', err)
      }
    }

    migrated += rows.length
    offset += BATCH_SIZE
    log(`Migrating partners: ${migrated}/${total}...`)
  }

  log(`Partners migration complete: ${migrated} records`)
}

async function migratePartnerPosts(
  conn: mysql.Connection,
  db: mongoose.mongo.Db,
): Promise<void> {
  const collection = db.collection('partnerposts')
  const total = await getTableCount(conn, 'partner_posts')
  log(`Migrating partner_posts: 0/${total}...`)

  let offset = 0
  let migrated = 0

  while (offset < total) {
    const rows = await fetchBatch(conn, 'partner_posts', offset)

    const docs = rows.map((row) => {
      const partnerId = idMaps.partners.get(row.partner_id as number) ?? new Types.ObjectId()

      return {
        _id: new Types.ObjectId(),
        partnerId,
        title: row.title ?? '',
        content: row.content ?? '',
        images: [],
        tags: row.tags ? String(row.tags).split(',').map((t: string) => t.trim()) : [],
        views: row.views ?? 0,
        likes: [],
        status: (row.status === 'HIDDEN' ? 'hidden' : row.status === 'DELETED' ? 'deleted' : 'active') as
          | 'active'
          | 'hidden'
          | 'deleted',
        createdAt: row.created_at ? new Date(row.created_at as string) : new Date(),
        updatedAt: row.updated_at ? new Date(row.updated_at as string) : new Date(),
      }
    })

    if (!isDryRun && docs.length > 0) {
      try {
        await collection.insertMany(docs, { ordered: false })
      } catch (err) {
        logError('partner_posts batch insert', err)
      }
    }

    migrated += rows.length
    offset += BATCH_SIZE
    log(`Migrating partner_posts: ${migrated}/${total}...`)
  }

  log(`Partner posts migration complete: ${migrated} records`)
}

async function migrateAnnouncements(
  conn: mysql.Connection,
  db: mongoose.mongo.Db,
): Promise<void> {
  const collection = db.collection('announcements')
  const total = await getTableCount(conn, 'announcements')
  log(`Migrating announcements: 0/${total}...`)

  let offset = 0
  let migrated = 0

  while (offset < total) {
    const rows = await fetchBatch(conn, 'announcements', offset)

    const docs = rows.map((row) => {
      const _id = toObjectId(row.id as number, idMaps.announcements)
      const authorId = idMaps.users.get(row.user_id as number) ?? new Types.ObjectId()

      return {
        _id,
        title: row.title ?? '',
        content: row.content ?? '',
        author: authorId,
        isPinned: Boolean(row.is_pinned ?? false),
        views: row.views ?? 0,
        isPublished: Boolean(row.is_published ?? true),
        createdAt: row.created_at ? new Date(row.created_at as string) : new Date(),
        updatedAt: row.updated_at ? new Date(row.updated_at as string) : new Date(),
      }
    })

    if (!isDryRun && docs.length > 0) {
      try {
        await collection.insertMany(docs, { ordered: false })
      } catch (err) {
        logError('announcements batch insert', err)
      }
    }

    migrated += rows.length
    offset += BATCH_SIZE
    log(`Migrating announcements: ${migrated}/${total}...`)
  }

  log(`Announcements migration complete: ${migrated} records`)
}

async function migrateNotifications(
  conn: mysql.Connection,
  db: mongoose.mongo.Db,
): Promise<void> {
  const collection = db.collection('notifications')
  const total = await getTableCount(conn, 'notifications')
  log(`Migrating notifications: 0/${total}...`)

  let offset = 0
  let migrated = 0

  while (offset < total) {
    const rows = await fetchBatch(conn, 'notifications', offset)

    const docs = rows.map((row) => {
      const recipientId = idMaps.users.get(row.user_id as number) ?? new Types.ObjectId()

      return {
        _id: new Types.ObjectId(),
        recipient: recipientId,
        type: String(row.type ?? 'system').toLowerCase(),
        title: row.title ?? '',
        message: row.message ?? '',
        isRead: Boolean(row.is_read ?? false),
        link: row.link ?? undefined,
        createdAt: row.created_at ? new Date(row.created_at as string) : new Date(),
      }
    })

    if (!isDryRun && docs.length > 0) {
      try {
        await collection.insertMany(docs, { ordered: false })
      } catch (err) {
        logError('notifications batch insert', err)
      }
    }

    migrated += rows.length
    offset += BATCH_SIZE
    log(`Migrating notifications: ${migrated}/${total}...`)
  }

  log(`Notifications migration complete: ${migrated} records`)
}

async function migrateLevels(
  conn: mysql.Connection,
  db: mongoose.mongo.Db,
): Promise<void> {
  const collection = db.collection('levels')
  const total = await getTableCount(conn, 'levels')
  log(`Migrating levels: 0/${total}...`)

  let offset = 0
  let migrated = 0

  while (offset < total) {
    const rows = await fetchBatch(conn, 'levels', offset)

    const docs = rows.map((row) => ({
      _id: new Types.ObjectId(),
      level: row.level ?? 1,
      name: row.name ?? '',
      minScore: row.min_score ?? 0,
      maxScore: row.max_score ?? 0,
      badge: row.badge ?? undefined,
      createdAt: row.created_at ? new Date(row.created_at as string) : new Date(),
      updatedAt: row.updated_at ? new Date(row.updated_at as string) : new Date(),
    }))

    if (!isDryRun && docs.length > 0) {
      try {
        await collection.insertMany(docs, { ordered: false })
      } catch (err) {
        logError('levels batch insert', err)
      }
    }

    migrated += rows.length
    offset += BATCH_SIZE
    log(`Migrating levels: ${migrated}/${total}...`)
  }

  log(`Levels migration complete: ${migrated} records`)
}

async function migrateTerms(
  conn: mysql.Connection,
  db: mongoose.mongo.Db,
): Promise<void> {
  const collection = db.collection('terms')
  const total = await getTableCount(conn, 'terms')
  log(`Migrating terms: 0/${total}...`)

  let offset = 0
  let migrated = 0

  while (offset < total) {
    const rows = await fetchBatch(conn, 'terms', offset)

    const docs = rows.map((row) => ({
      _id: new Types.ObjectId(),
      type: String(row.type ?? 'service').toLowerCase(),
      title: row.title ?? '',
      content: row.content ?? '',
      version: row.version ?? '1.0',
      isRequired: Boolean(row.is_required ?? true),
      isActive: Boolean(row.is_active ?? true),
      effectiveDate: row.effective_date ? new Date(row.effective_date as string) : new Date(),
      createdAt: row.created_at ? new Date(row.created_at as string) : new Date(),
      updatedAt: row.updated_at ? new Date(row.updated_at as string) : new Date(),
    }))

    if (!isDryRun && docs.length > 0) {
      try {
        await collection.insertMany(docs, { ordered: false })
      } catch (err) {
        logError('terms batch insert', err)
      }
    }

    migrated += rows.length
    offset += BATCH_SIZE
    log(`Migrating terms: ${migrated}/${total}...`)
  }

  log(`Terms migration complete: ${migrated} records`)
}

async function tableExists(conn: mysql.Connection, table: string): Promise<boolean> {
  try {
    await conn.query(`SELECT 1 FROM \`${table}\` LIMIT 1`)
    return true
  } catch {
    return false
  }
}

async function main(): Promise<void> {
  log('=== GAMEUP MySQL → MongoDB Migration ===')
  if (isDryRun) {
    log('DRY RUN MODE — no data will be written to MongoDB')
  }

  log(`Connecting to MySQL at ${MYSQL_CONFIG.host}:${MYSQL_CONFIG.port}/${MYSQL_CONFIG.database}`)
  const mysqlConn = await mysql.createConnection(MYSQL_CONFIG)
  log('MySQL connected')

  log(`Connecting to MongoDB at ${MONGODB_URI}`)
  await mongoose.connect(MONGODB_URI)
  const db = mongoose.connection.db!
  log('MongoDB connected')

  const migrationOrder: Array<{
    table: string
    fn: (conn: mysql.Connection, db: mongoose.mongo.Db) => Promise<void>
  }> = [
    { table: 'users', fn: migrateUsers },
    { table: 'games', fn: migrateGames },
    { table: 'posts', fn: migratePosts },
    { table: 'comments', fn: migrateComments },
    { table: 'reviews', fn: migrateReviews },
    { table: 'scraps', fn: migrateScraps },
    { table: 'follows', fn: migrateFollows },
    { table: 'partners', fn: migratePartners },
    { table: 'partner_posts', fn: migratePartnerPosts },
    { table: 'announcements', fn: migrateAnnouncements },
    { table: 'notifications', fn: migrateNotifications },
    { table: 'levels', fn: migrateLevels },
    { table: 'terms', fn: migrateTerms },
  ]

  for (const { table, fn } of migrationOrder) {
    const exists = await tableExists(mysqlConn, table)
    if (!exists) {
      log(`Table "${table}" not found — skipping`)
      continue
    }
    try {
      await fn(mysqlConn, db)
    } catch (err) {
      logError(`Migration failed for table "${table}"`, err)
    }
  }

  await mysqlConn.end()
  await mongoose.disconnect()

  log('=== Migration complete ===')
}

main().catch((err) => {
  logError('Fatal error', err)
  process.exit(1)
})
