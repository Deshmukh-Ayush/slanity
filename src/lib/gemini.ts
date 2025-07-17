import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const { prompt } = await request.json();
}
