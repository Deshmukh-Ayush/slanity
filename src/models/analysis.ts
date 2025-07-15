import mongoose, { Schema, Document } from "mongoose";

export enum AnalysisStatus {
  Pending = "pending",
  Processing = "processing",
  Completed = "completed",
  Failed = "failed",
}

export interface Analysis extends Document {
  userId: string;
  repoUrl: string;
  analysisResult: Record<string, any>;
  status: AnalysisStatus;
  createdAt: Date;
  updatedAt: Date;
}

const AnalysisSchema: Schema<Analysis> = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: [true, "User ID is required"],
      index: true,
      trim: true,
    },
    repoUrl: {
      type: String,
      required: [true, "Github Repo URL is required"],
      trim: true,
      validate: {
        validator: function (url: string) {
          const githubUrlRegex =
            /^https:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+\/?$/;
          return githubUrlRegex.test(url);
        },
        message: "Please provide a valid GitHub repository URL",
      },
    },
    analysisResult: {
      type: Schema.Types.Mixed,
      default: {},
      validate: {
        validator: function (value: any) {
          return typeof value === "object" && value !== null;
        },
        message: "Analysis result must be a valid object",
      },
    },
    status: {
      type: String,
      enum: {
        values: Object.values(AnalysisStatus),
        message: "Status must be one of: {VALUES}",
      },
      default: AnalysisStatus.Pending,
      required: [true, "Status is required"],
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    minimize: false,
    toJSON: {
      transform: function (doc, ret) {
        delete ret._id;
        return ret;
      },
    },
    toObject: {
      transform: function (doc, ret) {
        delete ret._id;
        return ret;
      },
    },
  }
);

AnalysisSchema.index({ userId: 1, status: 1 });

AnalysisSchema.methods.markAsProcessing = function () {
  this.status = AnalysisStatus.Processing;
  return this.save();
};

AnalysisSchema.methods.markAsCompleted = function (
  result: Record<string, any>
) {
  this.status = AnalysisStatus.Completed;
  this.analysisResult = result;
  return this.save();
};

AnalysisSchema.methods.markAsFailed = function () {
  this.status = AnalysisStatus.Failed;
  return this.save();
};

AnalysisSchema.statics.findByUserId = function (userId: string) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

AnalysisSchema.statics.findPendingAnalyses = function () {
  return this.find({ status: AnalysisStatus.Pending }).sort({ createdAt: 1 });
};

AnalysisSchema.pre("save", function (next) {
  if (this.repoUrl) {
    this.repoUrl = this.repoUrl.replace(/\/$/, "");
  }
  next();
});

AnalysisSchema.index({ userId: 1, repoUrl: 1 }, { unique: true });

const AnalysisModel =
  (mongoose.models.Analysis as mongoose.Model<Analysis>) ||
  mongoose.model<Analysis>("Analysis", AnalysisSchema);

export default AnalysisModel;
