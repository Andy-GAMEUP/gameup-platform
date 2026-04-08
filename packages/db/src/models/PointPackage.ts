import mongoose, { Schema, Document } from 'mongoose'

export interface IPointPackage extends Document {
  name: string
  points: number
  price: number
  unitPrice: number
  description: string
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

const pointPackageSchema = new Schema<IPointPackage>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    points: {
      type: Number,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    unitPrice: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
)

pointPackageSchema.index({ isActive: 1, sortOrder: 1 })

export default mongoose.model<IPointPackage>('PointPackage', pointPackageSchema)
