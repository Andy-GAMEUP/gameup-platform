import mongoose, { Schema, Document } from 'mongoose'

export interface ISiteSettings extends Document {
  key: string
  value: string
  updatedAt: Date
}

const siteSettingsSchema = new Schema<ISiteSettings>(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: String, default: '' },
  },
  { timestamps: true }
)

export default mongoose.model<ISiteSettings>('SiteSettings', siteSettingsSchema)
