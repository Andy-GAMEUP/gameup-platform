import mongoose, { Schema, Document } from 'mongoose'

export interface ITopic {
  name: string
  isActive: boolean
}

export interface ITopicGroup extends Document {
  name: string
  sortOrder: number
  topics: ITopic[]
  createdAt: Date
  updatedAt: Date
}

const topicGroupSchema = new Schema<ITopicGroup>(
  {
    name: { type: String, required: true, maxlength: 100 },
    sortOrder: { type: Number, default: 0 },
    topics: [{
      name: { type: String, required: true },
      isActive: { type: Boolean, default: true },
    }],
  },
  { timestamps: true }
)

topicGroupSchema.index({ sortOrder: 1 })

export default mongoose.model<ITopicGroup>('TopicGroup', topicGroupSchema)
