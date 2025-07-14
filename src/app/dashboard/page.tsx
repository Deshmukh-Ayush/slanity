"use client";

import React from "react";
import { useUser } from "@clerk/nextjs";

const Page = () => {
  const { isSignedIn, user, isLoaded } = useUser();

  if (!isLoaded) {
    return <div>loading</div>;
  }

  if (!isSignedIn) {
    return <div>Please sign in to continue</div>;
  }

  return (
    <div className="h-screen w-full --color-background text-(--color-primary)">
      <div>Hello {user.firstName}!</div>
    </div>
  );
};

export default Page;
