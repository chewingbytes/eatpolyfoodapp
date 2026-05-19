import React from "react";
import { Image, View } from "react-native";

interface SanityImageProps {
  url?: string;
  className?: string;
  style?: object;
}

export function SanityImage({ url, className, style }: SanityImageProps) {
  if (!url) {
    return <View className={`bg-gray-100 ${className ?? ""}`} style={style} />;
  }
  return (
    <Image
      source={{ uri: url }}
      className={className}
      style={style}
      resizeMode="cover"
    />
  );
}
