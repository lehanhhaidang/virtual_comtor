import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export type MeetingStatus = 'scheduled' | 'in_progress' | 'completed';
export type MeetingMode = 'standard' | 'private';

export interface ISpeakerInfo {
  label: string;
  language: string; // ISO 639-1 code — open to any Soniox language
}

export interface IMeeting extends Document {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  status: MeetingStatus;
  mode: MeetingMode;
  languagePair: string;
  duration?: number;
  entryCount?: number;
  startedAt?: Date;
  endedAt?: Date;
  audioPath?: string;
  audioLocalPath?: string;
  encryptedSummary?: string;
  speakerMapping: Map<string, ISpeakerInfo>;
  createdAt: Date;
  updatedAt: Date;
}

const SpeakerInfoSchema = new Schema<ISpeakerInfo>(
  {
    label: { type: String, required: true },
    language: { type: String, required: true },
  },
  { _id: false }
);

const MeetingSchema = new Schema<IMeeting>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Meeting title is required'],
      trim: true,
      maxlength: [255, 'Title cannot exceed 255 characters'],
    },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed'],
      default: 'scheduled',
    },
    mode: {
      type: String,
      enum: ['standard', 'private'],
      default: 'standard',
    },
    languagePair: {
      type: String,
      default: 'ja-vi',
    },
    duration: { type: Number },
    entryCount: { type: Number },
    startedAt: { type: Date },
    endedAt: { type: Date },
    audioPath: { type: String },
    audioLocalPath: { type: String },
    encryptedSummary: { type: String },
    speakerMapping: {
      type: Map,
      of: SpeakerInfoSchema,
      default: new Map(),
    },
  },
  {
    timestamps: true,
  }
);

/** Compound indexes */
MeetingSchema.index({ projectId: 1, createdAt: -1 });
MeetingSchema.index({ userId: 1, status: 1 });

const Meeting: Model<IMeeting> =
  mongoose.models.Meeting || mongoose.model<IMeeting>('Meeting', MeetingSchema);

export default Meeting;
