export const user = {
  name: "Aarav Sharma",
  role: "Patient",
  email: "aarav@careos.ai",
  avatar: "https://i.pravatar.cc/150?img=13",
  age: 32,
  bloodGroup: "O+",
  allergies: ["Peanuts", "Penicillin"],
};

export const vitals = {
  healthScore: 87,
  heartRate: 72,
  bloodPressure: "118/76",
  bloodSugar: 96,
  oxygen: 98,
  temperature: 98.4,
  bmi: 22.6,
  sleep: 7.4,
  water: 2.1,
  steps: 8742,
  calories: 1840,
};

export const heartRateData = Array.from({ length: 24 }, (_, i) => ({
  time: `${i}:00`,
  bpm: 60 + Math.round(Math.sin(i / 3) * 8 + Math.random() * 12),
}));

export const sleepData = [
  { day: "Mon", hours: 7.2, deep: 2.1 },
  { day: "Tue", hours: 6.8, deep: 1.8 },
  { day: "Wed", hours: 8.1, deep: 2.5 },
  { day: "Thu", hours: 7.5, deep: 2.2 },
  { day: "Fri", hours: 6.4, deep: 1.6 },
  { day: "Sat", hours: 8.6, deep: 2.8 },
  { day: "Sun", hours: 7.9, deep: 2.4 },
];

export const stepsData = [
  { day: "Mon", steps: 6420 },
  { day: "Tue", steps: 8210 },
  { day: "Wed", steps: 9540 },
  { day: "Thu", steps: 7120 },
  { day: "Fri", steps: 10230 },
  { day: "Sat", steps: 11850 },
  { day: "Sun", steps: 8742 },
];

export const bpData = Array.from({ length: 14 }, (_, i) => ({
  day: `D${i + 1}`,
  systolic: 115 + Math.round(Math.random() * 10),
  diastolic: 72 + Math.round(Math.random() * 8),
}));

export const sugarData = Array.from({ length: 14 }, (_, i) => ({
  day: `D${i + 1}`,
  fasting: 88 + Math.round(Math.random() * 15),
  post: 120 + Math.round(Math.random() * 25),
}));

export const family = [
  { id: 1, name: "Rajesh Sharma", relation: "Father", age: 62, avatar: "https://i.pravatar.cc/150?img=12", score: 74, risk: "Moderate", heartRate: 78, meds: "On track", emergency: false },
  { id: 2, name: "Priya Sharma", relation: "Mother", age: 58, avatar: "https://i.pravatar.cc/150?img=45", score: 82, risk: "Low", heartRate: 74, meds: "On track", emergency: false },
  { id: 3, name: "Dadi Kamla", relation: "Grandmother", age: 81, avatar: "https://i.pravatar.cc/150?img=47", score: 61, risk: "High", heartRate: 88, meds: "1 missed", emergency: true },
  { id: 4, name: "Ishaan Sharma", relation: "Son", age: 9, avatar: "https://i.pravatar.cc/150?img=59", score: 94, risk: "Low", heartRate: 92, meds: "N/A", emergency: false },
  { id: 5, name: "Ananya Sharma", relation: "Daughter", age: 14, avatar: "https://i.pravatar.cc/150?img=44", score: 91, risk: "Low", heartRate: 84, meds: "On track", emergency: false },
];

export const medicines = [
  { id: 1, name: "Metformin 500mg", schedule: "8:00 AM, 8:00 PM", stock: 24, refillIn: 12, status: "active", taken: true },
  { id: 2, name: "Atorvastatin 10mg", schedule: "9:00 PM", stock: 8, refillIn: 4, status: "low", taken: false },
  { id: 3, name: "Vitamin D3", schedule: "9:00 AM", stock: 40, refillIn: 30, status: "active", taken: true },
  { id: 4, name: "Amlodipine 5mg", schedule: "10:00 AM", stock: 3, refillIn: 2, status: "critical", taken: false },
  { id: 5, name: "Aspirin 75mg", schedule: "After lunch", stock: 60, refillIn: 45, status: "active", taken: true },
];

export const appointments = [
  { id: 1, doctor: "Dr. Meera Kapoor", specialty: "Cardiology", date: "Today", time: "3:30 PM", mode: "In-clinic", avatar: "https://i.pravatar.cc/150?img=48" },
  { id: 2, doctor: "Dr. Arjun Rao", specialty: "Endocrinology", date: "Tomorrow", time: "11:00 AM", mode: "Video", avatar: "https://i.pravatar.cc/150?img=52" },
  { id: 3, doctor: "Dr. Sameer Iyer", specialty: "General Physician", date: "Fri, 21 Nov", time: "5:00 PM", mode: "In-clinic", avatar: "https://i.pravatar.cc/150?img=15" },
  { id: 4, doctor: "Dr. Nisha Verma", specialty: "Dermatology", date: "Mon, 24 Nov", time: "2:00 PM", mode: "Video", avatar: "https://i.pravatar.cc/150?img=32" },
];

export const reports = [
  { id: 1, name: "Complete Blood Count", date: "12 Nov 2025", lab: "Apollo Diagnostics", status: "Normal", flags: 0 },
  { id: 2, name: "Lipid Profile", date: "12 Nov 2025", lab: "Apollo Diagnostics", status: "Attention", flags: 2 },
  { id: 3, name: "HbA1c", date: "05 Nov 2025", lab: "Thyrocare", status: "Normal", flags: 0 },
  { id: 4, name: "Chest X-Ray", date: "22 Oct 2025", lab: "Fortis Imaging", status: "Normal", flags: 0 },
  { id: 5, name: "Thyroid Panel", date: "10 Oct 2025", lab: "Metropolis", status: "Attention", flags: 1 },
];

export const aiRecommendations = [
  { title: "Increase daily water intake", detail: "You're 400ml below your daily goal. Aim for 2.5L today.", tone: "info" },
  { title: "Consider a cardio session", detail: "Your resting HR is trending up. 30 min of light cardio recommended.", tone: "warning" },
  { title: "Sleep quality improving", detail: "Deep sleep up 12% this week. Keep the current routine.", tone: "success" },
];

export const emergencyContacts = [
  { name: "Priya Sharma (Mom)", phone: "+91 98111 22334", relation: "Family" },
  { name: "Dr. Meera Kapoor", phone: "+91 98220 11223", relation: "Cardiologist" },
  { name: "Apollo Hospital", phone: "1066", relation: "Hospital" },
  { name: "Ambulance", phone: "108", relation: "Emergency" },
];

export const nearbyHospitals = [
  { name: "Apollo Hospital", distance: "1.2 km", eta: "6 min", rating: 4.7 },
  { name: "Fortis Health", distance: "2.8 km", eta: "11 min", rating: 4.5 },
  { name: "Max Super Specialty", distance: "3.5 km", eta: "14 min", rating: 4.6 },
];

export const moodData = [
  { day: "Mon", mood: 3 },
  { day: "Tue", mood: 4 },
  { day: "Wed", mood: 2 },
  { day: "Thu", mood: 4 },
  { day: "Fri", mood: 5 },
  { day: "Sat", mood: 5 },
  { day: "Sun", mood: 4 },
];

export const risks = [
  { name: "Heart Disease", value: 18, color: "hsl(var(--chart-1))" },
  { name: "Diabetes", value: 24, color: "hsl(var(--chart-2))" },
  { name: "Stroke", value: 9, color: "hsl(var(--chart-3))" },
  { name: "Kidney Disease", value: 12, color: "hsl(var(--chart-4))" },
  { name: "Mental Stress", value: 32, color: "hsl(var(--chart-5))" },
];

export const initialChat = [
  { role: "assistant" as const, content: "Hi Aarav 👋 I'm your CareOS AI Health Assistant. I can help with symptoms, medicine info, reports and wellness. How are you feeling today?" },
];
