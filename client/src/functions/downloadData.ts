import { ProcessedData } from "../App.types";

export const downloadData = (
  processedData: ProcessedData,
  type: "www" | "moonode"
) => {
  if (!processedData) return;

  const content =
    type === "www"
      ? processedData.websiteTime.join("\n")
      : processedData.csvData.join("\n");

  const blob = new Blob([content], {
    type: type === "www" ? "text/plain" : "text/csv",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = type === "www" ? "website.txt" : "moonode.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
