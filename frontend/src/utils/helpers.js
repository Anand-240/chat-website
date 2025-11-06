export const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export const isImageFile = (file) => {
  return file && file.type && file.type.startsWith("image/");
};
