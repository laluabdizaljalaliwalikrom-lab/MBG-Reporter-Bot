export interface ReportNutrition {
  Energi: number;
  Protein: number;
  Lemak: number;
  Karbohidrat: number;
  Serat: number;
}

export interface Report {
  id: string;
  date: string;
  sppgName: string;
  location: string;
  totalBeneficiaries: number;
  largePortions: number;
  smallPortions: number;
  status: "Draft" | "Approved" | "Sent";
  menu: string;
  picName: string;
  picPhone: string;
  distributionTime: string;
  temperatureServed: string;
  notes?: string;
  photoUrl?: string;
  posterUrl?: string;
  balita?: number;
  bumil?: number;
  busui?: number;
  giziBesar?: ReportNutrition;
  giziKecil?: ReportNutrition;
}

