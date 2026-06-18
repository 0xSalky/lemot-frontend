"use client";

import { Box } from "@chakra-ui/react";

function AppWallpaper() {
  return (
    <Box
      aria-hidden
      position="fixed"
      inset="0"
      zIndex={0}
      pointerEvents="none"
      className="app-wallpaper"
    />
  );
}

export default AppWallpaper;
