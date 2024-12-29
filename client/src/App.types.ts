export interface PrayerTimes {
  adhanFajr: string;
  shourouk: string;
  adhanDhuhr: string;
  adhanAsr: string;
  adhanMaghrib: string;
  adhanIsha: string;
  iqamaFajr?: string;
  iqamaDhuhr?: string;
  iqamaAsr?: string;
  iqamaMaghrib?: string;
  iqamaIsha?: string;
}

export interface ProcessedData {
  csvData: string[];
  websiteTime: string[];
}
