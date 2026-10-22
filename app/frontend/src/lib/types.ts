// Hand-written mirrors of the Pydantic models in backend/models/hospital.py.
// Nothing infers across the Python boundary — keep this pair in sync in the same edit.

export type Role = "admin" | "recepcao" | "enfermagem" | "medico";
export type CallStatus = "aguardando" | "chamado" | "finalizado" | "cancelado";
export type RoomStatus = "disponivel" | "em_atendimento" | "manutencao";
export type ServiceType = "Consulta" | "Retorno" | "Exame" | "Urgência";

export const SERVICE_TYPES: ServiceType[] = ["Consulta", "Retorno", "Exame", "Urgência"];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  recepcao: "Recepção",
  enfermagem: "Enfermagem",
  medico: "Médico",
};

export interface User {
  id: string;
  name: string;
  username: string;
  role: Role;
  specialty: string | null;
  active: boolean;
  created_at: string;
}

export interface Patient {
  id: string;
  name: string;
  birth_date: string;
  cpf: string;
  phone: string;
  card_number: string;
  service_type: ServiceType;
  notes: string;
  active_ticket: string | null;
  created_at: string;
}

export interface Room {
  id: string;
  number: number;
  label: string;
  status: RoomStatus;
  current_ticket: string | null;
  current_patient: string | null;
  professional_name: string | null;
}

export interface Call {
  id: string;
  ticket: string;
  prefix: string;
  seq: number;
  issue_date: string;
  service_type: string;
  patient_id: string;
  patient_name: string;
  room_id: string | null;
  room_label: string | null;
  professional_id: string | null;
  professional_name: string | null;
  status: CallStatus;
  created_at: string;
  called_at: string | null;
  finished_at: string | null;
  repeat_count: number;
}

export interface DashboardStats {
  waiting: number;
  in_service: number;
  finished_today: number;
  occupied_rooms: number;
  total_rooms: number;
  recent: Call[];
  queue: Call[];
}

export interface ReportsData {
  total_patients: number;
  total_attendances: number;
  attendances_7d: number;
  avg_wait_min: number;
  total_calls_7d: number;
  by_room: { label: string; count: number }[];
  by_day: { date: string; count: number }[];
  by_type: { label: string; count: number }[];
}

export interface AppSettings {
  show_patient_name_on_tv: boolean;
  voice_enabled: boolean;
  sound_enabled: boolean;
}
