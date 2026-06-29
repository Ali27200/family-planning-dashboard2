/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface HealthCenter {
  id: string;
  name: string;
  username: string;
  password: string;
}

export type AgeRange = "under_20" | "age_20_24" | "age_25_29" | "age_30_34" | "over_35";

export interface Section1Data {
  // نوع المستفيدة
  new_client: Record<AgeRange, number>;      // جديدة أول مرة
  secondary_client: Record<AgeRange, number>; // جديدة بعد انقطاع
  repeat_client: Record<AgeRange, number>;    // مترددة

  // الإجراءات والخدمات المقدمة
  get_method: Record<AgeRange, number>;       // الحصول على وسيلة
  change_method: Record<AgeRange, number>;    // تغيير الوسيلة
  followup: Record<AgeRange, number>;         // مضاعفات طبية (followup)
  maintenance: Record<AgeRange, number>;      // متابعة الوسيلة (health complications)
  remove_loop: Record<AgeRange, number>;      // رفع لولب
  consultation: Record<AgeRange, number>;     // المشورة

  // عدد الأطفال للمستفيدة (Parity)
  nullipara: Record<AgeRange, number>;        // لا يوجد طفل
  single_child: Record<AgeRange, number>;     // طفل واحد
  two_children: Record<AgeRange, number>;     // طفلين
  three_children: Record<AgeRange, number>;   // ثلاثة أطفال
  four_plus: Record<AgeRange, number>;        // أربعة فأكثر
}

export interface MethodCell {
  clients: number;
  quantity: number;
}

export interface Section2Data {
  pills_mini: Record<AgeRange, MethodCell>;       // حبob أحادية / mini pills
  pills_combined: Record<AgeRange, MethodCell>;   // حبوب مركبة / combined pills
  iud_loop: Record<AgeRange, MethodCell>;         // لولب / loop
  condom: Record<AgeRange, MethodCell>;           // واقي / condom
  injection_mini: Record<AgeRange, MethodCell>;   // حقن احادية / mini injections
  vaginal_cream: Record<AgeRange, MethodCell>;    // كريم مهبلي / progesterone vaginal cream
  others: Record<AgeRange, MethodCell>;           // اخرى / others
  consultation_only: Record<AgeRange, MethodCell>;// مشورة فقط / consulting only
}

export interface SubmissionRecord {
  centerId: string;
  month: number;
  year: number;
  dateCreated: string;
  section1: Section1Data;
  section2: Section2Data;
  advisorName?: string;     // منظم الاستمارة
  programManager?: string;  // مسؤول البرنامج
  directorName?: string;    // مدير المركز / طبيب الأسنان
  locked?: boolean;         // مقفول بعد الرفع - لا يمكن التعديل
  unlockRequested?: boolean;// طلب فتح من المركز للماستر
  unlockMessage?: string;   // سبب طلب التعديل من المركز
}

export const AGE_RANGES: AgeRange[] = ["under_20", "age_20_24", "age_25_29", "age_30_34", "over_35"];

export function createEmptyAgeRecord<T>(defaultValue: T): Record<AgeRange, T> {
  return {
    under_20: defaultValue,
    age_20_24: defaultValue,
    age_25_29: defaultValue,
    age_30_34: defaultValue,
    over_35: defaultValue,
  };
}

export function createEmptySection1(): Section1Data {
  return {
    new_client: createEmptyAgeRecord(0),
    secondary_client: createEmptyAgeRecord(0),
    repeat_client: createEmptyAgeRecord(0),
    get_method: createEmptyAgeRecord(0),
    change_method: createEmptyAgeRecord(0),
    followup: createEmptyAgeRecord(0),
    maintenance: createEmptyAgeRecord(0),
    remove_loop: createEmptyAgeRecord(0),
    consultation: createEmptyAgeRecord(0),
    nullipara: createEmptyAgeRecord(0),
    single_child: createEmptyAgeRecord(0),
    two_children: createEmptyAgeRecord(0),
    three_children: createEmptyAgeRecord(0),
    four_plus: createEmptyAgeRecord(0),
  };
}

export function createEmptySection2(): Section2Data {
  const defaultCell = (): MethodCell => ({ clients: 0, quantity: 0 });
  return {
    pills_mini: {
      under_20: defaultCell(),
      age_20_24: defaultCell(),
      age_25_29: defaultCell(),
      age_30_34: defaultCell(),
      over_35: defaultCell(),
    },
    pills_combined: {
      under_20: defaultCell(),
      age_20_24: defaultCell(),
      age_25_29: defaultCell(),
      age_30_34: defaultCell(),
      over_35: defaultCell(),
    },
    iud_loop: {
      under_20: defaultCell(),
      age_20_24: defaultCell(),
      age_25_29: defaultCell(),
      age_30_34: defaultCell(),
      over_35: defaultCell(),
    },
    condom: {
      under_20: defaultCell(),
      age_20_24: defaultCell(),
      age_25_29: defaultCell(),
      age_30_34: defaultCell(),
      over_35: defaultCell(),
    },
    injection_mini: {
      under_20: defaultCell(),
      age_20_24: defaultCell(),
      age_25_29: defaultCell(),
      age_30_34: defaultCell(),
      over_35: defaultCell(),
    },
    vaginal_cream: {
      under_20: defaultCell(),
      age_20_24: defaultCell(),
      age_25_29: defaultCell(),
      age_30_34: defaultCell(),
      over_35: defaultCell(),
    },
    others: {
      under_20: defaultCell(),
      age_20_24: defaultCell(),
      age_25_29: defaultCell(),
      age_30_34: defaultCell(),
      over_35: defaultCell(),
    },
    consultation_only: {
      under_20: defaultCell(),
      age_20_24: defaultCell(),
      age_25_29: defaultCell(),
      age_30_34: defaultCell(),
      over_35: defaultCell(),
    },
  };
}
