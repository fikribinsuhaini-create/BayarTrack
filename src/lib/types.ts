export type Id = string;

export type CommitmentCategory =
  | "Rumah"
  | "Bil"
  | "Loan"
  | "Subscription"
  | "Simpanan"
  | "Lain-lain";

export type PaymentStatus = "unpaid" | "paid";

export type CommitmentTemplate = {
  id: Id;
  name: string;
  amountCents: number;
  category: CommitmentCategory;
  dueDay: number; // 1..31
  active: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

export type MonthlyCommitment = {
  templateId: Id;
  name: string;
  amountCents: number;
  category: CommitmentCategory;
  dueDay: number;
  status: PaymentStatus;
  paidAt?: string; // ISO
};

export type MonthRecord = {
  monthKey: string; // YYYY-MM
  createdAt: string; // ISO
  updatedAt: string; // ISO
  commitments: MonthlyCommitment[];
};

export type TodoPriority = "Low" | "Medium" | "High";

export type TodoList = {
  id: Id;
  name: string;
  archived: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

export type TodoItem = {
  id: Id;
  listId: Id;
  title: string;
  done: boolean;
  priority: TodoPriority;
  dueDate?: string; // YYYY-MM-DD
  createdAt: string; // ISO
  updatedAt: string; // ISO
  doneAt?: string; // ISO
};

export type AppSettings = {
  notificationsEnabled: boolean;
  notifyCommitmentsDaysBefore: number; // e.g. 3
  notifyTodosDaysBefore: number; // e.g. 1
  quietHoursStart: number; // 0..23
  quietHoursEnd: number; // 0..23
};

export const DEFAULT_SETTINGS: AppSettings = {
  notificationsEnabled: false,
  notifyCommitmentsDaysBefore: 3,
  notifyTodosDaysBefore: 1,
  quietHoursStart: 8,
  quietHoursEnd: 22,
};

export type Habit = {
  id: Id;
  name: string;
  color: "red" | "blue" | "cyan" | "green" | "purple" | "amber" | "zinc";
  goalPerWeek: number; // 1..7
  programWeeks: number | null; // null = forever, else 1..52
  startWeekStart: string; // ISO date (YYYY-MM-DD), monday of week
  archived: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};
