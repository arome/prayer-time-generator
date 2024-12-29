export const formatTimeWithAMPM = (time: string): string => {
  if (!time) return "";
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${String(displayHours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )} ${period}`;
};
