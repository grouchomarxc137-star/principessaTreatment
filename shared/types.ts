// Shapes shared by the API and the app. The enum unions mirror prisma/schema.prisma.

export type Role = "PRINCIPESSA" | "PRINCIPE";
export type Mode = "DISTANCE" | "TOGETHER";
export type CardMode = "ANY" | Mode;
export type Feeling =
  | "OVERWHELMED"
  | "LOW_ENERGY"
  | "NEEDY"
  | "UPSET"
  | "MISSING_HIM"
  | "OKAY"
  | "GOOD";
export type RequestKind = "CARD" | "CANT_ASK" | "HANDLE_ME" | "SOS" | "OFFER" | "MYSTERY";
export type RequestStatus = "OPEN" | "DONE" | "CANCELLED";
export type ResponseKind = "ON_IT" | "LITTLE_BIT" | "CANT_NOW";
export type Helped = "A_LOT" | "A_LITTLE" | "NOT_REALLY";
export type DiscoveryStatus = "SUGGESTED" | "CONFIRMED" | "DISMISSED";
export type PreferenceKind = "DO" | "DONT";

export const FEELINGS: Feeling[] = [
  "OVERWHELMED",
  "LOW_ENERGY",
  "NEEDY",
  "UPSET",
  "MISSING_HIM",
  "OKAY",
  "GOOD",
];
export const MODES: Mode[] = ["DISTANCE", "TOGETHER"];
export const CARD_MODES: CardMode[] = ["ANY", "DISTANCE", "TOGETHER"];
export const RESPONSE_KINDS: ResponseKind[] = ["ON_IT", "LITTLE_BIT", "CANT_NOW"];
export const HELPED: Helped[] = ["A_LOT", "A_LITTLE", "NOT_REALLY"];

export interface Me {
  id: string;
  role: Role;
  name: string;
}

export interface CardRef {
  id: string;
  title: string;
  forHim: string;
}

export interface CardView extends CardRef {
  mode: CardMode;
  isCustom: boolean;
  hidden: boolean;
}

export interface ResponseView {
  kind: ResponseKind;
  chosenCard: CardRef | null;
  at: string;
}

export interface RequestView {
  id: string;
  kind: RequestKind;
  status: RequestStatus;
  card: CardRef | null;
  offerText: string | null;
  // MYSTERY only: the secret mission he finished, now revealed to her.
  missionText: string | null;
  feeling: Feeling | null;
  mode: Mode;
  createdAt: string;
  closedAt: string | null;
  // His latest answer, if any.
  response: ResponseView | null;
  // Her answer to "did it help?", visible to both of them.
  aftercare: { helped: Helped; note: string | null } | null;
}

export interface PreferenceView {
  id: string;
  kind: PreferenceKind;
  text: string;
  isCustom: boolean;
  active: boolean;
  activeSince: string | null;
}

export interface OfferView {
  id: string;
  text: string;
  createdAt: string;
  expiresAt: string;
}

export interface DiscoveryView {
  id: string;
  status: DiscoveryStatus;
  feeling: Feeling | null;
  card: CardRef | null;
  handleMe: boolean;
  sampleSize: number;
}

export interface WishView {
  id: string;
  text: string;
  mode: CardMode;
}

export interface MissionView {
  id: string;
  text: string;
  createdAt: string;
}

// Everything the app needs to draw itself, tailored to who is asking.
export interface AppState {
  me: Me;
  partnerName: string;
  feeling: Feeling | null;
  feelingSince: string | null;
  mode: Mode;
  modeSince: string;
  // Open requests, newest first.
  active: RequestView[];
  // Principessa: finished requests waiting for "did it help?". Empty for him.
  aftercarePending: RequestView[];
  // Principessa gets every item with its on/off state; he only gets the active ones.
  preferences: PreferenceView[];
  offers: OfferView[];
  // Principessa: suggested and confirmed. Him: confirmed only.
  discoveries: DiscoveryView[];
  // Visible deck cards (both roles; he uses them to decide when she hands it over).
  cards: CardView[];
  // Principe only.
  mission: MissionView | null;
  // Principe only: how many of her wishes fit the current mode. He never sees the list.
  wishesToDraw: number;
  pushConfigured: boolean;
}
