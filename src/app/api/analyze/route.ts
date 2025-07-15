import dbConnect from "@/lib/db";
import AnalysisModel, { AnalysisStatus } from "@/models/analysis";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

interface AnalysisResponse {
  message?: string;
  error?: string;
  errors?: string[];
  data?: any;
}

function createResponse(data: AnalysisResponse, status: number): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function validateGitHubUrl(url: string): boolean {
  const githubUrlRegex = /^https:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+\/?$/;
  return githubUrlRegex.test(url);
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const { userId } = await auth();
    if (!userId) {
      return createResponse({ message: "Unauthorized" }, 401);
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return createResponse({ message: "Invalid JSON in request body" }, 400);
    }

    const { repoUrl } = body;

    if (!repoUrl) {
      return createResponse(
        { message: "GitHub repository URL is required" },
        400
      );
    }

    if (typeof repoUrl !== "string") {
      return createResponse(
        { message: "Repository URL must be a string" },
        400
      );
    }

    const trimmedUrl = repoUrl.trim();
    if (!validateGitHubUrl(trimmedUrl)) {
      return createResponse(
        { message: "Please provide a valid GitHub repository URL" },
        400
      );
    }

    const existingAnalysis = await AnalysisModel.findOne({
      userId,
      repoUrl: trimmedUrl.replace(/\/$/, ""),
    });

    if (existingAnalysis) {
      return createResponse(
        {
          message: "Analysis for this repository already exists",
          data: existingAnalysis,
        },
        409
      );
    }

    const newAnalysis = await AnalysisModel.create({
      userId,
      repoUrl: trimmedUrl,
      status: AnalysisStatus.Pending,
      analysisResult: {},
    });

    return createResponse(
      {
        message: "Analysis created successfully",
        data: newAnalysis,
      },
      201
    );
  } catch (error: any) {
    console.error("Error creating analysis record:", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(
        (err: any) => err.message
      );
      return createResponse(
        {
          message: "Validation failed",
          errors: messages,
        },
        400
      );
    }

    if (error.code === 11000) {
      return createResponse(
        {
          message: "Analysis for this repository already exists",
        },
        409
      );
    }

    if (
      error.name === "MongoNetworkError" ||
      error.name === "MongoTimeoutError"
    ) {
      return createResponse(
        {
          message: "Database connection error. Please try again.",
        },
        503
      );
    }

    if (error.name === "CastError") {
      return createResponse(
        {
          message: "Invalid data format",
        },
        400
      );
    }

    return createResponse(
      {
        message: "Internal server error",
        ...(process.env.NODE_ENV === "development" && { error: error.message }),
      },
      500
    );
  }
}
