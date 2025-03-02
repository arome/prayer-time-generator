import { useState } from "react";
import { read, utils, WorkSheet } from "xlsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UploadCloud, Globe } from "lucide-react";
import { ProcessedData } from "./App.types";
import { MONTHS, MONTHS_SHORT } from "./App.consts";
import { downloadData } from "./functions/downloadData";
import { formatTimeWithAMPM } from "./functions/formatTimeWithAMPM";

export const App = () => {
  const [file, setFile] = useState<File>();
  const [year, setYear] = useState(new Date().getFullYear() + 1);
  const [iqamaRow, setIqamaRow] = useState(38);
  const [processedData, setProcessedData] = useState<ProcessedData>();
  const [error, setError] = useState("");

  const adjustTime = (time: string, cond = false): string | undefined => {
    if (!time) return;
    const timeSplit = time.split(":").map(Number);
    let hours = timeSplit[0];
    const minutes = timeSplit[1];
    if (cond && hours >= 9) return time;
    if (hours < 12) hours += 12;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}`;
  };

  const adjustIqamaTime = (
    time?: string,
    athanTime?: string,
    convert = true,
    cond = false
  ): string | undefined => {
    if (!time || !athanTime) return;
    if (typeof time === "string" && time.includes("+")) {
      const iqamaTimeIncrement = time.match(/\d+/)?.[0];
      if (!iqamaTimeIncrement) return time;
      const minutes = parseInt(iqamaTimeIncrement);
      const [athanHours, athanMinutes] = athanTime.split(":").map(Number);
      const totalMinutes = athanHours * 60 + athanMinutes + minutes;
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      return `${String(hours).padStart(2, "0")}:${String(mins).padStart(
        2,
        "0"
      )}`;
    }
    return convert ? adjustTime(time, cond) : time;
  };

  const getCellValue = (sheet: WorkSheet, row: number, col: number): string => {
    const cellAddress = utils.encode_cell({ r: row, c: col });
    const cell = sheet[cellAddress];
    return cell ? cell.w : "";
  };

  const processFile = async () => {
    try {
      if (!file) {
        setError("Please select a file first");
        return;
      }

      const data = await file.arrayBuffer();
      const workbook = read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const range = utils.decode_range(sheet["!ref"] || "A1");

      // Find months row
      let monthsRow = -1;
      const monthsColumns: number[] = [];

      // Scan for months row
      for (let row = range.s.r; row <= range.e.r; row++) {
        for (let col = range.s.c; col <= range.e.c; col++) {
          const value = getCellValue(sheet, row, col);
          if (value === "January") {
            monthsRow = row;
            break;
          }
        }
        if (monthsRow !== -1) break;
      }

      if (monthsRow === -1) {
        setError("Could not find months row in the Excel file");
        return;
      }

      // Find month columns
      for (let col = range.s.c; col <= range.e.c; col++) {
        const value = getCellValue(sheet, monthsRow, col);
        if (MONTHS.includes(value)) {
          monthsColumns.push(col);
        }
      }

      const websiteTime: string[] = [];
      const csvData: string[] = [
        "date,adhanFajr,iqamaFajr,shourouk,adhanDhuhr,iqamaDhuhr,adhanAsr,iqamaAsr,adhanMaghrib,iqamaMaghrib,adhanIsha,iqamaIsha",
      ];
      // Process each month
      monthsColumns.forEach((monthCol, monthIndex) => {
        let row = monthsRow + 1;
        const prayerTimes: Record<string, Record<string, string>> = {};

        // Process Athan times
        while (row <= range.e.r) {
          const dayValue = getCellValue(sheet, row, monthCol);
          if (!dayValue) break;

          const day = dayValue.replace("*", "").trim();
          const dateString = `${String(monthIndex + 1).padStart(
            2,
            "0"
          )}/${String(day).padStart(2, "0")}`;

          prayerTimes[dateString] = {
            adhanFajr: getCellValue(sheet, row, monthCol + 1),
            shourouk: getCellValue(sheet, row, monthCol + 2),
            adhanDhuhr: adjustTime(
              getCellValue(sheet, row, monthCol + 3),
              true
            ) as string,
            adhanAsr: adjustTime(
              getCellValue(sheet, row, monthCol + 4)
            ) as string,
            adhanMaghrib: adjustTime(
              getCellValue(sheet, row, monthCol + 5)
            ) as string,
            adhanIsha: adjustTime(
              getCellValue(sheet, row, monthCol + 6)
            ) as string,
          };

          row++;
        }

        // Process Iqama times
        row = iqamaRow;
        while (row <= range.e.r) {
          const dateRange = getCellValue(sheet, row, monthCol + 1);
          if (!dateRange) break;

          let fromDate: number, toDate: number;
          if (dateRange.includes("To")) {
            [fromDate, toDate] = dateRange.split(" To ").map(Number);
          } else {
            fromDate = toDate = Number(dateRange);
          }

          for (let d = fromDate; d <= toDate; d++) {
            const dateString = `${String(monthIndex + 1).padStart(
              2,
              "0"
            )}/${String(d).padStart(2, "0")}`;
            const prayers = prayerTimes[dateString];

            if (prayers) {
              const iqamaFajr = adjustIqamaTime(
                getCellValue(sheet, row, monthCol + 2),
                prayers.adhanFajr,
                false
              );
              const iqamaDhuhr = adjustIqamaTime(
                getCellValue(sheet, row, monthCol + 3),
                prayers.adhanDhuhr,
                true,
                true
              );
              const iqamaAsr = adjustIqamaTime(
                getCellValue(sheet, row, monthCol + 4),
                prayers.adhanAsr
              );
              const iqamaMaghrib = adjustIqamaTime(
                getCellValue(sheet, row, monthCol + 5),
                prayers.adhanMaghrib
              );
              const iqamaIsha = adjustIqamaTime(
                getCellValue(sheet, row, monthCol + 6),
                prayers.adhanIsha
              );

              // Website format
              websiteTime.push(
                `${MONTHS_SHORT[monthIndex]} ${d}--${prayers.adhanFajr}--${prayers.adhanDhuhr}--${prayers.adhanAsr}--${prayers.adhanMaghrib}--${prayers.adhanIsha}--${iqamaFajr}--${iqamaDhuhr}--${iqamaAsr}--${iqamaMaghrib}--${iqamaIsha}`
              );

              // CSV format
              csvData.push(
                `${dateString}/${year},${formatTimeWithAMPM(
                  prayers.adhanFajr
                )},${formatTimeWithAMPM(iqamaFajr ?? "")},${formatTimeWithAMPM(
                  prayers.shourouk
                )},${formatTimeWithAMPM(
                  prayers.adhanDhuhr
                )},${formatTimeWithAMPM(iqamaDhuhr ?? "")},${formatTimeWithAMPM(
                  prayers.adhanAsr
                )},${formatTimeWithAMPM(iqamaAsr ?? "")},${formatTimeWithAMPM(
                  prayers.adhanMaghrib
                )},${formatTimeWithAMPM(
                  iqamaMaghrib ?? ""
                )},${formatTimeWithAMPM(
                  prayers.adhanIsha
                )},${formatTimeWithAMPM(iqamaIsha ?? "")}`
              );
            }
          }
          row++;
        }
      });

      setProcessedData({ csvData, websiteTime });
      setError("");
    } catch (err) {
      setError(
        "Error processing file: " +
          (err instanceof Error ? err.message : String(err))
      );
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mt-16">
      <CardHeader>
        <CardTitle>Prayer Times Processor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file">Excel File</Label>
          <Input
            id="file"
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0])}
            className="cursor-pointer"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="year">Year</Label>
            <Input
              id="year"
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="iqamaRow">Iqama Row Number</Label>
            <Input
              id="iqamaRow"
              type="number"
              value={iqamaRow}
              onChange={(e) => setIqamaRow(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="flex gap-4">
          <Button
            onClick={processFile}
            className="flex w-full items-center gap-2"
          >
            <UploadCloud className="w-4 h-4" />
            Process File
          </Button>
        </div>

        {processedData && (
          <div className="flex gap-4">
            <Button
              onClick={() => downloadData(processedData, "www")}
              className="flex w-full items-center gap-2"
              variant="outline"
            >
              <Globe className="w-4 h-4" />
              Download Website File
            </Button>

            <Button
              onClick={() => downloadData(processedData, "moonode")}
              className="flex w-full items-center gap-2"
              variant="outline"
            >
              <div className="relative w-4 h-4">
                <img
                  src="/moonode_logo.png"
                  alt="Moonode"
                  className="w-full h-full object-contain"
                />
              </div>
              Download Moonode File
            </Button>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {processedData && (
          <Alert>
            <AlertDescription>
              File processed successfully! Click the Download button to get the
              results.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
