import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export interface ITranscriptEntry extends Document {
  _id: Types.ObjectId;
  meetingId: Types.ObjectId;
  speakerId: string;
  speakerLabel: string;
  language: string;
  originalText: string;
  translatedText: string;
  startMs: number;
  endMs: number;
  confidence: number;
  isReply: boolean;
  createdAt: Date;
}

const TranscriptEntrySchema = new Schema<ITranscriptEntry>(
  {
    meetingId: {
      type: Schema.Types.ObjectId,
      ref: 'Meeting',
      required: true,
      index: true,
    },
    speakerId: {
      type: String,
      required: true,
    },
    speakerLabel: {
      type: String,
      required: true,
    },
    language: {
      type: String,
      enum: ['ja', 'vi'],
      required: true,
    },
    originalText: {
      type: String,
      required: true,
    },
    translatedText: {
      type: String,
      default: '',
    },
    startMs: {
      type: Number,
      required: true,
    },
    endMs: {
      type: Number,
      required: true,
    },
    confidence: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },
    isReply: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

/** Index for efficient transcript retrieval */
TranscriptEntrySchema.index({ meetingId: 1, startMs: 1 });

const TranscriptEntry: Model<ITranscriptEntry> =
  mongoose.models.TranscriptEntry ||
  mongoose.model<ITranscriptEntry>('TranscriptEntry', TranscriptEntrySchema);

export default TranscriptEntry;
