import type { CardMode, Mode, PreferenceKind } from "../../shared/types.ts";

// Starting content. Cards and Do/Don't items are copied into the database the
// first time the server starts, after which she can edit them. Missions stay
// here and are drawn at random.

interface DefaultCard {
  title: string;
  // Completes "…she'd really like ___." when the app asks on her behalf.
  forHim: string;
  mode: CardMode;
  sortOrder: number;
}

export const DEFAULT_CARDS: DefaultCard[] = [
  { title: "Reassure me", forHim: "some reassurance", mode: "ANY", sortOrder: 10 },
  { title: "Send me your face", forHim: "to see your face", mode: "DISTANCE", sortOrder: 20 },
  { title: "Cuddle me", forHim: "a cuddle", mode: "TOGETHER", sortOrder: 20 },
  { title: "Send me a voice note", forHim: "a voice note from you", mode: "DISTANCE", sortOrder: 30 },
  { title: "Hold me", forHim: "to be held", mode: "TOGETHER", sortOrder: 30 },
  { title: "Baby me", forHim: "to be babied a little", mode: "ANY", sortOrder: 40 },
  { title: "Call me", forHim: "a call", mode: "DISTANCE", sortOrder: 50 },
  { title: "Come lie down with me", forHim: "you to come lie down with her", mode: "TOGETHER", sortOrder: 50 },
  { title: "Distract me", forHim: "a distraction", mode: "ANY", sortOrder: 60 },
  { title: "Tell me something you love about me", forHim: "to hear something you love about her", mode: "ANY", sortOrder: 70 },
  { title: "Give me attention", forHim: "some of your attention", mode: "ANY", sortOrder: 80 },
  { title: "Stay with me for a bit", forHim: "you to stay with her for a bit", mode: "ANY", sortOrder: 85 },
  { title: "Sit with me", forHim: "you to sit with her", mode: "TOGETHER", sortOrder: 90 },
  { title: "Tell me we're okay", forHim: "to hear that you two are okay", mode: "ANY", sortOrder: 100 },
  { title: "Make me laugh", forHim: "a laugh", mode: "ANY", sortOrder: 110 },
  { title: "Show me what you're doing", forHim: "to see what you're up to", mode: "DISTANCE", sortOrder: 120 },
  { title: "Stay close without talking", forHim: "you close by, without talking", mode: "TOGETHER", sortOrder: 120 },
  { title: "Send me a video", forHim: "a little video from you", mode: "DISTANCE", sortOrder: 130 },
  { title: "Bring me something", forHim: "you to bring her something", mode: "TOGETHER", sortOrder: 130 },
  { title: "Watch something with me", forHim: "to watch something together", mode: "DISTANCE", sortOrder: 140 },
  { title: "Take me somewhere", forHim: "you to take her somewhere", mode: "TOGETHER", sortOrder: 140 },
  { title: "Sleep call", forHim: "to fall asleep on a call with you", mode: "DISTANCE", sortOrder: 150 },
  { title: "Choose dinner", forHim: "you to choose dinner", mode: "TOGETHER", sortOrder: 150 },
  { title: "Send me something", forHim: "something from you, anything", mode: "DISTANCE", sortOrder: 160 },
  { title: "Check on me later", forHim: "you to check on her later", mode: "ANY", sortOrder: 170 },
  { title: "Choose for me", forHim: "you to make the choices for a bit", mode: "ANY", sortOrder: 180 },
  { title: "I need my best friend", forHim: "her best friend", mode: "ANY", sortOrder: 190 },
];

export const DEFAULT_PREFERENCES: { kind: PreferenceKind; text: string }[] = [
  { kind: "DO", text: "Check on me" },
  { kind: "DO", text: "Be affectionate" },
  { kind: "DO", text: "Distract me" },
  { kind: "DO", text: "Send me pictures" },
  { kind: "DO", text: "Be patient with me" },
  { kind: "DO", text: "Be silly" },
  { kind: "DO", text: "Keep it light" },
  { kind: "DONT", text: "Problem solve" },
  { kind: "DONT", text: "Ask lots of questions" },
  { kind: "DONT", text: "Pressure me to talk" },
  { kind: "DONT", text: "Take it personally" },
  { kind: "DONT", text: "Tease me" },
];

export const MISSIONS: { text: string; mode: CardMode }[] = [
  { text: "Tell her a memory you love.", mode: "ANY" },
  { text: "Surprise her with something affectionate.", mode: "ANY" },
  { text: "Tell her one thing she did recently that made you proud of her.", mode: "ANY" },

  { text: "Send her a spontaneous selfie.", mode: "DISTANCE" },
  { text: "Record a short voice message telling her something you love about her.", mode: "DISTANCE" },
  { text: "Send her something that reminds you of her.", mode: "DISTANCE" },
  { text: "Send her a photo of whatever you're looking at and tell her you wish she were there.", mode: "DISTANCE" },
  { text: "Send her a song that makes you think of her, with one line about why.", mode: "DISTANCE" },
  { text: "Call her for no reason at all.", mode: "DISTANCE" },
  { text: "Send her a picture of the two of you and what you remember about that day.", mode: "DISTANCE" },
  { text: "Tell her about a moment today when you thought of her.", mode: "DISTANCE" },

  { text: "Bring her something small without being asked.", mode: "TOGETHER" },
  { text: "Kiss her forehead and don't explain why.", mode: "TOGETHER" },
  { text: "Make her a drink the way she likes it.", mode: "TOGETHER" },
  { text: "Leave a note somewhere she'll find it later.", mode: "TOGETHER" },
  { text: "Tell her one specific thing you love about how she looks today.", mode: "TOGETHER" },
  { text: "Put on a song she loves and pull her into a slow dance.", mode: "TOGETHER" },
  { text: "Take her hand the next time you're walking together.", mode: "TOGETHER" },
];

export function missionsFor(mode: Mode) {
  return MISSIONS.filter((m) => m.mode === "ANY" || m.mode === mode);
}

// How long an open offer stays up before it quietly lapses.
export const OFFER_HOURS = 12;
// Do/Don't items switch themselves off after this long.
export const PREFERENCE_HOURS = 24;
// How long a finished request keeps asking "did it help?".
export const AFTERCARE_DAYS = 3;
// A new mystery mission avoids repeating any of the last few.
export const MISSIONS_TO_REMEMBER = 6;
